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
      v-model="expandedRows"
      :data="data"
      :parent-columns="localParentColumns"
      :child-columns="localChildColumns"
      :loading="loading"
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
        <div class="p-4 text-center text-gray-500">No data available</div>
      </template>

      <template #loading>
        <div class="p-4 text-center text-gray-500">Loading data...</div>
      </template>

      <template #error>
        <div class="p-4 text-center text-red-500">{{ errorMessage }}</div>
      </template>
    </TableWrapper>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { FormButton } from '@speckle/ui-components'
import { useUserSettings } from '~/composables/useUserSettings'
import ColumnManager from './components/ColumnManager/index.vue'
import TableWrapper from './components/TableWrapper/index.vue'
import type { ColumnDef } from './composables/columns/types'
import type {
  ParameterDefinition,
  TableState,
  ColumnUpdateEvent
} from './composables/types'

// Props and Emits definitions
interface Props {
  tableId: string
  tableName?: string
  data: Record<string, unknown>[]
  columns: ColumnDef[]
  detailColumns: ColumnDef[]
  availableParentParameters: ParameterDefinition[]
  availableChildParameters: ParameterDefinition[]
  loading?: boolean
  initialState?: TableState
}

const props = withDefaults(defineProps<Props>(), {
  tableName: 'Default',
  loading: false
})

const emit = defineEmits<{
  'update:expandedRows': [value: Record<string, unknown>[]]
  'update:columns': [columns: ColumnDef[]]
  'update:detail-columns': [columns: ColumnDef[]]
  'update:both-columns': [
    updates: { parentColumns: ColumnDef[]; childColumns: ColumnDef[] }
  ]
  'column-reorder': [event: { target: HTMLElement | null }]
  sort: [field: string, order: number]
  filter: [filters: Record<string, unknown>]
  error: [error: Error]
}>()

// State Management
const { settings, saveSettings } = useUserSettings()

// UI State
const dialogOpen = ref(false)
const isSaving = ref(false)
const errorMessage = ref('')

// Table State
const expandedRows = ref<Record<string, unknown>[]>([])
const sortField = ref<string>('')
const sortOrder = ref<number>(1)
const filters = ref<Record<string, unknown>>({})

// Column State
const localParentColumns = ref<ColumnDef[]>([])
const localChildColumns = ref<ColumnDef[]>([])
const tempParentColumns = ref<ColumnDef[]>([])
const tempChildColumns = ref<ColumnDef[]>([])

// Utility Functions
function safeJSONClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T
}

// Sort columns by order
function sortColumnsByOrder<T extends { order?: number }>(columns: T[]): T[] {
  return [...columns].sort((a, b) => {
    const orderA = typeof a.order === 'number' ? a.order : 0
    const orderB = typeof b.order === 'number' ? b.order : 0
    return orderA - orderB
  })
}

// Watchers
watch(
  () => settings.value?.namedTables?.[props.tableId],
  (newTableSettings) => {
    if (newTableSettings) {
      // Sort columns by order before updating local state
      localParentColumns.value = safeJSONClone(
        sortColumnsByOrder(newTableSettings.parentColumns)
      )
      localChildColumns.value = safeJSONClone(
        sortColumnsByOrder(newTableSettings.childColumns)
      )
    }
  },
  { deep: true }
)

watch(() => props.columns, updateLocalColumns, { deep: true })
watch(() => props.data, validateData, { immediate: true })

// Initialization
onMounted(() => {
  try {
    initializeState()
  } catch (error) {
    handleError(error as Error)
  }
})

// Utility Functions
function validateData(data: Record<string, unknown>[]): void {
  if (!Array.isArray(data)) {
    handleError(new Error('Invalid data format: expected array'))
  }
}

function updateLocalColumns(newColumns: ColumnDef[]): void {
  localParentColumns.value = safeJSONClone(sortColumnsByOrder(newColumns))
}

// State Management Functions
function initializeState(): void {
  if (props.initialState) {
    localParentColumns.value = safeJSONClone(
      sortColumnsByOrder(props.initialState.columns)
    )
    expandedRows.value = props.initialState.expandedRows.map((row) =>
      typeof row === 'object' ? (row as Record<string, unknown>) : {}
    )
    sortField.value = props.initialState.sortField || ''
    sortOrder.value = props.initialState.sortOrder || 1
    filters.value = props.initialState.filters || {}
  } else {
    updateLocalColumns(props.columns)
    localChildColumns.value = safeJSONClone(props.detailColumns)
  }
}

// Event Handlers
function handleError(error: Error): void {
  errorMessage.value = error.message
  emit('error', error)
  // Error logging is important for debugging
  // eslint-disable-next-line no-console
  console.error('DataTable error:', error)
}

function openDialog(): void {
  try {
    tempParentColumns.value = safeJSONClone(localParentColumns.value)
    tempChildColumns.value = safeJSONClone(localChildColumns.value)
    dialogOpen.value = true
  } catch (error) {
    handleError(error as Error)
  }
}

function handleColumnsUpdate(updates: ColumnUpdateEvent): void {
  tempParentColumns.value = safeJSONClone(updates.parentColumns)
  tempChildColumns.value = safeJSONClone(updates.childColumns)
}

async function handleApply(): Promise<void> {
  try {
    isSaving.value = true
    const currentSettings = settings.value || { namedTables: {} }
    const existingTable = currentSettings.namedTables[props.tableId]

    // Prepare the updated columns with proper order and defaults
    const updatedParentColumns = tempParentColumns.value.map((col, index) => ({
      ...col,
      order: index,
      visible: col.visible ?? true,
      removable: col.removable ?? true,
      field: col.field,
      header: col.header,
      category: col.category,
      type: col.type || 'string'
    }))

    const updatedChildColumns = tempChildColumns.value.map((col, index) => ({
      ...col,
      order: index,
      visible: col.visible ?? true,
      removable: col.removable ?? true,
      field: col.field,
      header: col.header,
      category: col.category,
      type: col.type || 'string'
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

    // Emit updates
    emit('update:both-columns', {
      parentColumns: localParentColumns.value,
      childColumns: localChildColumns.value
    })

    dialogOpen.value = false
  } catch (error) {
    handleError(error as Error)
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
    handleError(error as Error)
  }
}

async function handleColumnReorder(event: {
  target: HTMLElement | null
}): Promise<void> {
  try {
    isSaving.value = true
    const { target } = event
    const dataTable = target?.closest('.p-datatable')
    if (!dataTable) return

    const isNestedTable = dataTable.classList.contains('nested-table')
    const headers = Array.from(dataTable.querySelectorAll('th[data-field]'))
    const columns = isNestedTable ? localChildColumns : localParentColumns

    const reorderedColumns = headers
      .map((header: Element, index: number) => {
        const field = header.getAttribute('data-field')
        const existingColumn = columns.value.find((col) => col.field === field)
        return existingColumn ? { ...existingColumn, order: index } : null
      })
      .filter((col): col is ColumnDef => col !== null)

    if (isNestedTable) {
      localChildColumns.value = reorderedColumns
      emit('update:detail-columns', reorderedColumns)
    } else {
      localParentColumns.value = reorderedColumns
      emit('update:columns', reorderedColumns)
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

    emit('column-reorder', { target })
  } catch (error) {
    handleError(error as Error)
  } finally {
    isSaving.value = false
  }
}

// Row Management Functions
function handleRowExpand(row: Record<string, unknown>): void {
  const rows = expandedRows.value
  if (!rows.includes(row)) {
    rows.push(row)
    emit('update:expandedRows', rows)
  }
}

function handleRowCollapse(row: Record<string, unknown>): void {
  const rows = expandedRows.value
  const index = rows.indexOf(row)
  if (index > -1) {
    rows.splice(index, 1)
    emit('update:expandedRows', rows)
  }
}

// Sort and Filter Handlers
function handleSort(field: string, order: number): void {
  sortField.value = field
  sortOrder.value = order
  emit('sort', field, order)
}

function handleFilter(newFilters: Record<string, unknown>): void {
  filters.value = newFilters
  emit('filter', newFilters)
}
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

.datatable-wrapper :deep(.p-datatable) {
  background-color: var(--surface-card);
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgb(0 0 0 / 10%);
}

.datatable-wrapper :deep(.p-datatable .p-datatable-header) {
  background-color: var(--surface-section);
  border-top-left-radius: 0.5rem;
  border-top-right-radius: 0.5rem;
  padding: 0.2rem;
  border-bottom: 1px solid var(--surface-border);
}

.datatable-wrapper :deep(.p-datatable .p-datatable-thead > tr > th) {
  background-color: var(--surface-section);
  color: var(--text-color);
  font-weight: 600;
  padding: 0.2rem;
  border-bottom: 1px solid var(--surface-border);
}

.datatable-wrapper :deep(.p-datatable .p-datatable-tbody > tr) {
  color: var(--text-color);
  transition: background-color 0.2s;
}

.datatable-wrapper :deep(.p-datatable .p-datatable-tbody > tr > td) {
  padding: 0.2rem;
  border-bottom: 1px solid var(--surface-border);
}

.datatable-wrapper :deep(.p-datatable .p-datatable-tbody > tr:hover) {
  background-color: #f0f7ff;
}
</style>
