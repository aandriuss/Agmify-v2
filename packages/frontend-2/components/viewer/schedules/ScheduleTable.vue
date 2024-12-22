<template>
  <div class="schedule-table">
    <div class="flex gap-6">
      <!-- Main Table -->
      <div class="flex-1">
        <BaseDataTable
          :table-id="tableId"
          :table-name="tableName"
          :data="baseTableData"
          :columns="columns"
          :detail-columns="detailColumns"
          :loading="loading"
          :error="currentTableError"
          :initial-state="baseTableState"
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
  ColumnReorderPayload
} from '~/composables/core/types'
import type { BaseTableRow } from '~/components/tables/DataTable/types'
import type { ScheduleRow } from '~/composables/core/types/schedules/schedule-types'
import {
  baseTableRowToScheduleRow,
  scheduleRowToBaseTableRow
} from '~/composables/core/types/schedules/schedule-types'
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
  'update:expanded-rows': [{ rows: ScheduleRow[] }]
  'update:columns': [{ columns: TableColumn[] }]
  'update:detail-columns': [{ columns: TableColumn[] }]
  'update:both-columns': [{ parentColumns: TableColumn[]; childColumns: TableColumn[] }]
  'column-reorder': [ColumnReorderPayload]
  'column-visibility-change': [ColumnVisibilityPayload]
  'row-expand': [{ row: ScheduleRow }]
  'row-collapse': [{ row: ScheduleRow }]
  'table-updated': [{ timestamp: number }]
  error: [{ error: Error }]
  retry: [{ timestamp: number }]
  sort: [{ field: string; order: number }]
  filter: [{ filters: DataTableFilterMeta }]
  'update:selected-categories': [{ categories: string[] }]
  'parameter-click': [{ parameter: ScheduleRow }]
  'create-parameter': [{ timestamp: number }]
  'edit-parameters': [{ timestamp: number }]
}

const emit = defineEmits<EmitEvents>()

// State
const tableErrorState = ref<Error | null>(null)
const currentTableError = computed(() => tableErrorState.value)
const selectedParameters = ref<ScheduleRow[]>([])

// Convert BaseTableRow to ScheduleRow for internal use
const scheduleData = computed(() =>
  props.data.map((row) => baseTableRowToScheduleRow(row))
)

// Convert back to BaseTableRow for BaseDataTable
const baseTableData = computed<BaseTableRow[]>(() =>
  scheduleData.value.map((row) => scheduleRowToBaseTableRow(row))
)

// Computed table state for BaseDataTable
const baseTableState = computed(() => ({
  expandedRows: props.initialState?.expandedRows || [],
  selectedRows: [] // BaseDataTable expects this shape
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
  emit('update:expanded-rows', {
    rows: rows.map((row) => baseTableRowToScheduleRow(row))
  })
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
    const scheduleRow = baseTableRowToScheduleRow(row)
    await expandRow(scheduleRow)
    emit('row-expand', { row: scheduleRow })
  } catch (err) {
    const errorValue = err instanceof Error ? err : new Error('Failed to expand row')
    tableErrorState.value = errorValue
    emit('error', { error: errorValue })
  }
}

const onRowCollapse = async (row: BaseTableRow) => {
  try {
    const scheduleRow = baseTableRowToScheduleRow(row)
    await collapseRow(scheduleRow)
    emit('row-collapse', { row: scheduleRow })
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
    const scheduleRow = baseTableRowToScheduleRow(parameter)
    expandRow(scheduleRow)
    emit('parameter-click', { parameter: scheduleRow })
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
