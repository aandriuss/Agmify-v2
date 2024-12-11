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
          :error="currentError"
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
                  {{ currentError?.message || 'Failed to load schedule data' }}
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
import type { SortEvent } from '~/composables/core/types'
import type { ColumnDef } from '~/composables/core/types/tables/column-types'
import type {
  TableState,
  ScheduleEvents,
  BaseTableProps,
  ColumnUpdateEvent,
  ColumnReorderEvent
} from '~/composables/core/types/tables/event-types'
import { toScheduleRows } from '~/composables/core/tables/utils/schedule-conversion'
import type { ScheduleRow } from '~/composables/core/types/tables/schedule-types'
import type { DataTableFilterMeta } from '~/composables/core/types/tables/filter-types'
import { createFilterPayload } from '~/composables/core/types/tables/filter-types'

// Props
export interface ScheduleTableProps
  extends Omit<BaseTableProps<ScheduleRow>, 'columns' | 'detailColumns'> {
  columns: ColumnDef[]
  detailColumns?: ColumnDef[]
  initialState?: TableState<ScheduleRow>
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

// Convert ScheduleEvents to Vue emit type
type EmitEvents = {
  [K in keyof ScheduleEvents<ScheduleRow>]: [payload: ScheduleEvents<ScheduleRow>[K]]
}

// Emits
const emit = defineEmits<EmitEvents>()

// State
const error = ref<Error | null>(null)
const currentError = computed(() => error.value)
const selectedParameters = ref<ScheduleRow[]>([])

// Convert data to schedule rows
const tableData = computed(() => toScheduleRows(props.data))

// Computed table state
const tableState = computed<TableState<ScheduleRow>>(() => ({
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
    error.value = err
    emit('error', { error: err })
  }
})

// Event Handlers
const onExpandedRowsChange = (payload: unknown) => {
  if (Array.isArray(payload)) {
    emit('update:expanded-rows', { rows: payload as ScheduleRow[] })
  }
}

const onColumnsChange = (payload: unknown) => {
  if (Array.isArray(payload)) {
    emit('update:columns', { columns: payload as ColumnDef[] })
  }
}

const onDetailColumnsChange = (payload: unknown) => {
  if (Array.isArray(payload)) {
    emit('update:detail-columns', { columns: payload as ColumnDef[] })
  }
}

const onBothColumnsChange = (payload: unknown) => {
  if (
    payload &&
    typeof payload === 'object' &&
    'parentColumns' in payload &&
    'childColumns' in payload
  ) {
    emit('update:both-columns', payload as ColumnUpdateEvent)
  }
}

const onColumnReorder = (payload: unknown) => {
  if (
    payload &&
    typeof payload === 'object' &&
    'dragIndex' in payload &&
    'dropIndex' in payload &&
    typeof (payload as ColumnReorderEvent).dragIndex === 'number' &&
    typeof (payload as ColumnReorderEvent).dropIndex === 'number'
  ) {
    emit('column-reorder', payload as ColumnReorderEvent)
  }
}

const onColumnVisibilityChange = (payload: { column: ColumnDef; visible: boolean }) => {
  emit('column-visibility-change', { column: payload.column, visible: payload.visible })
}

const onRowExpand = async (payload: unknown) => {
  if (payload && typeof payload === 'object' && 'id' in payload) {
    const row = payload as ScheduleRow
    try {
      await expandRow(row)
      emit('row-expand', { row })
    } catch (err) {
      const tableError = err instanceof Error ? err : new Error('Failed to expand row')
      error.value = tableError
      emit('error', { error: tableError })
    }
  }
}

const onRowCollapse = async (payload: unknown) => {
  if (payload && typeof payload === 'object' && 'id' in payload) {
    const row = payload as ScheduleRow
    try {
      await collapseRow(row)
      emit('row-collapse', { row })
    } catch (err) {
      const tableError =
        err instanceof Error ? err : new Error('Failed to collapse row')
      error.value = tableError
      emit('error', { error: tableError })
    }
  }
}

const onTableUpdated = () => {
  emit('table-updated', { timestamp: Date.now() })
}

const onSort = (event: SortEvent) => {
  if (typeof event.field === 'string' && typeof event.order === 'number') {
    emit('sort', { field: event.field, order: event.order })
  }
}

const onFilter = (filters: DataTableFilterMeta) => {
  emit('filter', createFilterPayload(filters))
}

const onError = (err: Error) => {
  if (err instanceof Error) {
    error.value = err
    emit('error', { error: err })
  }
}

const onRetry = async () => {
  try {
    error.value = null
    await reset()
    emit('retry', { timestamp: Date.now() })
  } catch (err) {
    const tableError =
      err instanceof Error ? err : new Error('Failed to retry operation')
    error.value = tableError
    emit('error', { error: tableError })
  }
}

function handleCategoryUpdate(categories: string[]): void {
  try {
    updateCategories(categories)
    emit('update:selected-categories', { categories })
  } catch (err) {
    const tableError =
      err instanceof Error ? err : new Error('Failed to update categories')
    error.value = tableError
    emit('error', { error: tableError })
  }
}

function handleParameterClick(parameter: ScheduleRow): void {
  try {
    expandRow(parameter)
    emit('parameter-click', { parameter })
  } catch (err) {
    const tableError =
      err instanceof Error ? err : new Error('Failed to handle parameter click')
    error.value = tableError
    emit('error', { error: tableError })
  }
}
</script>

<style scoped>
.schedule-table {
  width: 100%;
  height: 100%;
}
</style>
