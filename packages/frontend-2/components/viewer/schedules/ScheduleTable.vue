<template>
  <div class="schedule-table">
    <div class="flex gap-6">
      <!-- Main Table -->
      <div class="flex-1">
        <BaseDataTable
          :table-id="tableId"
          :table-name="tableName"
          :data="data"
          :columns="columns || []"
          :detail-columns="detailColumns || []"
          :loading="loading"
          :error="currentError"
          :initial-state="{
            columns: columns || [],
            detailColumns: detailColumns || [],
            expandedRows: initialState?.expandedRows || []
          }"
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
                  class="text-sm text-primary-600 hover:text-primary-700"
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
import BaseDataTable from '~/components/tables/DataTable/BaseDataTable.vue'
import ScheduleParameterManager from './components/ScheduleParameterManager.vue'
import { useScheduleTable } from './composables/useScheduleTable'
import type { Parameter } from '~/composables/core/types/parameters'
import type {
  TableEmits,
  TableModelProps,
  ColumnUpdateEvent,
  SortEvent,
  ColumnReorderEvent
} from '~/composables/core/types/events/table-events'
import type { ColumnDef } from '~/composables/core/types'
import type { DataTableFilterMeta } from 'primevue/datatable'

// Props
export interface ScheduleTableProps extends TableModelProps<Parameter> {
  tableId: string
  tableName?: string
  data: Parameter[]
  loading?: boolean
  initialState?: {
    expandedRows?: Parameter[]
    selectedRows?: Parameter[]
  }
}

// Custom emits for schedule-specific events
export interface ScheduleEmits<T> {
  (e: 'update:expanded-rows', payload: { rows: T[] }): void
  (e: 'update:columns', payload: { columns: ColumnDef[] }): void
  (e: 'update:detail-columns', payload: { columns: ColumnDef[] }): void
  (e: 'update:both-columns', payload: ColumnUpdateEvent): void
  (e: 'update:selected-categories', payload: { categories: string[] }): void
  (e: 'column-reorder', payload: ColumnReorderEvent): void
  (e: 'row-expand', payload: { row: T }): void
  (e: 'row-collapse', payload: { row: T }): void
  (e: 'table-updated', payload: { timestamp: number }): void
  (e: 'column-visibility-change', payload: { visible: boolean }): void
  (e: 'sort', payload: SortEvent): void
  (e: 'filter', payload: { filters: DataTableFilterMeta }): void
  (e: 'error', payload: { error: Error }): void
  (e: 'retry', payload: { timestamp: number }): void
  (e: 'parameter-click', payload: { parameter: T }): void
  (e: 'create-parameter', payload: { timestamp: number }): void
  (e: 'edit-parameters', payload: { timestamp: number }): void
}

const props = withDefaults(defineProps<ScheduleTableProps>(), {
  tableName: 'Schedule',
  loading: false,
  columns: () => [],
  detailColumns: () => [],
  initialState: () => ({})
})

// Emits
const emit = defineEmits<ScheduleEmits<Parameter> & TableEmits<Parameter>>()

// State
const error = ref<Error | null>(null)
const currentError = computed(() => error.value)
const selectedParameters = ref<Parameter[]>([])

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
    emit('update:expanded-rows', { rows: payload as Parameter[] })
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

const onRowExpand = async (payload: unknown) => {
  if (payload && typeof payload === 'object' && 'id' in payload) {
    const row = payload as Parameter
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
    const row = payload as Parameter
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

const onColumnVisibilityChange = () => {
  emit('column-visibility-change', { visible: true })
}

const onSort = (event: SortEvent) => {
  emit('sort', event)
}

const onFilter = (filters: DataTableFilterMeta) => {
  emit('filter', { filters })
}

const onError = (err: Error) => {
  error.value = err
  emit('error', { error: err })
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

function handleParameterClick(parameter: Parameter): void {
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
