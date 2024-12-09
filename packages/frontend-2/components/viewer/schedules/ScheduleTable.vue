<template>
  <div class="schedule-table">
    <div class="flex gap-6">
      <!-- Main Table -->
      <div class="flex-1">
        <BaseDataTable
          :table-id="tableId"
          :table-name="tableName"
          :data="data"
          :columns="columns"
          :detail-columns="detailColumns"
          :loading="loading"
          :initial-state="initialState"
          @[`update:expanded-rows`]="(e: unknown) => handleExpandedRowsUpdate(e as BaseTableRow[])"
          @[`update:columns`]="(e: unknown) => $emit('update:columns', e as TableColumnDef[])"
          @[`update:detail-columns`]="(e: unknown) => $emit('update:detail-columns', e as TableColumnDef[])"
          @[`update:both-columns`]="(e: unknown) => handleBothColumnsUpdate(e)"
          @column-reorder="(e: unknown) => handleColumnReorder(e)"
          @row-expand="(e: unknown) => handleRowExpand(e as BaseTableRow)"
          @row-collapse="(e: unknown) => handleRowCollapse(e as BaseTableRow)"
          @table-updated="$emit('table-updated')"
          @column-visibility-change="$emit('column-visibility-change')"
          @sort="(e: unknown) => handleSort(e)"
          @filter="(e: unknown) => handleFilter(e)"
          @error="handleError"
          @retry="handleRetry"
        >
          <template #empty>
            <slot name="empty">
              <div class="p-4 text-center text-gray-500">
                <div class="flex flex-col items-center gap-2">
                  <span>No schedule data available.</span>
                  <span class="text-sm">
                    Try selecting different categories or adjusting your filters.
                  </span>
                </div>
              </div>
            </slot>
          </template>

          <template #loading>
            <slot name="loading">
              <div class="p-4 text-center text-gray-500">
                <div class="flex flex-col items-center gap-2">
                  <span>Loading schedule data...</span>
                  <span class="text-sm">
                    This might take a moment for large schedules.
                  </span>
                </div>
              </div>
            </slot>
          </template>

          <template #error>
            <slot name="error">
              <div class="p-4 text-center text-red-500">
                <div class="flex flex-col items-center gap-2">
                  <span>
                    {{ currentError?.message || 'Failed to load schedule data' }}
                  </span>
                  <button
                    class="text-sm text-primary-600 hover:text-primary-700"
                    @click="handleRetry"
                  >
                    Retry Loading Schedule
                  </button>
                </div>
              </div>
            </slot>
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
          @update:selected-categories="handleCategoryUpdate"
          @parameter-click="handleParameterClick"
          @create-parameter="$emit('create-parameter')"
          @edit-parameters="$emit('edit-parameters')"
          @error="handleError"
          @retry="handleRetry"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import BaseDataTable from '../../core/tables/DataTable/BaseDataTable.vue'
import ScheduleParameterManager from './components/ScheduleParameterManager.vue'
import type {
  TableColumnDef,
  TableProps,
  BaseTableRow
} from '../../core/tables/DataTable/types'
import { TableError } from '../../core/tables/DataTable/utils'
import { useScheduleTable } from './composables/useScheduleTable'
import type { ScheduleRow } from './types'
import type { DataTableSortEvent, DataTableFilterEvent } from 'primevue/datatable'

// Props
const props = defineProps<TableProps>()

// Emits
const emit = defineEmits<{
  'update:expanded-rows': [rows: BaseTableRow[]]
  'update:columns': [columns: TableColumnDef[]]
  'update:detail-columns': [columns: TableColumnDef[]]
  'update:both-columns': [
    updates: { parentColumns: TableColumnDef[]; childColumns: TableColumnDef[] }
  ]
  'column-reorder': [event: { dragIndex: number; dropIndex: number }]
  'row-expand': [row: BaseTableRow]
  'row-collapse': [row: BaseTableRow]
  'table-updated': []
  'column-visibility-change': []
  sort: [field: string, order: number]
  filter: [filters: Record<string, { value: unknown; matchMode: string }>]
  error: [error: TableError]
  retry: []
  'create-parameter': []
  'edit-parameters': []
}>()

// State
const error = ref<Error | null>(null)
const currentError = computed(() => error.value)
const selectedParameters = ref<ScheduleRow[]>([])

// Type Guards
function isScheduleRow(row: BaseTableRow): row is ScheduleRow {
  return 'name' in row && typeof row.name === 'string'
}

interface ColumnUpdate {
  parentColumns: unknown[]
  childColumns: unknown[]
}

interface ColumnReorderEvent {
  dragIndex: number
  dropIndex: number
}

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
  initialChildColumns: props.detailColumns || [],
  onError: (err: TableError) => {
    error.value = new Error(err.message)
    emit('error', err)
  }
})

// Event Handlers
function handleExpandedRowsUpdate(rows: BaseTableRow[]): void {
  emit('update:expanded-rows', rows)
}

function handleBothColumnsUpdate(updates: unknown): void {
  if (
    updates &&
    typeof updates === 'object' &&
    'parentColumns' in updates &&
    'childColumns' in updates &&
    Array.isArray((updates as ColumnUpdate).parentColumns) &&
    Array.isArray((updates as ColumnUpdate).childColumns)
  ) {
    const typedUpdates = {
      parentColumns: (updates as ColumnUpdate).parentColumns.filter(isTableColumnDef),
      childColumns: (updates as ColumnUpdate).childColumns.filter(isTableColumnDef)
    }
    emit('update:both-columns', typedUpdates)
  }
}

function isTableColumnDef(value: unknown): value is TableColumnDef {
  return (
    value !== null &&
    typeof value === 'object' &&
    'id' in value &&
    'field' in value &&
    typeof (value as TableColumnDef).id === 'string' &&
    typeof (value as TableColumnDef).field === 'string'
  )
}

function handleColumnReorder(event: unknown): void {
  if (
    event &&
    typeof event === 'object' &&
    'dragIndex' in event &&
    'dropIndex' in event &&
    typeof (event as ColumnReorderEvent).dragIndex === 'number' &&
    typeof (event as ColumnReorderEvent).dropIndex === 'number'
  ) {
    const typedEvent = event as ColumnReorderEvent
    emit('column-reorder', typedEvent)
  }
}

async function handleRowExpand(row: BaseTableRow): Promise<void> {
  try {
    if (isScheduleRow(row)) {
      await expandRow(row)
      emit('row-expand', row)
    }
  } catch (err) {
    const tableError = new TableError(
      err instanceof Error ? err.message : 'Failed to expand row',
      err
    )
    error.value = new Error(tableError.message)
    emit('error', tableError)
  }
}

async function handleRowCollapse(row: BaseTableRow): Promise<void> {
  try {
    if (isScheduleRow(row)) {
      await collapseRow(row)
      emit('row-collapse', row)
    }
  } catch (err) {
    const tableError = new TableError(
      err instanceof Error ? err.message : 'Failed to collapse row',
      err
    )
    error.value = new Error(tableError.message)
    emit('error', tableError)
  }
}

function handleSort(event: unknown): void {
  const typedEvent = event as DataTableSortEvent
  if (
    typedEvent &&
    typeof typedEvent === 'object' &&
    'sortField' in typedEvent &&
    'sortOrder' in typedEvent &&
    typeof typedEvent.sortField === 'string' &&
    typeof typedEvent.sortOrder === 'number'
  ) {
    emit('sort', typedEvent.sortField, typedEvent.sortOrder)
  }
}

function handleFilter(event: unknown): void {
  const typedEvent = event as DataTableFilterEvent
  if (
    typedEvent &&
    typeof typedEvent === 'object' &&
    'filters' in typedEvent &&
    typeof typedEvent.filters === 'object'
  ) {
    emit(
      'filter',
      typedEvent.filters as Record<string, { value: unknown; matchMode: string }>
    )
  }
}

function handleError(err: unknown): void {
  const tableError = new TableError(
    err instanceof Error ? err.message : 'An unknown error occurred',
    err
  )
  error.value = new Error(tableError.message)
  emit('error', tableError)
}

async function handleRetry(): Promise<void> {
  try {
    error.value = null
    await reset()
    emit('retry')
  } catch (err) {
    const tableError = new TableError(
      err instanceof Error ? err.message : 'Failed to retry operation',
      err
    )
    error.value = new Error(tableError.message)
    emit('error', tableError)
  }
}

function handleCategoryUpdate(categories: string[]): void {
  try {
    updateCategories(categories)
  } catch (err) {
    const tableError = new TableError(
      err instanceof Error ? err.message : 'Failed to update categories',
      err
    )
    error.value = new Error(tableError.message)
    emit('error', tableError)
  }
}

function handleParameterClick(row: ScheduleRow): void {
  try {
    expandRow(row)
    emit('row-expand', row)
  } catch (err) {
    const tableError = new TableError(
      err instanceof Error ? err.message : 'Failed to handle parameter click',
      err
    )
    error.value = new Error(tableError.message)
    emit('error', tableError)
  }
}
</script>

<style scoped>
.schedule-table {
  width: 100%;
  height: 100%;
}
</style>
