<template>
  <div class="schedule-table">
    <div class="flex gap-6">
      <!-- Main Table -->
      <div class="flex-1">
        <BaseDataTable
          :table-id="tableId"
          :table-name="tableName"
          :data="tableData"
          :columns="columns"
          :detail-columns="detailColumns"
          :loading="loading"
          :error="currentTableError"
          :initial-state="tableState"
          @expanded-rows-change="onExpandedRowsChange"
          @columns-change="onColumnsChange"
          @detail-columns-change="onDetailColumnsChange"
          @both-columns-change="onBothColumnsChange"
          @column-reorder="onColumnReorder"
          @row-expand="onRowExpand"
          @row-collapse="onRowCollapse"
          @table-updated="onTableUpdated"
          @column-visibility-change="onColumnVisibilityChange"
          @sort="onSort"
          @filter="onFilter"
          @error="onError"
          @retry="onRetry"
        >
          <template #empty>
            <div class="p-4 text-center text-gray-500">
              <div class="flex flex-col items-center gap-2">
                <span>No schedule data available.</span>
                <span class="text-sm">
                  Try selecting different categories or adjusting your filters.
                </span>
              </div>
            </div>
          </template>

          <template #loading>
            <div class="p-4 text-center text-gray-500">
              <div class="flex flex-col items-center gap-2">
                <span>Loading schedule data...</span>
                <span class="text-sm">
                  This might take a moment for large schedules.
                </span>
              </div>
            </div>
          </template>

          <template #error>
            <div class="p-4 text-center text-red-500">
              <div class="flex flex-col items-center gap-2">
                <span>
                  {{ currentTableError?.message || 'Failed to load schedule data' }}
                </span>
                <button
                  class="text-sm text-primary hover:text-primary-focus"
                  @click="onRetry"
                >
                  Retry Loading Schedule
                </button>
              </div>
            </div>
          </template>
        </BaseDataTable>
      </div>

      <!-- Parameter Manager -->
      <div class="w-80">
        <ScheduleParameterManager
          :parameter-groups="parameterGroups"
          :available-categories="availableCategories"
          :selected-categories="selectedCategories"
          :can-create-parameters="true"
          :selected-parameters="selectedParameters"
          :is-loading="loading"
          @update:selected-categories="handleCategoryUpdate"
          @parameter-click="handleParameterClick"
          @create-parameter="$emit('create-parameter', { timestamp: Date.now() })"
          @edit-parameters="$emit('edit-parameters', { timestamp: Date.now() })"
          @error="onError"
          @retry="onRetry"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import BaseDataTable from '~/components/core/tables/BaseDataTable.vue'
import ScheduleParameterManager from './components/ScheduleParameterManager.vue'
import { useScheduleTable } from '~/composables/viewer/schedules/useScheduleTable'
import type { TableColumn } from '~/composables/core/types/tables/table-column'
import type {
  ColumnVisibilityPayload,
  ColumnReorderPayload,
  BaseTableRow
} from '~/composables/core/types'
import type { TableState } from '~/composables/core/tables/'
import type { DataTableFilterMeta } from 'primevue/datatable'

// Props
export interface ScheduleTableProps {
  tableId: string
  tableName?: string
  data: BaseTableRow[]
  columns: TableColumn[]
  detailColumns?: TableColumn[]
  loading?: boolean
  error?: Error | null
  initialState?: {
    columns: TableColumn[]
    detailColumns: TableColumn[]
    expandedRows: BaseTableRow[]
    sortField?: string
    sortOrder?: number
    filters?: DataTableFilterMeta
  }
}

const props = withDefaults(defineProps<ScheduleTableProps>(), {
  tableName: 'Schedule',
  loading: false,
  columns: () => [],
  detailColumns: () => [],
  initialState: () => ({
    columns: [],
    detailColumns: [],
    expandedRows: []
  })
})

interface SortEvent {
  field: string | ((item: unknown) => string)
  order: 1 | -1
}

// Emits
type EmitEvents = {
  'update:expanded-rows': [{ rows: BaseTableRow[] }]
  'update:columns': [{ columns: TableColumn[] }]
  'update:detail-columns': [{ columns: TableColumn[] }]
  'update:both-columns': [{ parentColumns: TableColumn[]; childColumns: TableColumn[] }]
  'column-reorder': [ColumnReorderPayload]
  'column-visibility-change': [ColumnVisibilityPayload]
  'row-expand': [{ row: BaseTableRow }]
  'row-collapse': [{ row: BaseTableRow }]
  'table-updated': [{ timestamp: number }]
  error: [{ error: Error }]
  retry: [{ timestamp: number }]
  sort: [{ field: string; order: number }]
  filter: [{ filters: DataTableFilterMeta }]
  'update:selected-categories': [{ categories: string[] }]
  'parameter-click': [{ parameter: BaseTableRow }]
  'create-parameter': [{ timestamp: number }]
  'edit-parameters': [{ timestamp: number }]
}

const emit = defineEmits<EmitEvents>()

// State
const tableErrorState = ref<Error | null>(null)
const currentTableError = computed(() => tableErrorState.value)
const selectedParameters = ref<BaseTableRow[]>([])

// Use data directly since we've removed schedule-specific types
const tableData = computed(() => props.data)

// Computed table state
const tableState = computed<TableState>(() => ({
  columns: props.columns,
  detailColumns: props.detailColumns,
  expandedRows: props.initialState?.expandedRows || [],
  sortField: props.initialState?.sortField,
  sortOrder: props.initialState?.sortOrder,
  filters: props.initialState?.filters
}))

// Initialize schedule table
const {
  expandRow,
  collapseRow,
  reset,
  selectedCategories,
  availableCategories,
  parameterGroups,
  updateCategories
} = useScheduleTable({
  tableId: props.tableId,
  initialParentColumns: props.columns,
  initialChildColumns: props.detailColumns,
  onError: (err: Error) => {
    tableErrorState.value = err
    emit('error', { error: err })
  }
})

// Event Handlers
const onExpandedRowsChange = (rows: BaseTableRow[]) => {
  emit('update:expanded-rows', { rows })
}

const onColumnsChange = (columns: TableColumn[]) => {
  emit('update:columns', { columns })
}

const onDetailColumnsChange = (columns: TableColumn[]) => {
  emit('update:detail-columns', { columns })
}

const onBothColumnsChange = (payload: {
  parentColumns: TableColumn[]
  childColumns: TableColumn[]
}) => {
  emit('update:both-columns', payload)
}

const onColumnReorder = (payload: ColumnReorderPayload) => {
  emit('column-reorder', payload)
}

const onColumnVisibilityChange = (payload: ColumnVisibilityPayload) => {
  emit('column-visibility-change', payload)
}

const onRowExpand = async (row: BaseTableRow) => {
  try {
    await expandRow(row)
    emit('row-expand', { row })
  } catch (err) {
    const errorValue = err instanceof Error ? err : new Error('Failed to expand row')
    tableErrorState.value = errorValue
    emit('error', { error: errorValue })
  }
}

const onRowCollapse = async (row: BaseTableRow) => {
  try {
    await collapseRow(row)
    emit('row-collapse', { row })
  } catch (err) {
    const errorValue = err instanceof Error ? err : new Error('Failed to collapse row')
    tableErrorState.value = errorValue
    emit('error', { error: errorValue })
  }
}

const onTableUpdated = () => {
  emit('table-updated', { timestamp: Date.now() })
}

const onSort = (event: SortEvent) => {
  const field = typeof event.field === 'function' ? event.field.toString() : event.field
  emit('sort', { field: String(field), order: event.order })
}

const onFilter = (filters: DataTableFilterMeta) => {
  emit('filter', { filters })
}

const onError = (err: Error) => {
  if (err instanceof Error) {
    tableErrorState.value = err
    emit('error', { error: err })
  }
}

const onRetry = async () => {
  try {
    tableErrorState.value = null
    await reset()
    emit('retry', { timestamp: Date.now() })
  } catch (err) {
    const errorValue =
      err instanceof Error ? err : new Error('Failed to retry operation')
    tableErrorState.value = errorValue
    emit('error', { error: errorValue })
  }
}

function handleCategoryUpdate(categories: string[]): void {
  try {
    updateCategories(categories)
    emit('update:selected-categories', { categories })
  } catch (err) {
    const errorValue =
      err instanceof Error ? err : new Error('Failed to update categories')
    tableErrorState.value = errorValue
    emit('error', { error: errorValue })
  }
}

function handleParameterClick(parameter: BaseTableRow): void {
  try {
    expandRow(parameter)
    emit('parameter-click', { parameter })
  } catch (err) {
    const errorValue =
      err instanceof Error ? err : new Error('Failed to handle parameter click')
    tableErrorState.value = errorValue
    emit('error', { error: errorValue })
  }
}
</script>

<style scoped>
.schedule-table {
  width: 100%;
  height: 100%;
}
</style>
