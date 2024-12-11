<template>
  <div class="base-table">
    <!-- Loading State -->
    <div v-if="loading || tableState.isLoading" class="table-state">
      <slot name="loading">
        <div class="p-4 text-center text-gray-500">
          <div class="flex flex-col items-center gap-2">
            <span>Loading data...</span>
          </div>
        </div>
      </slot>
    </div>

    <!-- Error State -->
    <div v-else-if="error || tableState.error.value" class="table-state">
      <slot name="error" :error="error || tableState.error.value">
        <div class="p-4 text-center text-red-500">
          <div class="flex flex-col items-center gap-2">
            <span>
              {{ (error || tableState.error.value)?.message || 'An error occurred' }}
            </span>
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
    <div v-else-if="!data?.length" class="table-state">
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
      v-model:expanded-rows="tableState.expandedRows.value"
      :value="data"
      resizable-columns
      reorderable-columns
      striped-rows
      class="p-datatable-sm shadow-sm"
      :paginator="false"
      :rows="10"
      expand-mode="row"
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
              resizable-columns
              reorderable-columns
              striped-rows
              class="nested-table"
              @column-resize="handleColumnResize"
              @column-reorder="handleColumnReorder"
            >
              <Column :expander="true" style="width: 3rem" />
              <Column
                v-for="col in visibleDetailColumns"
                :key="col.field"
                :field="col.field"
                :header="col.header"
                :data-field="col.field"
                :style="{ width: col.width ? `${col.width}px` : 'auto' }"
                sortable
              />
            </DataTable>
          </div>
        </slot>
      </template>

      <!-- Default Columns -->
      <Column :expander="true" style="width: 3rem" />
      <Column
        v-for="col in visibleTableColumns"
        :key="col.field"
        :field="col.field"
        :header="col.header"
        :header-component="col.headerComponent"
        :data-field="col.field"
        :style="{ width: col.width ? `${col.width}px` : 'auto' }"
        sortable
        @visibility-change="handleColumnVisibilityChange(col)"
      />
    </DataTable>
  </div>
</template>

<script setup lang="ts" generic="T extends BaseTableRow">
import { computed, watch } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import type { BaseTableRow } from '~/components/tables/DataTable/types'
import type { ColumnDef } from '~/composables/core/types'
import { useDataTableState } from '~/composables/core/tables'
import { useDebug, DebugCategories } from '~/composables/core/utils/debug'
import { type TableEmits } from '~/composables/core/types/events'
import type { DataTableFilterEvent } from '~/composables/core/types/tables/filter-types'
import filterUtils from '~/composables/core/types/tables/filter-types'

const debug = useDebug()

interface BaseTableProps<T extends BaseTableRow> {
  tableId: string
  tableName?: string
  data: T[]
  columns: ColumnDef[]
  detailColumns?: ColumnDef[]
  loading?: boolean
  error?: Error | null
  initialState?: {
    expandedRows?: T[]
    selectedRows?: T[]
  }
}

// Props
const props = withDefaults(defineProps<BaseTableProps<T>>(), {
  tableName: 'Untitled Table',
  loading: false,
  error: null,
  detailColumns: () => [],
  initialState: () => ({})
})

// Emits
const emit = defineEmits<TableEmits<T>>()

// Initialize table state
const tableState = useDataTableState({
  tableId: props.tableId,
  initialState: {
    expandedRows: props.initialState?.expandedRows,
    detailColumns: props.detailColumns
  },
  onError: (error) => emit('error', { error }),
  onUpdate: () => emit('table-updated', { timestamp: Date.now() })
})

// Computed values
const visibleTableColumns = computed(() =>
  tableState.columns.value.filter((col) => col.visible)
)

const visibleDetailColumns = computed(() =>
  tableState.detailColumns.value.filter((col) => col.visible)
)

// Watch for column changes
watch(
  () => props.columns,
  (newColumns) => {
    tableState.updateColumns(newColumns)
  },
  { deep: true }
)

watch(
  () => props.detailColumns,
  (newColumns) => {
    if (newColumns) {
      tableState.updateDetailColumns(newColumns)
    }
  },
  { deep: true }
)

// Event handlers
function handleFilter(event: DataTableFilterEvent): void {
  try {
    const payload = filterUtils.createFilterPayload(event)
    emit('filter', payload)
  } catch (err) {
    handleError(err instanceof Error ? err : new Error('Failed to apply filters'))
  }
}

function handleError(err: Error): void {
  const error = err instanceof Error ? err : new Error(String(err))
  emit('error', { error })
}

function handleColumnVisibilityChange(column: ColumnDef): void {
  try {
    debug.log(DebugCategories.COLUMNS, 'Column visibility change requested', {
      field: column.field,
      visible: !column.visible
    })

    emit('column-visibility-change', { column, visible: !column.visible })
  } catch (err) {
    const error =
      err instanceof Error ? err : new Error('Failed to update column visibility')
    emit('error', { error })
  }
}

function handleColumnResize(event: { element: HTMLElement; delta: number }): void {
  try {
    const field = event.element.dataset.field
    if (!field) return

    const columns = [...tableState.columns.value]
    const column = columns.find((col) => col.field === field)
    if (column) {
      column.width = event.element.offsetWidth
      tableState.updateColumns(columns)
    }

    emit('column-resize', { element: event.element, delta: event.delta })
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Failed to resize column')
    emit('error', { error })
  }
}

function handleColumnReorder(event: { dragIndex: number; dropIndex: number }): void {
  try {
    const { dragIndex, dropIndex } = event
    const columns = [...tableState.columns.value]
    const [movedColumn] = columns.splice(dragIndex, 1)
    columns.splice(dropIndex, 0, movedColumn)

    // Update order
    columns.forEach((col, index) => {
      col.order = index
    })

    tableState.updateColumns(columns)
    emit('column-reorder', { dragIndex, dropIndex })
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Failed to reorder columns')
    emit('error', { error })
  }
}

function handleRowExpand(event: { data: T }): void {
  try {
    tableState.expandRow(event.data)
    emit('row-expand', { row: event.data })
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Failed to expand row')
    emit('error', { error })
  }
}

function handleRowCollapse(event: { data: T }): void {
  try {
    tableState.collapseRow(event.data)
    emit('row-collapse', { row: event.data })
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Failed to collapse row')
    emit('error', { error })
  }
}

function handleRetry(): void {
  emit('retry', { timestamp: Date.now() })
}
</script>

<style>
.base-table ::v-deep .p-datatable {
  background-color: var(--surface-card);
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgb(0 0 0 / 10%);
}

.base-table ::v-deep .p-datatable .p-datatable-header {
  background-color: var(--surface-section);
  border-top-left-radius: 0.5rem;
  border-top-right-radius: 0.5rem;
  padding: 0.2rem;
  border-bottom: 1px solid var(--surface-border);
  height: 3rem;
}

.base-table ::v-deep .p-datatable .p-datatable-thead > tr > th {
  background-color: var(--surface-section);
  color: var(--text-color);
  font-weight: 600;
  padding: 0.2rem;
  border-bottom: 1px solid var(--surface-border);
  height: 3rem;
}

.base-table ::v-deep .p-datatable .p-datatable-tbody > tr {
  color: var(--text-color);
  transition: background-color 0.2s;
}

.base-table ::v-deep .p-datatable .p-datatable-tbody > tr > td {
  padding: 0.2rem;
  border-bottom: 1px solid var(--surface-border);
}

.base-table ::v-deep .p-datatable .p-datatable-tbody > tr:hover {
  background-color: #f0f7ff;
}

.base-table ::v-deep .p-datatable-expanded-row > td {
  padding: 0 !important;
}

.base-table ::v-deep .p-datatable-expanded-row .p-datatable {
  margin: 0 !important;
}

.base-table
  ::v-deep
  .p-datatable-expanded-row
  .p-datatable
  .p-datatable-thead
  > tr
  > th {
  background-color: #f8f9fa;
}

.base-table ::v-deep .p-datatable-expanded-row .p-datatable .p-column-resizer {
  width: 0;
  background-color: transparent;
}

.base-table ::v-deep .p-datatable-expanded-row .p-datatable .p-column-resizer:hover {
  background-color: #e9ecef;
}
</style>
