<template>
  <div class="base-table">
    <!-- Loading State -->
    <div v-if="isLoading" class="table-state">
      <slot name="loading">
        <div class="p-4 text-center text-gray-500">
          <div class="flex flex-col items-center gap-2">
            <span>{{ loadingMessage || 'Loading data...' }}</span>
          </div>
        </div>
      </slot>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="table-state">
      <slot name="error" :error="errorState">
        <div class="p-4 text-center text-red-500">
          <div class="flex flex-col items-center gap-2">
            <span>{{ errorState?.message || 'An error occurred' }}</span>
            <button
              class="text-sm text-primary hover:text-primary-focus"
              @click="handleRetry"
            >
              Retry
            </button>
          </div>
        </div>
      </slot>
    </div>

    <!-- Empty State -->
    <div v-else-if="!isDataValid || !hasVisibleColumns" class="table-state">
      <slot name="empty">
        <div class="p-4 text-center text-gray-500">
          <div class="flex flex-col items-center gap-2">
            <span>No data available.</span>
          </div>
        </div>
      </slot>
    </div>

    <!-- Data Table -->
    <DataTable
      v-else
      :value="props.data"
      :resizable-columns="true"
      :reorderable-columns="true"
      :striped-rows="true"
      class="p-datatable-sm shadow-sm"
      :paginator="false"
      :rows="10"
      :expand-mode="hasExpandableRows ? 'row' : undefined"
      data-key="id"
      :expanded-rows="hasExpandableRows ? expandedRowsMap : undefined"
      @update:expanded-rows="hasExpandableRows ? handleExpandedRowsChange : undefined"
      @column-resize="handleColumnResize"
      @column-reorder="handleColumnReorder"
      @row-expand="handleRowExpand"
      @row-collapse="handleRowCollapse"
      @filter="handleFilter"
    >
      <!-- Row Expansion Template -->
      <template #expansion="slotProps">
        <slot name="expansion" :row="slotProps.data">
          <div class="p-1">
            <DataTable
              :value="slotProps.data.details"
              :resizable-columns="true"
              :reorderable-columns="true"
              :striped-rows="true"
              class="nested-table"
              data-key="id"
              @column-resize="handleColumnResize"
              @column-reorder="handleColumnReorder"
            >
              <Column
                v-for="col in visibleDetailColumns"
                :key="col.field"
                :field="col.field"
                :header="col.header"
                :data-field="col.field"
                :style="{ width: col.width ? `${col.width}px` : 'auto' }"
                :sortable="true"
              />
            </DataTable>
          </div>
        </slot>
      </template>

      <!-- Default Columns -->
      <Column v-if="hasExpandableRows" :expander="true" style="width: 3rem" />
      <Column
        v-for="col in visibleTableColumns"
        :key="col.field"
        :field="col.field"
        :header="col.header"
        :data-field="col.field"
        :style="{ width: col.width ? `${col.width}px` : 'auto' }"
        :sortable="true"
        @visibility-change="handleColumnVisibilityChange(col)"
      />
    </DataTable>
  </div>
</template>

<script setup lang="ts" generic="T extends BaseTableRow">
import { computed, ref, watch } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import type { DataTableFilterEvent } from 'primevue/datatable'
import type { TableColumn } from '~/composables/core/types/tables/table-column'
import { useTableStore } from '~/composables/core/tables/store/store'
import { useDebug, DebugCategories } from '~/composables/core/utils/debug'
import type {
  TableEmits,
  BaseTableRow
} from '~/composables/core/types/tables/table-events'
import { filterUtils } from '~/composables/core/types/tables/table-events'
import { useLoadingState } from '~/composables/core/tables/state/useLoadingState'

interface BaseTableProps<T extends BaseTableRow> {
  tableId: string
  tableName?: string
  data: T[]
  columns: TableColumn[]
  detailColumns?: TableColumn[]
  loading?: boolean
  loadingMessage?: string
  error?: Error | null
  initialState?: {
    expandedRows?: T[]
    selectedRows?: T[]
  }
}

const debug = useDebug()

// Props with defaults
const props = withDefaults(defineProps<BaseTableProps<T>>(), {
  tableName: 'Untitled Table',
  loading: false,
  loadingMessage: '',
  error: null,
  detailColumns: () => [],
  initialState: () => ({})
})

// Emits with generic row type
const emit = defineEmits<TableEmits<T>>()

// Initialize stores and loading state
const tableStore = useTableStore()
const { state: loadingState } = useLoadingState()

// Table state
const expandedRowsMap = ref<Record<string, boolean>>(
  props.initialState?.expandedRows?.reduce((acc, row) => {
    if (row.id) acc[row.id] = true
    return acc
  }, {} as Record<string, boolean>) || {}
)

// Computed properties
const hasExpandableRows = computed(() => {
  return props.data.some((row) => Array.isArray(row.details) && row.details.length > 0)
})

const isLoading = computed(() => props.loading)
const isDataValid = computed(() => Array.isArray(props.data) && props.data.length > 0)
const hasVisibleColumns = computed(() => props.columns?.length > 0)

const visibleTableColumns = computed(() => {
  if (!Array.isArray(props.columns)) return []
  return props.columns.filter((col) => col?.visible)
})

const visibleDetailColumns = computed(() => {
  if (!Array.isArray(props.detailColumns)) return []
  return props.detailColumns.filter((col) => col?.visible)
})

// Watch for column changes with loading state awareness
watch(
  [() => props.columns, () => loadingState.value.phase],
  ([newColumns, phase]) => {
    if (phase !== 'complete') return
    if (!Array.isArray(newColumns)) return
    tableStore.updateColumns(newColumns, props.detailColumns || [])
  },
  { deep: true }
)

watch(
  [() => props.detailColumns, () => loadingState.value.phase],
  ([newColumns, phase]) => {
    if (phase !== 'complete') return
    if (!Array.isArray(newColumns)) return
    tableStore.updateColumns(props.columns, newColumns)
  },
  { deep: true }
)

// Error state with loading phase context
const errorState = computed(() => {
  if (props.error) {
    return {
      message: props.error.message,
      name: props.error.name,
      stack: props.error.stack,
      phase: loadingState.value.phase
    }
  }
  if (tableStore.hasError.value) {
    const storeError = tableStore.error.value
    return {
      message: storeError?.message || 'An error occurred',
      name: storeError?.name || 'Error',
      stack: storeError?.stack,
      phase: loadingState.value.phase
    }
  }
  return null
})

// Event handlers with improved error context
function handleFilter(event: DataTableFilterEvent): void {
  try {
    if (loadingState.value.phase !== 'complete') return
    const payload = filterUtils.createFilterPayload(event)
    emit('filter', payload)
  } catch (err) {
    handleError(err instanceof Error ? err : new Error('Failed to apply filters'))
  }
}

function handleError(err: unknown): void {
  const error = err instanceof Error ? err : new Error(String(err))
  debug.error(DebugCategories.ERROR, 'Table error:', {
    error,
    phase: loadingState.value.phase,
    state: {
      isLoading: isLoading.value,
      dataValid: isDataValid.value,
      hasColumns: hasVisibleColumns.value
    }
  })
  emit('error', { error })
}

interface ExpandableRow {
  id: string
  [key: string]: unknown
}

function isExpandableRow(value: unknown): value is ExpandableRow {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { id: string }).id === 'string'
  )
}

function handleExpandedRowsChange(value: unknown): void {
  if (Array.isArray(value)) {
    // Handle array case
    const newMap: Record<string, boolean> = {}
    value.forEach((row) => {
      if (isExpandableRow(row)) {
        newMap[row.id] = true
      }
    })
    expandedRowsMap.value = newMap
  } else if (typeof value === 'object' && value !== null) {
    // Handle object case
    expandedRowsMap.value = value as Record<string, boolean>
  }

  debug.log(DebugCategories.STATE, 'Expanded rows changed:', {
    type: Array.isArray(value) ? 'array' : 'object',
    expandedCount: Array.isArray(value)
      ? value.length
      : Object.keys(value as Record<string, boolean>).length
  })
}

function handleColumnVisibilityChange(column: TableColumn): void {
  try {
    if (loadingState.value.phase !== 'complete') return
    if (!column?.id) return

    debug.log(DebugCategories.COLUMNS, 'Column visibility change requested', {
      id: column.id,
      visible: !column.visible,
      phase: loadingState.value.phase
    })

    emit('column-visibility-change', {
      column: {
        ...column,
        visible: !column.visible
      },
      visible: !column.visible
    })
  } catch (err) {
    const error =
      err instanceof Error ? err : new Error('Failed to update column visibility')
    handleError(error)
  }
}

function handleColumnResize(event: { element: HTMLElement; delta: number }): void {
  try {
    if (loadingState.value.phase !== 'complete') return
    const field = event.element.dataset.field
    if (!field) return

    const columns = [...props.columns]
    const column = columns.find((col) => col.field === field)
    if (column) {
      const updatedColumn = { ...column, width: event.element.offsetWidth }
      const updatedColumns = columns.map((c) => (c.field === field ? updatedColumn : c))
      tableStore.updateColumns(updatedColumns, props.detailColumns || [])
    }

    emit('column-resize', { element: event.element, delta: event.delta })
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Failed to resize column')
    handleError(error)
  }
}

function handleColumnReorder(event: { dragIndex: number; dropIndex: number }): void {
  try {
    if (loadingState.value.phase !== 'complete') return
    const { dragIndex, dropIndex } = event
    const columns = [...props.columns]
    const [movedColumn] = columns.splice(dragIndex, 1)
    columns.splice(dropIndex, 0, movedColumn)

    // Update column order
    const updatedColumns = columns.map((col, index) => ({
      ...col,
      order: index
    }))

    tableStore.updateColumns(updatedColumns, props.detailColumns || [])
    emit('column-reorder', { dragIndex, dropIndex })
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Failed to reorder columns')
    handleError(error)
  }
}

function handleRowExpand(event: { data: T }): void {
  try {
    if (loadingState.value.phase !== 'complete') return
    if (!event.data?.id) return
    emit('row-expand', { row: event.data })
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Failed to expand row')
    handleError(error)
  }
}

function handleRowCollapse(event: { data: T }): void {
  try {
    if (loadingState.value.phase !== 'complete') return
    if (!event.data?.id) return
    emit('row-collapse', { row: event.data })
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Failed to collapse row')
    handleError(error)
  }
}

function handleRetry(): void {
  emit('retry', { timestamp: Date.now() })
}
</script>

<style>
.base-table :deep(.p-datatable) {
  background-color: var(--surface-card);
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgb(0 0 0 / 10%);
}

.base-table :deep(.p-datatable .p-datatable-header) {
  background-color: var(--surface-section);
  border-top-left-radius: 0.5rem;
  border-top-right-radius: 0.5rem;
  padding: 0.2rem;
  border-bottom: 1px solid var(--surface-border);
  height: 3rem;
}

.base-table :deep(.p-datatable .p-datatable-thead > tr > th) {
  background-color: var(--surface-section);
  color: var(--text-color);
  font-weight: 600;
  padding: 0.2rem;
  border-bottom: 1px solid var(--surface-border);
  height: 3rem;
}

.base-table :deep(.p-datatable .p-datatable-tbody > tr) {
  color: var(--text-color);
  transition: background-color 0.2s;
}

.base-table :deep(.p-datatable .p-datatable-tbody > tr > td) {
  padding: 0.2rem;
  border-bottom: 1px solid var(--surface-border);
}

.base-table :deep(.p-datatable .p-datatable-tbody > tr:hover) {
  background-color: var(--surface-hover);
}

.base-table :deep(.p-datatable-expanded-row > td) {
  padding: 0 !important;
}

.base-table :deep(.p-datatable-expanded-row .p-datatable) {
  margin: 0 !important;
}

.base-table :deep(.p-datatable-expanded-row .p-datatable .p-datatable-thead > tr > th) {
  background-color: var(--surface-ground);
}

.base-table :deep(.p-datatable-expanded-row .p-datatable .p-column-resizer) {
  width: 0;
  background-color: transparent;
}

.base-table :deep(.p-datatable-expanded-row .p-datatable .p-column-resizer:hover) {
  background-color: var(--surface-hover);
}

.table-state {
  padding: 2rem;
  text-align: center;
}
</style>
