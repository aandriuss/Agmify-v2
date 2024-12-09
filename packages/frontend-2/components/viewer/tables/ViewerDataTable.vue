<template>
  <div class="viewer-data-table">
    <BaseDataTable
      :table-id="tableId"
      :table-name="tableName"
      :data="data"
      :columns="columns"
      :detail-columns="detailColumns"
      :loading="loading"
      :initial-state="initialState"
      @[`update:expanded-rows`]="(e: unknown[]) => handleExpandedRowsUpdate(e)"
      @[`update:columns`]="(e: unknown[]) => handleColumnsUpdate(e)"
      @[`update:detail-columns`]="(e: unknown[]) => handleDetailColumnsUpdate(e)"
      @[`update:both-columns`]="(e: unknown) => handleBothColumnsUpdate(e)"
      @column-reorder="(e: unknown) => handleColumnReorder(e)"
      @row-expand="(e: unknown) => handleRowExpand(e)"
      @row-collapse="(e: unknown) => handleRowCollapse(e)"
      @table-updated="$emit('table-updated')"
      @column-visibility-change="$emit('column-visibility-change')"
      @sort="(e: unknown) => handleSort(e as DataTableSortEvent)"
      @filter="(e: unknown) => handleFilter(e as DataTableFilterEvent)"
      @error="handleError"
    >
      <template #empty>
        <slot name="empty">
          <div class="p-4 text-center text-gray-500">
            No data available. Try adjusting your filters or selecting different
            categories.
          </div>
        </slot>
      </template>

      <template #loading>
        <slot name="loading">
          <div class="p-4 text-center text-gray-500">
            <div class="flex flex-col items-center gap-2">
              <span>Loading data...</span>
              <span class="text-sm">This might take a moment for large datasets.</span>
            </div>
          </div>
        </slot>
      </template>

      <template #error>
        <slot name="error" :error="currentError">
          <div class="p-4 text-center text-red-500">
            <div class="flex flex-col items-center gap-2">
              <span>{{ currentError?.message || 'An error occurred' }}</span>
              <button
                class="text-sm text-primary-600 hover:text-primary-700"
                @click="handleRetry"
              >
                Retry
              </button>
            </div>
          </div>
        </slot>
      </template>
    </BaseDataTable>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import BaseDataTable from '../../core/tables/DataTable/BaseDataTable.vue'
import type {
  TableColumnDef,
  BaseTableRow,
  TableProps
} from '../../core/tables/DataTable/types'
import { TableError } from '../../core/tables/DataTable/utils'
import type { DataTableSortEvent, DataTableFilterEvent } from 'primevue/datatable'
import { useViewerTable } from '~/composables/tables/useViewerTable'

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
}>()

// State
const error = ref<Error | null>(null)
const currentError = computed(() => error.value)

// Initialize viewer table
const { expandRow, collapseRow, updateSort, updateFilters, reset } = useViewerTable({
  tableId: props.tableId,
  initialParentColumns: props.columns,
  initialChildColumns: props.detailColumns || [],
  onError: (err: TableError) => {
    error.value = new Error(err.message)
    emit('error', err)
  }
})

// Type Guards
function isBaseTableRow(value: unknown): value is BaseTableRow {
  return value !== null && typeof value === 'object' && 'id' in value
}

function isTableColumnDef(value: unknown): value is TableColumnDef {
  return (
    value !== null && typeof value === 'object' && 'id' in value && 'field' in value
  )
}

// Event Handlers
function handleExpandedRowsUpdate(rows: unknown[]): void {
  const validRows = rows.filter(isBaseTableRow)
  emit('update:expanded-rows', validRows)
}

function handleColumnsUpdate(columns: unknown[]): void {
  const validColumns = columns.filter(isTableColumnDef)
  emit('update:columns', validColumns)
}

function handleDetailColumnsUpdate(columns: unknown[]): void {
  const validColumns = columns.filter(isTableColumnDef)
  emit('update:detail-columns', validColumns)
}

function handleBothColumnsUpdate(updates: unknown): void {
  if (
    updates &&
    typeof updates === 'object' &&
    'parentColumns' in updates &&
    'childColumns' in updates
  ) {
    const { parentColumns, childColumns } = updates as {
      parentColumns: unknown[]
      childColumns: unknown[]
    }
    emit('update:both-columns', {
      parentColumns: parentColumns.filter(isTableColumnDef),
      childColumns: childColumns.filter(isTableColumnDef)
    })
  }
}

function handleColumnReorder(event: unknown): void {
  if (
    event &&
    typeof event === 'object' &&
    'dragIndex' in event &&
    'dropIndex' in event &&
    typeof (event as { dragIndex: number }).dragIndex === 'number' &&
    typeof (event as { dropIndex: number }).dropIndex === 'number'
  ) {
    const { dragIndex, dropIndex } = event as { dragIndex: number; dropIndex: number }
    emit('column-reorder', { dragIndex, dropIndex })
  }
}

async function handleRowExpand(row: unknown): Promise<void> {
  try {
    if (isBaseTableRow(row)) {
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

async function handleRowCollapse(row: unknown): Promise<void> {
  try {
    if (isBaseTableRow(row)) {
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

function handleSort(event: DataTableSortEvent): void {
  try {
    if (
      event &&
      typeof event === 'object' &&
      'sortField' in event &&
      'sortOrder' in event &&
      typeof event.sortField === 'string' &&
      typeof event.sortOrder === 'number'
    ) {
      updateSort(event.sortField, event.sortOrder)
      emit('sort', event.sortField, event.sortOrder)
    }
  } catch (err) {
    const tableError = new TableError(
      err instanceof Error ? err.message : 'Failed to update sort',
      err
    )
    error.value = new Error(tableError.message)
    emit('error', tableError)
  }
}

function handleFilter(event: DataTableFilterEvent): void {
  try {
    if (event && typeof event === 'object' && 'filters' in event) {
      const filters = event.filters as Record<
        string,
        { value: unknown; matchMode: string }
      >
      updateFilters(filters)
      emit('filter', filters)
    }
  } catch (err) {
    const tableError = new TableError(
      err instanceof Error ? err.message : 'Failed to update filters',
      err
    )
    error.value = new Error(tableError.message)
    emit('error', tableError)
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
</script>

<style scoped>
.viewer-data-table {
  width: 100%;
  height: 100%;
}
</style>
