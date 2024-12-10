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
              class="text-sm text-primary-600 hover:text-primary-700"
              @click="$emit('retry')"
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
      />
    </DataTable>
  </div>
</template>

<script setup lang="ts" generic="T extends BaseTableRow">
import { computed, watch } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import type { ColumnDef } from '~/composables/core/types'
import type { BaseTableRow } from '~/components/tables/DataTable/types'
import { useDataTableState } from '~/composables/core/tables'
import { TableStateError } from '~/composables/core/types/errors'
import { isBaseTableRow } from '~/components/tables/DataTable/types'

export interface BaseTableProps<T extends BaseTableRow> {
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
const emit = defineEmits<{
  'update:expanded-rows': [rows: T[]]
  'update:columns': [columns: ColumnDef[]]
  'update:detail-columns': [columns: ColumnDef[]]
  'update:both-columns': [
    updates: { parentColumns: ColumnDef[]; childColumns: ColumnDef[] }
  ]
  'column-reorder': [event: { dragIndex: number; dropIndex: number }]
  'column-resize': [event: { element: HTMLElement; delta: number }]
  'row-expand': [row: T]
  'row-collapse': [row: T]
  'table-updated': []
  'column-visibility-change': []
  retry: []
  error: [error: Error]
}>()

// Initialize table state
const tableState = useDataTableState({
  tableId: props.tableId,
  initialState: {
    expandedRows: props.initialState?.expandedRows,
    detailColumns: props.detailColumns
  },
  onError: (error) => emit('error', error),
  onUpdate: () => emit('table-updated')
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
const handleColumnResize = (event: { element: HTMLElement; delta: number }) => {
  try {
    const field = event.element.dataset.field
    if (!field) return

    const columns = [...tableState.columns.value]
    const column = columns.find((col) => col.field === field)
    if (column) {
      column.width = event.element.offsetWidth
      tableState.updateColumns(columns)
    }

    emit('column-resize', event)
  } catch (err) {
    const error =
      err instanceof Error
        ? new TableStateError(err.message, err)
        : new TableStateError('Failed to resize column')
    emit('error', error)
  }
}

const handleColumnReorder = (event: { dragIndex: number; dropIndex: number }) => {
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
    emit('column-reorder', event)
  } catch (err) {
    const error =
      err instanceof Error
        ? new TableStateError(err.message, err)
        : new TableStateError('Failed to reorder columns')
    emit('error', error)
  }
}

const handleRowExpand = (event: { data: unknown }) => {
  try {
    if (!isBaseTableRow(event.data)) {
      throw new TableStateError('Invalid row data')
    }
    tableState.expandRow(event.data)
    emit('row-expand', event.data as T)
  } catch (err) {
    const error =
      err instanceof Error
        ? new TableStateError(err.message, err)
        : new TableStateError('Failed to expand row')
    emit('error', error)
  }
}

const handleRowCollapse = (event: { data: unknown }) => {
  try {
    if (!isBaseTableRow(event.data)) {
      throw new TableStateError('Invalid row data')
    }
    tableState.collapseRow(event.data)
    emit('row-collapse', event.data as T)
  } catch (err) {
    const error =
      err instanceof Error
        ? new TableStateError(err.message, err)
        : new TableStateError('Failed to collapse row')
    emit('error', error)
  }
}
</script>

<style scoped>
.base-table {
  width: 100%;
  height: 100%;
}

.table-state {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.p-datatable) {
  background-color: var(--surface-card);
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgb(0 0 0 / 10%);
}

:deep(.p-datatable .p-datatable-header) {
  background-color: var(--surface-section);
  border-top-left-radius: 0.5rem;
  border-top-right-radius: 0.5rem;
  padding: 0.2rem;
  border-bottom: 1px solid var(--surface-border);
  height: 3rem;
}

:deep(.p-datatable .p-datatable-thead > tr > th) {
  background-color: var(--surface-section);
  color: var(--text-color);
  font-weight: 600;
  padding: 0.2rem;
  border-bottom: 1px solid var(--surface-border);
  height: 3rem;
}

:deep(.p-datatable .p-datatable-tbody > tr) {
  color: var(--text-color);
  transition: background-color 0.2s;
}

:deep(.p-datatable .p-datatable-tbody > tr > td) {
  padding: 0.2rem;
  border-bottom: 1px solid var(--surface-border);
}

:deep(.p-datatable .p-datatable-tbody > tr:hover) {
  background-color: #f0f7ff;
}

:deep(.p-datatable-expanded-row > td) {
  padding: 0 !important;
}

:deep(.p-datatable-expanded-row .p-datatable) {
  margin: 0 !important;
}

:deep(.p-datatable-expanded-row .p-datatable .p-datatable-thead > tr > th) {
  background-color: #f8f9fa;
}

:deep(.p-datatable-expanded-row .p-datatable .p-column-resizer) {
  width: 0;
  background-color: transparent;
}

:deep(.p-datatable-expanded-row .p-datatable .p-column-resizer:hover) {
  background-color: #e9ecef;
}
</style>
