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
              v-if="isExpandableRow(slotProps.data) && slotProps.data.details?.length"
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
      <Column v-if="hasExpandableRows" :expander="true" style="width: 3rem">
        <template #body="slotProps">
          <button
            v-if="hasDetails(slotProps.data)"
            class="p-row-toggler"
            @click="toggleRow(slotProps.data)"
          >
            <component
              :is="isRowExpanded(slotProps.data) ? ChevronDownIcon : ChevronRightIcon"
              class="h-4 w-4"
            />
          </button>
        </template>
      </Column>

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

<script setup lang="ts" generic="T extends BaseTableRow">
import { computed, ref, watch } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/vue/24/outline'
import type {
  DataTableFilterEvent,
  DataTableSortEvent,
  DataTableFilterMetaData,
  DataTableFilterMeta
} from 'primevue/datatable'
import type { TableColumn } from '~/composables/core/types/tables/table-column'
import type {
  TableSort,
  TableEmits,
  BaseTableRow,
  ExpandableTableRow
} from '~/composables/core/types'
import type { FilterDef } from '~/composables/core/types/tables/table-config'
import { useTableStore } from '~/composables/core/tables/store/store'
import { useDebug, DebugCategories } from '~/composables/core/utils/debug'
import { useLoadingState } from '~/composables/core/tables/state/useLoadingState'

// Extend TableEmits to include sort event
interface ExtendedTableEmits<T extends BaseTableRow> extends TableEmits<T> {
  (e: 'sort', payload: { sort: TableSort }): void
}

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

// Props with defaults
const props = withDefaults(defineProps<BaseTableProps<T>>(), {
  tableName: 'Untitled Table',
  loading: false,
  loadingMessage: '',
  error: null,
  detailColumns: () => [],
  initialState: () => ({})
})

// Add type for filter match modes
type FilterMatchMode =
  | 'startsWith'
  | 'contains'
  | 'notContains'
  | 'endsWith'
  | 'equals'
  | 'notEquals'
  | 'in'
  | 'lt'
  | 'lte'
  | 'gt'
  | 'gte'
  | 'between'
  | 'dateIs'
  | 'dateIsNot'
  | 'dateBefore'
  | 'dateAfter'

const debug = useDebug()

// Emits with extended type
const emit = defineEmits<ExtendedTableEmits<T>>()

// Initialize stores and loading state
const tableStore = useTableStore()
const { state: loadingState } = useLoadingState()

// Table state
const expandedRowsMap = ref<Record<string, boolean>>(
  props.initialState?.expandedRows?.reduce((acc, row) => {
    if (row.id && hasDetails(row)) acc[row.id] = true
    return acc
  }, {} as Record<string, boolean>) || {}
)

// Function to check if a row has details
function hasDetails(row: T): row is T & ExpandableTableRow {
  return isExpandableRow(row) && Array.isArray(row.details) && row.details.length > 0
}

// Function to safely check if a row is expanded
function isRowExpanded(row: T): boolean {
  return Boolean(row.id && expandedRowsMap.value[row.id])
}

// Toggle row expansion
function toggleRow(row: T): void {
  if (!row.id || !hasDetails(row)) return

  const newState = !expandedRowsMap.value[row.id]
  expandedRowsMap.value = {
    ...expandedRowsMap.value,
    [row.id]: newState
  }
}

// Handle expanded rows change with type checking
function handleExpandedRowsChange(value: unknown): void {
  if (Array.isArray(value)) {
    // Handle array case
    const newMap: Record<string, boolean> = {}
    value.forEach((row) => {
      if (isExpandableRow(row) && hasDetails(row)) {
        newMap[row.id] = true
      }
    })
    expandedRowsMap.value = newMap
  } else if (typeof value === 'object' && value !== null) {
    // Handle object case - but only keep rows that have details
    const newMap: Record<string, boolean> = {}
    Object.entries(value as Record<string, boolean>).forEach(([id, expanded]) => {
      const row = props.data.find((r) => r.id === id)
      if (row && hasDetails(row) && expanded) {
        newMap[id] = true
      }
    })
    expandedRowsMap.value = newMap
  }

  debug.log(DebugCategories.STATE, 'Expanded rows changed:', {
    expandedRowsMap: expandedRowsMap.value,
    rowsWithDetails: props.data.filter(hasDetails).length
  })
}

// Type guard for expandable rows with improved type safety
function isExpandableRow(value: unknown): value is ExpandableTableRow {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Partial<ExpandableTableRow>
  return (
    'id' in candidate &&
    typeof candidate.id === 'string' &&
    'details' in candidate &&
    Array.isArray(candidate.details)
  )
}

const hasExpandableRows = computed(() => {
  return props.data.some((row) => hasDetails(row))
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

// Type guards
function isFilterMetaData(value: unknown): value is DataTableFilterMetaData {
  return (
    typeof value === 'object' &&
    value !== null &&
    'value' in value &&
    'matchMode' in value &&
    typeof (value as DataTableFilterMetaData).value !== 'undefined' &&
    typeof (value as DataTableFilterMetaData).matchMode === 'string'
  )
}

function isValidFilterValue(value: unknown): value is string | number | boolean {
  return (
    typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
  )
}

function isValidMatchMode(value: unknown): value is FilterMatchMode {
  if (typeof value !== 'string') return false
  return [
    'startsWith',
    'contains',
    'notContains',
    'endsWith',
    'equals',
    'notEquals',
    'in',
    'lt',
    'lte',
    'gt',
    'gte',
    'between',
    'dateIs',
    'dateIsNot',
    'dateBefore',
    'dateAfter'
  ].includes(value)
}

// Event handlers with improved type safety
function handleSort(event: DataTableSortEvent): void {
  try {
    if (loadingState.value.phase !== 'complete') return

    const field = event.sortField?.toString()
    if (!field) return

    const sort: TableSort = {
      field,
      order: event.sortOrder === 1 ? 'ASC' : 'DESC'
    }

    // Update table with new sort
    if (tableStore.computed.currentTable.value) {
      tableStore.updateTableState({
        ...tableStore.computed.currentTable.value,
        sort
      })
    }

    emit('sort', { sort })
  } catch (err) {
    handleError(err instanceof Error ? err : new Error('Failed to apply sort'))
  }
}

function handleFilter(event: DataTableFilterEvent): void {
  try {
    if (loadingState.value.phase !== 'complete') return

    const filters: FilterDef[] = []
    const eventFilters = event.filters || {}

    Object.entries(eventFilters).forEach(([columnId, filterMeta]) => {
      if (isFilterMetaData(filterMeta)) {
        const value = isValidFilterValue(filterMeta.value) ? filterMeta.value : ''
        const matchMode = filterMeta.matchMode

        if (isValidFilterValue(value) && isValidMatchMode(matchMode)) {
          filters.push({
            columnId,
            value: String(value),
            operator: matchMode
          })
        }
      }
    })

    const filterMeta: DataTableFilterMeta = filters.reduce(
      (acc, filter) => ({
        ...acc,
        [filter.columnId]: {
          value: filter.value,
          matchMode: filter.operator
        }
      }),
      {} as DataTableFilterMeta
    )

    // Update table with new filters
    if (tableStore.computed.currentTable.value) {
      tableStore.updateTableState({
        ...tableStore.computed.currentTable.value,
        filters
      })
    }

    emit('filter', { filters: filterMeta })
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
  const row = event.data
  if (!row.id || !hasDetails(row)) return

  expandedRowsMap.value = {
    ...expandedRowsMap.value,
    [row.id]: true
  }
  emit('row-expand', { row })
}

function handleRowCollapse(event: { data: T }): void {
  const row = event.data
  if (!row.id || !hasDetails(row)) return

  expandedRowsMap.value = {
    ...expandedRowsMap.value,
    [row.id]: false
  }
  emit('row-collapse', { row })
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
