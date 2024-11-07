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
      :parent-columns="localParentColumns"
      :child-columns="localChildColumns"
      :available-parent-parameters="availableParentParameters"
      :available-child-parameters="availableChildParameters"
      :debug="true"
      @update:open="dialogOpen = $event"
      @update:columns="handleColumnsUpdate"
      @cancel="handleCancel"
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
import ColumnManager from './components/ColumnManager/index.vue'
import TableWrapper from './components/TableWrapper/index.vue'
import type { ColumnDef } from './composables/columns/types'
import type {
  ParameterDefinition,
  TableState,
  ColumnUpdateEvent,
  ColumnResizeEvent,
  ColumnReorderEvent
} from './composables/types'

// Props and Emits definitions
interface Props {
  tableId: string
  data: any[]
  columns: ColumnDef[]
  detailColumns: ColumnDef[]
  availableParentParameters: ParameterDefinition[]
  availableChildParameters: ParameterDefinition[]
  loading?: boolean
  initialState?: TableState
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:expandedRows': [value: any[]]
  'update:columns': [columns: ColumnDef[]]
  'update:detail-columns': [columns: ColumnDef[]]
  'update:both-columns': [
    updates: { parentColumns: ColumnDef[]; childColumns: ColumnDef[] }
  ]
  'column-reorder': [event: ColumnReorderEvent]
  sort: [field: string, order: number]
  filter: [filters: Record<string, any>]
  error: [error: Error]
}>()

// State Management
const { settings, loading, saveSettings, updateNamedTable } = useUserSettings(
  props.tableId
)

// UI State
const dialogOpen = ref(false)
const isSaving = ref(false)
const errorMessage = ref('')

// Table State
const expandedRows = ref<any[]>([])
const sortField = ref<string>('')
const sortOrder = ref<number>(1)
const filters = ref<Record<string, any>>({})

// Column State
const localParentColumns = ref<ColumnDef[]>([])
const localChildColumns = ref<ColumnDef[]>([])
const tempParentColumns = ref<ColumnDef[]>([])
const tempChildColumns = ref<ColumnDef[]>([])

// Watchers
watch(
  () => settings.value?.namedTables?.[props.tableId],
  (newTableSettings) => {
    if (newTableSettings) {
      localParentColumns.value = newTableSettings.parentColumns || []
      localChildColumns.value = newTableSettings.childColumns || []
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
function validateData(data: any[]) {
  if (!Array.isArray(data)) {
    handleError(new Error('Invalid data format: expected array'))
  }
}

function updateLocalColumns(newColumns: ColumnDef[]) {
  localParentColumns.value = JSON.parse(JSON.stringify(newColumns))
}

function checkExistingSettings() {
  return !!settings.value?.namedTables?.[props.tableId]
}

// State Management Functions
function initializeState() {
  if (props.initialState) {
    localParentColumns.value = [...props.initialState.columns]
    expandedRows.value = [...props.initialState.expandedRows]
    sortField.value = props.initialState.sortField || ''
    sortOrder.value = props.initialState.sortOrder || 1
    filters.value = props.initialState.filters || {}
  } else {
    updateLocalColumns(props.columns)
    localChildColumns.value = JSON.parse(JSON.stringify(props.detailColumns))
  }
}

// Event Handlers
function handleError(error: Error) {
  errorMessage.value = error.message
  emit('error', error)
  console.error('DataTable error:', error)
}

function openDialog() {
  try {
    tempParentColumns.value = JSON.parse(JSON.stringify(localParentColumns.value))
    tempChildColumns.value = JSON.parse(JSON.stringify(localChildColumns.value))
    dialogOpen.value = true
  } catch (error) {
    handleError(error as Error)
  }
}

function handleColumnsUpdate(updates: ColumnUpdateEvent) {
  tempParentColumns.value = updates.parentColumns
  tempChildColumns.value = updates.childColumns
}

async function handleApply() {
  try {
    isSaving.value = true
    const settingsExist = checkExistingSettings()

    const tableConfig = {
      id: props.tableId,
      name: settingsExist ? settings.value.namedTables[props.tableId].name : 'Default',
      parentColumns: localParentColumns.value,
      childColumns: localChildColumns.value,
      categoryFilters: settingsExist
        ? settings.value.namedTables[props.tableId].categoryFilters
        : {
            selectedParentCategories: [],
            selectedChildCategories: []
          }
    }

    if (settingsExist) {
      await updateNamedTable(props.tableId, tableConfig)
    } else {
      await saveSettings({
        ...settings.value,
        namedTables: {
          ...(settings.value?.namedTables || {}),
          [props.tableId]: tableConfig
        }
      })
    }

    emit('update:both-columns', {
      parentColumns: localParentColumns.value,
      childColumns: localChildColumns.value
    })
  } catch (error) {
    handleError(error as Error)
  } finally {
    isSaving.value = false
  }
}

function handleCancel() {
  tempParentColumns.value = JSON.parse(JSON.stringify(localParentColumns.value))
  tempChildColumns.value = JSON.parse(JSON.stringify(localChildColumns.value))
  dialogOpen.value = false
}

function handleColumnResize(event: ColumnResizeEvent) {
  try {
    const { element, delta } = event
    const field = element.dataset.field

    const updateColumnWidth = (columns: ColumnDef[]) => {
      const column = columns.find((col) => col.field === field)
      if (column) {
        column.width = element.offsetWidth
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

async function handleColumnReorder(event: ColumnReorderEvent) {
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
      .filter(Boolean) as ColumnDef[]

    if (isNestedTable) {
      localChildColumns.value = reorderedColumns
      emit('update:detail-columns', reorderedColumns)
    } else {
      localParentColumns.value = reorderedColumns
      emit('update:columns', reorderedColumns)
    }

    emit('column-reorder', event)
  } catch (error) {
    handleError(error as Error)
  } finally {
    isSaving.value = false
  }
}

// Row Management Functions
function handleRowExpand(row: any) {
  if (!expandedRows.value.includes(row)) {
    expandedRows.value.push(row)
  }
}

function handleRowCollapse(row: any) {
  const index = expandedRows.value.indexOf(row)
  if (index > -1) {
    expandedRows.value.splice(index, 1)
  }
}

// Sort and Filter Handlers
function handleSort(field: string, order: number) {
  sortField.value = field
  sortOrder.value = order
  emit('sort', field, order)
}

function handleFilter(newFilters: Record<string, any>) {
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
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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
