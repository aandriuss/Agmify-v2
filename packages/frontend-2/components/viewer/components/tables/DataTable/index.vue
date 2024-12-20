<template>
  <div class="prime-local">
    <!-- Column Management -->
    <div class="flex items-center gap-2 mb-3">
      <FormButton color="outline" @click="openDialog">Manage Columns</FormButton>
      <span v-if="isSaving" class="text-sm text-gray-500">Saving changes...</span>
    </div>

    <!-- Column Manager Dialog -->
    <ColumnManager
      v-if="dialogOpen"
      :open="dialogOpen"
      :table-id="tableId"
      :table-name="tableName"
      :parent-columns="localParentColumns"
      :child-columns="localChildColumns"
      :available-parent-parameters="availableParentParameters"
      :available-child-parameters="availableChildParameters"
      :debug="true"
      @update:open="dialogOpen = $event"
      @update:columns="handleColumnsUpdate"
      @cancel="handleCancel"
      @apply="handleApplyColumns"
    />

    <!-- Main Table -->
    <TableWrapper
      v-if="isInitialized"
      :key="`${tableKey}-${data.length}-${localParentColumns.length}`"
      :data="data"
      :expanded-rows="expandedRows"
      :schedule-data="scheduleData"
      :parent-columns="localParentColumns"
      :child-columns="localChildColumns"
      :loading="loading || !isInitialized"
      :sort-field="sortField"
      :sort-order="sortOrder"
      :filters="filters"
      @update:expanded-rows="handleExpandedRowsUpdate"
      @column-resize="handleColumnResize"
      @column-reorder="handleColumnReorder"
      @sort="handleSort"
      @filter="handleFilter"
      @row-expand="handleRowExpand"
      @row-collapse="handleRowCollapse"
      @table-updated="$emit('table-updated')"
      @column-visibility-change="$emit('column-visibility-change')"
      @error="handleError"
    >
      <template #empty>
        <slot name="empty">
          <div class="p-4 text-center text-gray-500">No data available</div>
        </slot>
      </template>

      <template #loading>
        <slot name="loading">
          <div class="p-4 text-center text-gray-500">Loading data...</div>
        </slot>
      </template>

      <template #error>
        <slot name="error">
          <div class="p-4 text-center text-red-500">{{ errorMessage }}</div>
        </slot>
      </template>
    </TableWrapper>

    <!-- Loading placeholder -->
    <div v-else class="p-4 text-center text-gray-500">Initializing table...</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick } from 'vue'
import ColumnManager from './components/ColumnManager/index.vue'
import TableWrapper from './components/TableWrapper/index.vue'
import {
  safeJSONClone,
  sortColumnsByOrder,
  updateLocalColumns as updateColumns,
  validateTableRows
} from './composables/useTableUtils'
import type {
  ColumnDef,
  AvailableParameter,
  ElementData,
  TableRow,
  UserValueType,
  BimValueType
} from '~/composables/core/types'
import {
  createBimColumnDefWithDefaults,
  createUserColumnDefWithDefaults,
  isBimColumnDef,
  isUserColumnDef
} from '~/composables/core/types/tables/column-types'
import { createBaseItem } from '~/composables/core/types/common/base-types'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import type {
  DataTableColumnReorderEvent,
  DataTableFilterMeta,
  DataTableExpandedRows
} from 'primevue/datatable'
import { useTableConfigs } from '~/composables/useTableConfigs'
import { useParameterStore } from '~/composables/core/parameters/store'

interface Props {
  tableId: string
  tableName?: string
  data: (TableRow | ElementData)[]
  scheduleData: (TableRow | ElementData)[]
  columns: ColumnDef[]
  detailColumns: ColumnDef[]
  availableParentParameters: AvailableParameter[]
  availableChildParameters: AvailableParameter[]
  loading?: boolean
  initialState?: TableState
}

interface TableState {
  columns: ColumnDef[] // Parent columns
  detailColumns: ColumnDef[] // Child columns
  expandedRows: (TableRow | ElementData)[]
  sortField?: string
  sortOrder?: number
  filters?: DataTableFilterMeta
}

const props = withDefaults(defineProps<Props>(), {
  tableName: 'Default',
  loading: false
})

const emit = defineEmits<{
  'update:expandedRows': [value: (TableRow | ElementData)[]]
  'update:columns': [columns: ColumnDef[]]
  'update:detail-columns': [columns: ColumnDef[]]
  'update:both-columns': [
    updates: { parentColumns: ColumnDef[]; childColumns: ColumnDef[] }
  ]
  'column-reorder': [event: DataTableColumnReorderEvent]
  'row-expand': [row: TableRow | ElementData]
  'row-collapse': [row: TableRow | ElementData]
  'table-updated': []
  'column-visibility-change': []
  sort: [field: string, order: number]
  filter: [filters: DataTableFilterMeta]
  error: [error: Error]
}>()

// UI State
const dialogOpen = ref(false)
const isSaving = ref(false)
const errorMessage = ref('')
const isInitialized = ref(false)

const expandedRowsState = ref<(TableRow | ElementData)[]>([])

const sortField = ref<string>('')
const sortOrder = ref<number>(1)
const filters = ref<DataTableFilterMeta>({})

// Column State
const localParentColumns = ref<ColumnDef[]>([])
const localChildColumns = ref<ColumnDef[]>([])
const tempParentColumns = ref<ColumnDef[]>([])
const tempChildColumns = ref<ColumnDef[]>([])

// Initialize table configs
const tableConfigs = useTableConfigs()

// Computed key to force table refresh
const tableKey = computed(() => {
  return `${props.tableId}-${props.data.length}-${localParentColumns.value.length}-${localChildColumns.value.length}`
})

// Error Handler
function handleError(error: Error | unknown): void {
  const message = error instanceof Error ? error.message : String(error)
  errorMessage.value = message
  emit('error', new Error(message))
}

function isTableRowOrElementData(value: unknown): value is TableRow | ElementData {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Record<string, unknown>

  // First check if it has the base properties
  const hasBaseProperties =
    typeof candidate.id === 'string' &&
    typeof candidate.type === 'string' &&
    typeof candidate.mark === 'string' &&
    typeof candidate.category === 'string' &&
    typeof candidate.parameters === 'object' &&
    candidate.parameters !== null

  if (!hasBaseProperties) return false

  // Then check details property
  if ('details' in candidate) {
    // If details exists, it must be an array
    if (!Array.isArray(candidate.details)) return false

    // For ElementData, details is required and must be an array
    // For TableRow, details is optional but must be an array if present
    return true
  }

  // If no details property, it's still a valid TableRow
  return true
}

// Update handleExpandedRowsUpdate to properly handle both types
function handleExpandedRowsUpdate(value: DataTableExpandedRows | unknown[]): void {
  if (Array.isArray(value)) {
    const validRows = value.filter(isTableRowOrElementData)

    debug.log(DebugCategories.DATA_TRANSFORM, 'Expanded rows updated', {
      inputRows: value.length,
      validRows: validRows.length,
      rows: validRows.map((row) => ({
        id: row.id,
        mark: row.mark,
        type: row.type,
        hasDetails: 'details' in row && Array.isArray(row.details)
      }))
    })
    expandedRowsState.value = validRows
    emit('update:expandedRows', validRows)
  }
}

// Update expandedRows computed with proper validation
const expandedRows = computed<(TableRow | ElementData)[]>({
  get: () => expandedRowsState.value,
  set: (value) => {
    if (Array.isArray(value)) {
      const validRows = value.filter(isTableRowOrElementData)

      debug.log(DebugCategories.DATA_TRANSFORM, 'Setting expanded rows', {
        inputRows: value.length,
        validRows: validRows.length,
        rows: validRows.map((row) => ({
          id: row.id,
          mark: row.mark,
          type: row.type,
          hasDetails: 'details' in row && Array.isArray(row.details)
        }))
      })
      expandedRowsState.value = validRows
      emit('update:expandedRows', validRows)
    }
  }
})

function handleRowExpand(row: TableRow | ElementData): void {
  debug.log(DebugCategories.DATA_TRANSFORM, 'Row expanded', {
    id: row.id,
    type: row.type,
    hasDetails: 'details' in row && Array.isArray(row.details)
  })
  emit('row-expand', row)
}

function handleRowCollapse(row: TableRow | ElementData): void {
  debug.log(DebugCategories.DATA_TRANSFORM, 'Row collapsed', {
    id: row.id,
    type: row.type,
    hasDetails: 'details' in row && Array.isArray(row.details)
  })
  emit('row-collapse', row)
}

// Helper function to ensure column properties
function ensureColumnProperties(column: ColumnDef): ColumnDef {
  // Create base item first with type safety
  const base = createBaseItem({
    field: String(column.field || ''),
    id: String(column.id || crypto.randomUUID()),
    name: String(column.name || column.field || ''),
    header: String(column.header || column.name || column.field || ''),
    visible: column.visible ?? true,
    removable: column.removable ?? true,
    order: column.order,
    metadata: column.metadata,
    description: column.description,
    category: column.category
  })

  // First check if it's already a properly typed column
  if (isBimColumnDef(column)) {
    return createBimColumnDefWithDefaults({
      ...base,
      type: column.type as BimValueType,
      sourceValue: column.sourceValue ?? null,
      fetchedGroup: column.fetchedGroup || 'Default',
      currentGroup: column.currentGroup || column.fetchedGroup || 'Default',
      source: column.source,
      width: column.width,
      sortable: column.sortable,
      filterable: column.filterable,
      headerComponent: column.headerComponent,
      color: column.color,
      expander: column.expander
    })
  }

  if (isUserColumnDef(column)) {
    return createUserColumnDefWithDefaults({
      ...base,
      type: column.type as UserValueType,
      group: column.group || 'Default',
      isCustomParameter: column.isCustomParameter,
      parameterRef: column.parameterRef,
      width: column.width,
      sortable: column.sortable,
      filterable: column.filterable,
      headerComponent: column.headerComponent,
      color: column.color,
      expander: column.expander
    })
  }

  // If it's not a typed column, create a default user column
  return createUserColumnDefWithDefaults({
    ...base,
    type: 'fixed' as UserValueType,
    group: 'Default'
  })
}

// Update initialization to properly type expanded rows
async function initializeState(): Promise<void> {
  try {
    if (props.initialState) {
      // Initialize parent columns with proper defaults
      const initialParentColumns = props.initialState.columns.map((col) =>
        ensureColumnProperties(col)
      )
      localParentColumns.value = safeJSONClone(sortColumnsByOrder(initialParentColumns))

      // Initialize child columns with proper defaults
      const initialChildColumns = (props.initialState.detailColumns || []).map((col) =>
        ensureColumnProperties(col)
      )
      localChildColumns.value = safeJSONClone(sortColumnsByOrder(initialChildColumns))

      // Set initial expanded rows with proper validation
      const validRows = validateTableRows(props.initialState.expandedRows).filter(
        isTableRowOrElementData
      )
      expandedRowsState.value = validRows
      debug.log(DebugCategories.INITIALIZATION, 'Initial expanded rows set', {
        count: validRows.length,
        rows: validRows.map((row) => ({
          id: row.id,
          hasDetails: 'details' in row && Array.isArray(row.details)
        }))
      })

      sortField.value = props.initialState.sortField || ''
      sortOrder.value = props.initialState.sortOrder || 1
      filters.value = props.initialState.filters || {}
    } else {
      // Initialize from props with proper defaults
      updateColumns(
        props.columns.map((col) => ensureColumnProperties(col)),
        (cols) => (localParentColumns.value = cols)
      )
      updateColumns(
        props.detailColumns.map((col) => ensureColumnProperties(col)),
        (cols) => (localChildColumns.value = cols)
      )
    }

    // Initialize table configs
    await tableConfigs.initialize()

    debug.log(DebugCategories.INITIALIZATION, 'State initialized', {
      parentColumns: localParentColumns.value.length,
      childColumns: localChildColumns.value.length,
      dataLength: props.data.length,
      expandedRows: expandedRowsState.value.length,
      groups: [
        ...new Set([
          ...localParentColumns.value.map((c) => c.category),
          ...localChildColumns.value.map((c) => c.category)
        ])
      ]
    })

    // Wait for next tick to ensure data is ready
    await nextTick()
    isInitialized.value = true
  } catch (error) {
    handleError(error)
  }
}

// Event Handlers
function openDialog(): void {
  try {
    tempParentColumns.value = safeJSONClone(localParentColumns.value)
    tempChildColumns.value = safeJSONClone(localChildColumns.value)
    dialogOpen.value = true
  } catch (error) {
    handleError(error)
  }
}

function handleColumnsUpdate(updates: {
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
}): void {
  tempParentColumns.value = safeJSONClone(
    updates.parentColumns.map((col) => ensureColumnProperties(col))
  )
  tempChildColumns.value = safeJSONClone(
    updates.childColumns.map((col) => ensureColumnProperties(col))
  )
}

async function handleApplyColumns(): Promise<void> {
  try {
    isSaving.value = true

    // Update local state
    localParentColumns.value = safeJSONClone(tempParentColumns.value)
    localChildColumns.value = safeJSONClone(tempChildColumns.value)

    // Convert columns to selected parameters
    const parameterStore = useParameterStore()

    // Update parent parameters
    const parentSelectedParameters = localParentColumns.value.map((column) => ({
      id: column.id,
      name: column.name,
      kind: column.isCustomParameter ? ('user' as const) : ('bim' as const),
      type: column.type,
      value: column.sourceValue ?? null,
      group: column.currentGroup || column.fetchedGroup || 'Default',
      visible: column.visible,
      order: column.order ?? 0,
      category: column.category,
      description: column.description
    }))
    parameterStore.updateSelectedParameters(parentSelectedParameters, true)

    // Update child parameters
    const childSelectedParameters = localChildColumns.value.map((column) => ({
      id: column.id,
      name: column.name,
      kind: column.isCustomParameter ? ('user' as const) : ('bim' as const),
      type: column.type,
      value: column.sourceValue ?? null,
      group: column.currentGroup || column.fetchedGroup || 'Default',
      visible: column.visible,
      order: column.order ?? 0,
      category: column.category,
      description: column.description
    }))
    parameterStore.updateSelectedParameters(childSelectedParameters, false)

    // Update table configs
    if (props.tableId) {
      await tableConfigs.updateTableColumns(
        props.tableId,
        localParentColumns.value,
        localChildColumns.value
      )
    }

    // Emit updates
    emit('update:both-columns', {
      parentColumns: localParentColumns.value,
      childColumns: localChildColumns.value
    })

    dialogOpen.value = false
  } catch (error) {
    handleError(error)
  } finally {
    isSaving.value = false
  }
}

function handleCancel(): void {
  tempParentColumns.value = safeJSONClone(localParentColumns.value)
  tempChildColumns.value = safeJSONClone(localChildColumns.value)
  dialogOpen.value = false
}

function handleColumnResize(event: { element: HTMLElement }): void {
  try {
    const field = event.element.dataset.field
    const width = event.element.offsetWidth

    const updateColumnWidth = (columns: ColumnDef[]) => {
      const column = columns.find((col) => col.field === field)
      if (column) {
        column.width = width
      }
    }

    updateColumnWidth(localParentColumns.value)
    updateColumnWidth(localChildColumns.value)

    emit('update:both-columns', {
      parentColumns: localParentColumns.value,
      childColumns: localChildColumns.value
    })
  } catch (error) {
    handleError(error)
  }
}

// Type guard for HTMLElement
function isHTMLElement(value: unknown): value is HTMLElement {
  return value instanceof HTMLElement
}

function handleColumnReorder(event: DataTableColumnReorderEvent): void {
  try {
    isSaving.value = true

    // Find the datatable element from the event
    const target = event.originalEvent?.target as HTMLElement | undefined
    if (!target) {
      throw new Error('Invalid reorder event target')
    }

    const dataTable = target.closest('.p-datatable')
    if (!dataTable || !isHTMLElement(dataTable)) {
      throw new Error('Could not find parent datatable')
    }

    const isNestedTable = dataTable.classList.contains('nested-table')
    const columns = isNestedTable ? localChildColumns : localParentColumns

    // Use dragIndex and dropIndex from the event to reorder columns
    const reorderedColumns = [...columns.value]
    const [movedColumn] = reorderedColumns.splice(event.dragIndex, 1)
    reorderedColumns.splice(event.dropIndex, 0, movedColumn)

    // Update order property
    const updatedColumns = reorderedColumns.map((col, index) => ({
      ...col,
      order: index
    }))

    if (isNestedTable) {
      localChildColumns.value = updatedColumns
      emit('update:detail-columns', updatedColumns)
    } else {
      localParentColumns.value = updatedColumns
      emit('update:columns', updatedColumns)
    }

    emit('column-reorder', event)
  } catch (error) {
    handleError(error)
  } finally {
    isSaving.value = false
  }
}

// Sort and Filter Handlers
function handleSort(field: string | ((item: unknown) => string), order: number): void {
  // Convert function field to string representation
  const fieldStr = typeof field === 'function' ? field.toString() : field
  sortField.value = fieldStr
  sortOrder.value = order
  emit('sort', fieldStr, order)
}

function handleFilter(filters: Record<string, unknown>): void {
  // Convert filters to DataTableFilterMeta
  const convertedFilters: DataTableFilterMeta = {}
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== null && typeof value === 'object') {
      convertedFilters[key] = {
        value,
        matchMode: 'contains'
      }
    } else if (typeof value === 'string') {
      convertedFilters[key] = {
        value,
        matchMode: 'contains'
      }
    }
  })
  emit('filter', convertedFilters)
}

// Watch for data changes
watch(
  () => props.data,
  async (newData) => {
    debug.log(DebugCategories.DATA, 'Data updated', {
      length: newData.length,
      sample: newData[0],
      isInitialized: isInitialized.value
    })

    // If we have data but aren't initialized, initialize now
    if (newData.length > 0 && !isInitialized.value) {
      await initializeState()
    }
  },
  { deep: true, immediate: true }
)

// Initialization
onMounted(async () => {
  try {
    // Only initialize if we don't already have data
    // (the watcher will handle initialization if data arrives later)
    if (props.data.length === 0) {
      await initializeState()
    }
  } catch (error) {
    handleError(error)
  }
})
</script>

<style scoped>
.prime-local {
  --primary-color: #3b82f6;
  --surface-ground: #f8f9fa;
  --surface-section: #fff;
  --surface-card: #fff;
  --surface-border: #dfe7ef;
  --text-color: #495057;
  --text-color-secondary: #6c757d;
}
</style>
