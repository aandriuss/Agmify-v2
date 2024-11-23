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
      @apply="handleApply"
    />

    <!-- Main Table -->
    <TableWrapper
      v-if="isInitialized"
      :key="`${tableKey}-${data.length}-${localParentColumns.length}`"
      v-model="expandedRows"
      :data="data"
      :schedule-data="scheduleData"
      :parent-columns="localParentColumns"
      :child-columns="localChildColumns"
      :loading="loading || !isInitialized"
      :sort-field="sortField"
      :sort-order="sortOrder"
      :filters="filters"
      @column-resize="handleColumnResize"
      @column-reorder="handleColumnReorder"
      @sort="handleSort"
      @filter="handleFilter"
      @row-expand="handleRowExpand"
      @row-collapse="handleRowCollapse"
      @error="handleError"
    >
      <template #empty>
        <div class="p-4 text-center text-gray-500">
          {{ loading || !isInitialized ? 'Loading data...' : 'No data available' }}
        </div>
      </template>

      <template #loading>
        <div class="p-4 text-center text-gray-500">Loading data...</div>
      </template>

      <template #error>
        <div class="p-4 text-center text-red-500">{{ errorMessage }}</div>
      </template>
    </TableWrapper>

    <!-- Loading placeholder -->
    <div v-else class="p-4 text-center text-gray-500">Initializing table...</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick } from 'vue'
import { FormButton } from '@speckle/ui-components'
import { useUserSettings } from '~/composables/useUserSettings'
import ColumnManager from './components/ColumnManager/index.vue'
import TableWrapper from './components/TableWrapper/index.vue'
import {
  safeJSONClone,
  sortColumnsByOrder,
  updateLocalColumns as updateColumns,
  validateTableRows
} from './composables/useTableUtils'
import type { ColumnDef } from './composables/columns/types'
import type { CustomParameter } from '~/composables/useUserSettings'
import type { TableRow, ElementData } from '~/components/viewer/schedules/types'
import { debug, DebugCategories } from '~/components/viewer/schedules/debug/useDebug'
import type {
  DataTableColumnReorderEvent,
  DataTableFilterMeta
} from 'primevue/datatable'

interface Props {
  tableId: string
  tableName?: string
  data: (TableRow | ElementData)[]
  scheduleData: (TableRow | ElementData)[]
  columns: ColumnDef[]
  detailColumns: ColumnDef[]
  availableParentParameters: CustomParameter[]
  availableChildParameters: CustomParameter[]
  loading?: boolean
  initialState?: TableState
}

interface TableState {
  columns: ColumnDef[]
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
  sort: [field: string, order: number]
  filter: [filters: DataTableFilterMeta]
  error: [error: Error]
}>()

// State Management
const { settings, saveSettings } = useUserSettings()

// UI State
const dialogOpen = ref(false)
const isSaving = ref(false)
const errorMessage = ref('')
const isInitialized = ref(false)

// Table State
const expandedRows = ref<(TableRow | ElementData)[]>([])
const sortField = ref<string>('')
const sortOrder = ref<number>(1)
const filters = ref<DataTableFilterMeta>({})

// Column State
const localParentColumns = ref<ColumnDef[]>([])
const localChildColumns = ref<ColumnDef[]>([])
const tempParentColumns = ref<ColumnDef[]>([])
const tempChildColumns = ref<ColumnDef[]>([])

// Computed key to force table refresh
const tableKey = computed(() => {
  return `${props.tableId}-${props.data.length}-${localParentColumns.value.length}-${localChildColumns.value.length}`
})

// Error Handler
function handleError(error: Error | unknown): void {
  const err = error instanceof Error ? error : new Error(String(error))
  errorMessage.value = err.message
  emit('error', err)
}

// Helper function to ensure column properties
function ensureColumnProperties(column: ColumnDef): ColumnDef {
  return {
    ...column,
    visible: column.visible ?? true,
    removable: column.removable ?? true,
    type: column.type || 'string',
    category: column.category || 'Parameters',
    description:
      column.description || `${column.category || 'Parameters'} > ${column.field}`
  }
}

// State Management Functions
async function initializeState(): Promise<void> {
  try {
    if (props.initialState) {
      // Initialize with proper defaults for each column
      const initialColumns = props.initialState.columns.map((col) =>
        ensureColumnProperties(col)
      )
      localParentColumns.value = safeJSONClone(sortColumnsByOrder(initialColumns))

      // Transform expanded rows
      expandedRows.value = validateTableRows(props.initialState.expandedRows)

      sortField.value = props.initialState.sortField || ''
      sortOrder.value = props.initialState.sortOrder || 1
      filters.value = props.initialState.filters || {}
    } else {
      // Initialize from props with proper defaults
      updateColumns(
        props.columns.map((col) => ensureColumnProperties(col)),
        (cols) => (localParentColumns.value = cols)
      )
      localChildColumns.value = safeJSONClone(
        props.detailColumns.map((col) => ensureColumnProperties(col))
      )
    }

    debug.log(DebugCategories.INITIALIZATION, 'State initialized', {
      parentColumns: localParentColumns.value.length,
      childColumns: localChildColumns.value.length,
      dataLength: props.data.length,
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

async function handleApply(): Promise<void> {
  try {
    isSaving.value = true
    const currentSettings = settings.value || { namedTables: {} }
    const existingTable = currentSettings.namedTables[props.tableId]

    // Prepare the updated columns with proper order and defaults
    const updatedParentColumns = tempParentColumns.value.map((col, index) => ({
      ...ensureColumnProperties(col),
      order: index
    }))

    const updatedChildColumns = tempChildColumns.value.map((col, index) => ({
      ...ensureColumnProperties(col),
      order: index
    }))

    // Create updated settings preserving all existing data
    const updatedSettings = {
      ...currentSettings,
      namedTables: {
        ...currentSettings.namedTables,
        [props.tableId]: {
          ...(existingTable || {}),
          id: props.tableId,
          name: existingTable?.name || props.tableName,
          parentColumns: updatedParentColumns,
          childColumns: updatedChildColumns,
          categoryFilters: existingTable?.categoryFilters || {
            selectedParentCategories: [],
            selectedChildCategories: []
          },
          lastUpdateTimestamp: Date.now()
        }
      }
    }

    // Save all settings at once
    const success = await saveSettings(updatedSettings)
    if (!success) {
      throw new Error('Failed to save settings')
    }

    // Update local state after successful save
    localParentColumns.value = safeJSONClone(updatedParentColumns)
    localChildColumns.value = safeJSONClone(updatedChildColumns)

    debug.log(DebugCategories.COLUMNS, 'Columns updated', {
      parentColumns: updatedParentColumns.length,
      childColumns: updatedChildColumns.length,
      groups: [
        ...new Set([
          ...updatedParentColumns.map((c) => c.category),
          ...updatedChildColumns.map((c) => c.category)
        ])
      ],
      visibleParent: updatedParentColumns.filter((c) => c.visible).length,
      visibleChild: updatedChildColumns.filter((c) => c.visible).length
    })

    // Emit updates
    emit('update:both-columns', {
      parentColumns: localParentColumns.value,
      childColumns: localChildColumns.value
    })

    dialogOpen.value = false
  } catch (error) {
    handleError(error)
    // Revert temp columns on error
    tempParentColumns.value = safeJSONClone(localParentColumns.value)
    tempChildColumns.value = safeJSONClone(localChildColumns.value)
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

async function handleColumnReorder(event: DataTableColumnReorderEvent): Promise<void> {
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

    // Save changes using the same method as handleApply
    const currentSettings = settings.value || { namedTables: {} }
    const existingTable = currentSettings.namedTables[props.tableId]

    const updatedSettings = {
      ...currentSettings,
      namedTables: {
        ...currentSettings.namedTables,
        [props.tableId]: {
          ...(existingTable || {}),
          id: props.tableId,
          name: existingTable?.name || props.tableName,
          parentColumns: localParentColumns.value,
          childColumns: localChildColumns.value,
          categoryFilters: existingTable?.categoryFilters || {
            selectedParentCategories: [],
            selectedChildCategories: []
          },
          lastUpdateTimestamp: Date.now()
        }
      }
    }

    const success = await saveSettings(updatedSettings)
    if (!success) {
      throw new Error('Failed to save column reorder')
    }

    emit('column-reorder', event)
  } catch (error) {
    handleError(error)
  } finally {
    isSaving.value = false
  }
}

// Row Management Functions
function handleRowExpand(row: unknown): void {
  if (!row || typeof row !== 'object') {
    handleError(new Error('Invalid row data'))
    return
  }

  const rows = expandedRows.value
  if (!rows.includes(row as TableRow | ElementData)) {
    rows.push(row as TableRow | ElementData)
    emit('update:expandedRows', rows)
  }
}

function handleRowCollapse(row: unknown): void {
  if (!row || typeof row !== 'object') {
    handleError(new Error('Invalid row data'))
    return
  }

  const rows = expandedRows.value
  const index = rows.indexOf(row as TableRow | ElementData)
  if (index > -1) {
    rows.splice(index, 1)
    emit('update:expandedRows', rows)
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
