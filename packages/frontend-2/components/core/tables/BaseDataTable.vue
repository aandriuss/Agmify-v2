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
      :value="tableData"
      :resizable-columns="true"
      :reorderable-columns="true"
      :striped-rows="true"
      class="p-datatable-sm shadow-sm"
      :paginator="false"
      :rows="10"
      expand-mode="row"
      data-key="id"
      :expanded-rows="expandedRows"
      @update:expanded-rows="handleExpandedRowsChange"
      @row-expand="handleRowExpand"
      @row-collapse="handleRowCollapse"
      @column-resize="handleColumnResize"
      @column-reorder="handleColumnReorder"
      @filter="handleFilter"
      @sort="handleSort"
    >
      <!-- Row Expansion Template -->
      <template #expansion="slotProps">
        <slot name="expansion" :row="slotProps.data">
          <div class="p-3">
            <DataTable
              v-if="slotProps.data.details?.length"
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
            <div v-else class="text-gray-500">No details available</div>
          </div>
        </slot>
      </template>

      <!-- Expander Column -->
      <Column
        v-if="hasExpandableRows"
        :expander="true"
        style="width: 3rem"
        :exportable="false"
      />

      <!-- Default Columns -->
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

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import type {
  DataTableFilterEvent,
  DataTableSortEvent,
  DataTableFilterMetaData,
  DataTableExpandedRows
} from 'primevue/datatable'
import type { TableColumn } from '~/composables/core/types/tables/table-column'
import type { TableEmits, ElementData } from '~/composables/core/types'
import { useTableStore } from '~/composables/core/tables/store/store'
import { useLoadingState } from '~/composables/core/tables/state/useLoadingState'

interface BaseTableProps {
  tableId: string
  tableName?: string
  data: ElementData[]
  columns: TableColumn[]
  detailColumns?: TableColumn[]
  loading?: boolean
  loadingMessage?: string
  error?: Error | null
  initialState?: {
    expandedRows?: ElementData[]
    selectedRows?: ElementData[]
  }
}

// Props with defaults
const props = withDefaults(defineProps<BaseTableProps>(), {
  tableName: 'Untitled Table',
  loading: false,
  loadingMessage: '',
  error: null,
  detailColumns: () => [],
  initialState: () => ({})
})

const emit = defineEmits<TableEmits<ElementData>>()
const tableStore = useTableStore()
const { state: loadingState } = useLoadingState()

// Computed properties for table state
const isLoading = computed(() => props.loading)
const isDataValid = computed(() => Array.isArray(props.data) && props.data.length > 0)
const hasVisibleColumns = computed(() => props.columns?.length > 0)

// Table data with type safety
const tableData = computed(() => {
  return props.data.map((row) => ({
    ...row,
    _expandable:
      row.metadata?.isParent && Array.isArray(row.details) && row.details.length > 0
  }))
})

// Expanded rows state
const expandedRows = ref<DataTableExpandedRows>({})

// Initialize expanded rows from props
if (props.initialState?.expandedRows?.length) {
  props.initialState.expandedRows.forEach((row) => {
    if (row.id && row.metadata?.isParent && row.details?.length) {
      expandedRows.value[row.id] = true
    }
  })
}

// Computed properties for columns
const visibleTableColumns = computed(
  () => props.columns?.filter((col) => col?.visible) || []
)

const visibleDetailColumns = computed(
  () => props.detailColumns?.filter((col) => col?.visible) || []
)

const hasExpandableRows = computed(() => tableData.value.some((row) => row._expandable))

// Event handlers
function handleExpandedRowsChange(value: DataTableExpandedRows): void {
  expandedRows.value = value
}

function handleRowExpand(event: { data: ElementData }): void {
  emit('row-expand', { row: event.data })
}

function handleRowCollapse(event: { data: ElementData }): void {
  emit('row-collapse', { row: event.data })
}

function handleSort(event: DataTableSortEvent): void {
  const field = event.sortField?.toString()
  if (!field) return

  const order = event.sortOrder === 1 ? 'ASC' : 'DESC'

  if (tableStore.computed.currentTable.value) {
    tableStore.updateTableState({
      ...tableStore.computed.currentTable.value,
      sort: { field, order }
    })
  }

  emit('sort', { field, order: event.sortOrder || 1 })
}

function handleFilter(event: DataTableFilterEvent): void {
  const filters = Object.entries(event.filters || {})
    .filter((entry): entry is [string, DataTableFilterMetaData] => {
      const [, meta] = entry
      return (
        typeof meta === 'object' &&
        meta !== null &&
        'value' in meta &&
        'matchMode' in meta
      )
    })
    .map(([columnId, meta]) => ({
      columnId,
      value: String(meta.value),
      operator: meta.matchMode
    }))

  if (tableStore.computed.currentTable.value) {
    tableStore.updateTableState({
      ...tableStore.computed.currentTable.value,
      filters
    })
  }

  emit('filter', { filters: event.filters || {} })
}

function handleColumnVisibilityChange(column: TableColumn): void {
  if (!column?.id) return

  emit('column-visibility-change', {
    column: {
      ...column,
      visible: !column.visible
    },
    visible: !column.visible
  })
}

function handleColumnResize(event: { element: HTMLElement; delta: number }): void {
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
}

function handleColumnReorder(event: { dragIndex: number; dropIndex: number }): void {
  const { dragIndex, dropIndex } = event
  const columns = [...props.columns]
  const [movedColumn] = columns.splice(dragIndex, 1)
  columns.splice(dropIndex, 0, movedColumn)

  const updatedColumns = columns.map((col, index) => ({
    ...col,
    order: index
  }))

  tableStore.updateColumns(updatedColumns, props.detailColumns || [])
  emit('column-reorder', { dragIndex, dropIndex })
}

function handleRetry(): void {
  emit('retry', { timestamp: Date.now() })
}

// Watch for column changes
watch(
  [() => props.columns, () => loadingState.value.phase],
  ([newColumns, phase]) => {
    if (phase !== 'complete' || !Array.isArray(newColumns)) return
    tableStore.updateColumns(newColumns, props.detailColumns || [])
  },
  { deep: true }
)

watch(
  [() => props.detailColumns, () => loadingState.value.phase],
  ([newColumns, phase]) => {
    if (phase !== 'complete' || !Array.isArray(newColumns)) return
    tableStore.updateColumns(props.columns, newColumns)
  },
  { deep: true }
)

// Error state
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
  background-color: var(--surface-ground);
}

.base-table :deep(.p-datatable-expanded-row .p-datatable) {
  margin: 0 !important;
  border: 1px solid var(--surface-border);
  border-radius: 0.5rem;
  overflow: hidden;
}

.base-table :deep(.p-datatable-expanded-row .p-datatable .p-datatable-thead > tr > th) {
  background-color: var(--surface-section);
  border-bottom: 1px solid var(--surface-border);
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

.p-row-toggler {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: background-color 0.2s;
  border-radius: 50%;
}

.p-row-toggler:hover {
  background-color: var(--surface-hover);
}

.p-row-toggler svg {
  color: var(--text-color);
}
</style>
