<template>
  <div class="viewer-data-table">
    <BaseDataTable
      :table-id="tableId"
      :table-name="tableName"
      :data="tableState.rows.value"
      :columns="tableState.columns.value"
      :detail-columns="tableState.detailColumns.value"
      :loading="tableState.isLoading.value"
      :error="error"
      :initial-state="initialState"
      @update:expanded-rows="handleExpandedRowsUpdate"
      @update:columns="handleColumnsUpdate"
      @update:detail-columns="handleDetailColumnsUpdate"
      @update:both-columns="handleBothColumnsUpdate"
      @column-reorder="handleColumnReorder"
      @row-expand="handleRowExpand"
      @row-collapse="handleRowCollapse"
      @table-updated="$emit('table-updated')"
      @column-visibility-change="$emit('column-visibility-change')"
      @sort="handleSort"
      @filter="handleFilter"
      @error="handleError"
      @retry="handleRetry"
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
        <slot name="error" :error="error">
          <div class="p-4 text-center text-red-500">
            <div class="flex flex-col items-center gap-2">
              <span>{{ error?.message || 'An error occurred' }}</span>
              <button
                class="text-sm text-primary hover:text-primary-focus"
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
import { ref, onBeforeUnmount } from 'vue'
import BaseDataTable from '~/components/core/tables/BaseDataTable.vue'
import type { ColumnDef, ViewerTableRow } from '~/composables/core/types'
import type { TableProps } from '~/components/tables/DataTable/types'
import { useViewerTableState } from '~/composables/core/tables'
import { TableStateError } from '~/composables/core/types/errors'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import type { DataTableSortEvent, DataTableFilterEvent } from 'primevue/datatable'

// Props
const props = defineProps<TableProps<ViewerTableRow>>()

// Emits
const emit = defineEmits<{
  'update:expanded-rows': [rows: ViewerTableRow[]]
  'update:columns': [columns: ColumnDef[]]
  'update:detail-columns': [columns: ColumnDef[]]
  'update:both-columns': [
    updates: { parentColumns: ColumnDef[]; childColumns: ColumnDef[] }
  ]
  'column-reorder': [event: { dragIndex: number; dropIndex: number }]
  'row-expand': [row: ViewerTableRow]
  'row-collapse': [row: ViewerTableRow]
  'table-updated': []
  'column-visibility-change': []
  sort: [field: string, order: number]
  filter: [filters: Record<string, { value: unknown; matchMode: string }>]
  error: [error: Error]
  retry: []
}>()

// Error state
const error = ref<Error | null>(null)

// Initialize viewer table state
const tableState = useViewerTableState({
  tableId: props.tableId,
  initialState: props.initialState,
  onError: (err) => {
    const tableError =
      err instanceof Error
        ? new TableStateError(err.message, err)
        : new TableStateError('Table state error')
    error.value = tableError
    emit('error', tableError)
  },
  onUpdate: () => emit('table-updated')
})

// Initialize elements
tableState.initializeElements().catch((err) => {
  const tableError =
    err instanceof Error
      ? new TableStateError(err.message, err)
      : new TableStateError('Failed to initialize viewer table')
  error.value = tableError
  emit('error', tableError)
  debug.error(DebugCategories.ERROR, 'Failed to initialize viewer table:', err)
})

// Event Handlers
function handleExpandedRowsUpdate(rows: ViewerTableRow[]): void {
  try {
    debug.startState(DebugCategories.TABLE_UPDATES, 'Updating expanded rows')
    emit('update:expanded-rows', rows)
    debug.completeState(DebugCategories.TABLE_UPDATES, 'Expanded rows updated')
  } catch (err) {
    const tableError =
      err instanceof Error
        ? new TableStateError(err.message, err)
        : new TableStateError('Failed to update expanded rows')
    error.value = tableError
    emit('error', tableError)
    debug.error(DebugCategories.ERROR, 'Failed to update expanded rows:', err)
  }
}

function handleColumnsUpdate(columns: ColumnDef[]): void {
  try {
    debug.startState(DebugCategories.TABLE_UPDATES, 'Updating columns')
    tableState.updateColumns(columns)
    emit('update:columns', columns)
    debug.completeState(DebugCategories.TABLE_UPDATES, 'Columns updated')
  } catch (err) {
    const tableError =
      err instanceof Error
        ? new TableStateError(err.message, err)
        : new TableStateError('Failed to update columns')
    error.value = tableError
    emit('error', tableError)
    debug.error(DebugCategories.ERROR, 'Failed to update columns:', err)
  }
}

function handleDetailColumnsUpdate(columns: ColumnDef[]): void {
  try {
    debug.startState(DebugCategories.TABLE_UPDATES, 'Updating detail columns')
    tableState.updateDetailColumns(columns)
    emit('update:detail-columns', columns)
    debug.completeState(DebugCategories.TABLE_UPDATES, 'Detail columns updated')
  } catch (err) {
    const tableError =
      err instanceof Error
        ? new TableStateError(err.message, err)
        : new TableStateError('Failed to update detail columns')
    error.value = tableError
    emit('error', tableError)
    debug.error(DebugCategories.ERROR, 'Failed to update detail columns:', err)
  }
}

function handleBothColumnsUpdate(updates: {
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
}): void {
  try {
    debug.startState(DebugCategories.TABLE_UPDATES, 'Updating both columns')
    tableState.updateColumns(updates.parentColumns)
    tableState.updateDetailColumns(updates.childColumns)
    emit('update:both-columns', updates)
    debug.completeState(DebugCategories.TABLE_UPDATES, 'Both columns updated')
  } catch (err) {
    const tableError =
      err instanceof Error
        ? new TableStateError(err.message, err)
        : new TableStateError('Failed to update both columns')
    error.value = tableError
    emit('error', tableError)
    debug.error(DebugCategories.ERROR, 'Failed to update both columns:', err)
  }
}

function handleColumnReorder(event: { dragIndex: number; dropIndex: number }): void {
  try {
    debug.startState(DebugCategories.TABLE_UPDATES, 'Reordering columns')
    emit('column-reorder', event)
    debug.completeState(DebugCategories.TABLE_UPDATES, 'Columns reordered')
  } catch (err) {
    const tableError =
      err instanceof Error
        ? new TableStateError(err.message, err)
        : new TableStateError('Failed to reorder columns')
    error.value = tableError
    emit('error', tableError)
    debug.error(DebugCategories.ERROR, 'Failed to reorder columns:', err)
  }
}

function handleRowExpand(row: ViewerTableRow): void {
  try {
    debug.startState(DebugCategories.TABLE_UPDATES, 'Expanding row')
    emit('row-expand', row)
    debug.completeState(DebugCategories.TABLE_UPDATES, 'Row expanded')
  } catch (err) {
    const tableError =
      err instanceof Error
        ? new TableStateError(err.message, err)
        : new TableStateError('Failed to expand row')
    error.value = tableError
    emit('error', tableError)
    debug.error(DebugCategories.ERROR, 'Failed to expand row:', err)
  }
}

function handleRowCollapse(row: ViewerTableRow): void {
  try {
    debug.startState(DebugCategories.TABLE_UPDATES, 'Collapsing row')
    emit('row-collapse', row)
    debug.completeState(DebugCategories.TABLE_UPDATES, 'Row collapsed')
  } catch (err) {
    const tableError =
      err instanceof Error
        ? new TableStateError(err.message, err)
        : new TableStateError('Failed to collapse row')
    error.value = tableError
    emit('error', tableError)
    debug.error(DebugCategories.ERROR, 'Failed to collapse row:', err)
  }
}

function handleSort(event: DataTableSortEvent): void {
  try {
    debug.startState(DebugCategories.TABLE_UPDATES, 'Updating sort')
    if (typeof event.sortField === 'string' && typeof event.sortOrder === 'number') {
      tableState.updateSort(event.sortField, event.sortOrder)
      emit('sort', event.sortField, event.sortOrder)
    }
    debug.completeState(DebugCategories.TABLE_UPDATES, 'Sort updated')
  } catch (err) {
    const tableError =
      err instanceof Error
        ? new TableStateError(err.message, err)
        : new TableStateError('Failed to update sort')
    error.value = tableError
    emit('error', tableError)
    debug.error(DebugCategories.ERROR, 'Failed to update sort:', err)
  }
}

function handleFilter(event: DataTableFilterEvent): void {
  try {
    debug.startState(DebugCategories.TABLE_UPDATES, 'Updating filters')
    if (event.filters && typeof event.filters === 'object') {
      const filters = event.filters as Record<
        string,
        { value: unknown; matchMode: string }
      >
      tableState.updateFilters(filters)
      emit('filter', filters)
    }
    debug.completeState(DebugCategories.TABLE_UPDATES, 'Filters updated')
  } catch (err) {
    const tableError =
      err instanceof Error
        ? new TableStateError(err.message, err)
        : new TableStateError('Failed to update filters')
    error.value = tableError
    emit('error', tableError)
    debug.error(DebugCategories.ERROR, 'Failed to update filters:', err)
  }
}

function handleError(err: Error): void {
  error.value = err
  emit('error', err)
  debug.error(DebugCategories.ERROR, 'Table error:', err)
}

async function handleRetry(): Promise<void> {
  try {
    debug.startState(DebugCategories.TABLE_UPDATES, 'Retrying initialization')
    error.value = null
    await tableState.initializeElements()
    emit('retry')
    debug.completeState(DebugCategories.TABLE_UPDATES, 'Initialization retried')
  } catch (err) {
    const tableError =
      err instanceof Error
        ? new TableStateError(err.message, err)
        : new TableStateError('Failed to retry operation')
    error.value = tableError
    emit('error', tableError)
    debug.error(DebugCategories.ERROR, 'Failed to retry initialization:', err)
  }
}

// Cleanup
onBeforeUnmount(() => {
  debug.log(DebugCategories.STATE, 'Cleaning up viewer table')
  tableState.cleanup()
})
</script>

<style scoped>
.viewer-data-table {
  width: 100%;
  height: 100%;
}
</style>
