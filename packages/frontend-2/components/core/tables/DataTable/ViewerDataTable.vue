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
      @table-updated="$emit('table-updated')"
      @column-visibility-change="$emit('column-visibility-change')"
      @sort="(field, order) => $emit('sort', field, order)"
      @filter="(filters) => $emit('filter', filters)"
      @error="handleError"
      @retry="handleRetry"
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
import BaseDataTable from './BaseDataTable.vue'
import type { TableProps, TableEvents } from './types'
import { TableError } from './utils'
import { useTableState } from './composables/useTableState'

// Props
const props = defineProps<TableProps>()

// Emits
const emit = defineEmits<TableEvents>()

// State
const error = ref<Error | null>(null)
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
const { resetState } = useTableState({
  tableId: props.tableId,
  onError: (err: TableError) => {
    error.value = err
    emit('error', err)
  }
})

// Event Handlers
function handleError(err: unknown): void {
  const tableError =
    err instanceof TableError
      ? err
      : new TableError(
          err instanceof Error ? err.message : 'An unknown error occurred',
          err
        )
  error.value = tableError
  emit('error', tableError)
}

async function handleRetry(): Promise<void> {
  try {
    error.value = null
    await Promise.resolve(resetState())
    emit('retry')
  } catch (err) {
    handleError(err)
  }
}
</script>

<style scoped>
.viewer-data-table {
  width: 100%;
  height: 100%;
}
</style>
