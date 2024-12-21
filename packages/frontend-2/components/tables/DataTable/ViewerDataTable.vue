<template>
  <div class="viewer-data-table">
    <BaseDataTable
      v-bind="tableProps"
      @update:expanded-rows="$emit('update:expanded-rows', $event)"
      @update:columns="$emit('update:columns', $event)"
      @update:detail-columns="$emit('update:detail-columns', $event)"
      @update:both-columns="$emit('update:both-columns', $event)"
      @column-reorder="$emit('column-reorder', $event)"
      @row-expand="$emit('row-expand', $event)"
      @row-collapse="$emit('row-collapse', $event)"
      @table-updated="$emit('table-updated', { timestamp: Date.now() })"
      @column-visibility-change="
        (payload) => handleColumnVisibilityChange(payload.column, payload.visible)
      "
      @sort="$emit('sort', $event)"
      @filter="(payload) => handleFilter(payload.filters)"
      @error="$emit('error', $event)"
      @retry="$emit('retry', { timestamp: Date.now() })"
    >
      <template #empty>
        <slot name="empty">
          <div class="p-4 text-center text-gray-500">No data available</div>
        </slot>
      </template>

      <template #loading>
        <slot name="loading">
          <div class="p-4 text-center text-gray-500">Loading data...</div>
        </slot>
      </template>

      <template #error>
        <slot name="error">
          <div class="p-4 text-center text-red-500">
            {{ currentError?.message || 'An error occurred' }}
          </div>
        </slot>
      </template>
    </BaseDataTable>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { DataTableFilterMeta } from 'primevue/datatable'
import BaseDataTable from '~/components/core/tables/BaseDataTable.vue'
import type { TableProps } from './types'
import type { TableColumn } from '~/composables/core/types'
import { TableError } from './utils'
import { useDataTableState } from '~/composables/core/tables'
import { useDebug, DebugCategories } from '~/composables/core/utils/debug'
import type { TableEmits } from '~/composables/core/types/events'

const debug = useDebug()

// Props
const props = defineProps<TableProps>()

// Emits
const emit = defineEmits<TableEmits>()

// State
const error = ref<TableError | null>(null)
const currentError = computed(() => error.value)

// Computed props to avoid type errors
const tableProps = computed(() => ({
  tableId: props.tableId,
  tableName: props.tableName,
  data: props.data,
  columns: props.columns,
  detailColumns: props.detailColumns,
  loading: props.loading,
  initialState: props.initialState
}))

// Initialize table state
const { resetState: _resetState } = useDataTableState({
  tableId: props.tableId,
  onError: (err: unknown) => {
    const tableError = createTableError(err)
    error.value = tableError
    emit('error', { error: tableError })
  }
})

// Error handling utilities
function createTableError(err: unknown): TableError {
  if (err instanceof TableError) {
    return new TableError(err.message, err.context)
  }
  if (err instanceof Error) {
    return new TableError(err.message, { originalError: err })
  }
  return new TableError('An unknown error occurred', { originalValue: err })
}

// Event Handlers
function handleColumnVisibilityChange(column: TableColumn, visible: boolean): void {
  try {
    debug.log(DebugCategories.COLUMNS, 'Column visibility change in ViewerDataTable', {
      field: column.field,
      visible
    })
    emit('column-visibility-change', { column, visible })
  } catch (err) {
    handleError(err)
  }
}

function handleFilter(filters: DataTableFilterMeta): void {
  try {
    debug.log(DebugCategories.TABLE_DATA, 'Filter event in ViewerDataTable', {
      filters
    })
    emit('filter', { filters })
  } catch (err) {
    handleError(err)
  }
}

function handleError(err: unknown): void {
  const tableError = createTableError(err)
  error.value = tableError
  emit('error', { error: tableError })
}
</script>

<style scoped>
.viewer-data-table {
  width: 100%;
  height: 100%;
}
</style>
