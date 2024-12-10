import { ref, computed } from 'vue'
import type {
  ColumnDef,
  BaseTableRow,
  TableState
} from '../../components/tables/DataTable/types'
import type { DataTableFilterMeta } from 'primevue/datatable'
import { TableError } from '~/components/tables/DataTable/utils'

interface UseViewerTableOptions {
  tableId: string
  initialParentColumns: ColumnDef[]
  initialChildColumns: ColumnDef[]
  onError?: (error: TableError) => void
}

export function useViewerTable(options: UseViewerTableOptions) {
  // State
  const isLoading = ref(false)
  const error = ref<Error | null>(null)
  const parentColumns = ref<ColumnDef[]>([...options.initialParentColumns])
  const childColumns = ref<ColumnDef[]>([...options.initialChildColumns])
  const expandedRows = ref<BaseTableRow[]>([])
  const isColumnManagerOpen = ref(false)
  const sortField = ref<string | undefined>(undefined)
  const sortOrder = ref<number | undefined>(undefined)
  const filters = ref<DataTableFilterMeta | undefined>(undefined)

  // Table State
  const tableState = computed<TableState>(() => ({
    columns: parentColumns.value,
    detailColumns: childColumns.value,
    expandedRows: expandedRows.value,
    sortField: sortField.value,
    sortOrder: sortOrder.value,
    filters: filters.value
  }))

  // Error Handler
  function handleError(err: unknown): void {
    const errorObj = err instanceof Error ? err : new Error('An unknown error occurred')
    error.value = errorObj
    options.onError?.(new TableError(errorObj.message, err))
  }

  // Column Operations
  function updateColumns(updates: {
    parentColumns: ColumnDef[]
    childColumns: ColumnDef[]
  }): void {
    try {
      isLoading.value = true
      parentColumns.value = [...updates.parentColumns]
      childColumns.value = [...updates.childColumns]
    } catch (err) {
      handleError(err)
    } finally {
      isLoading.value = false
    }
  }

  // Row Operations
  function expandRow(row: BaseTableRow): void {
    try {
      if (!expandedRows.value.some((r) => r.id === row.id)) {
        expandedRows.value.push(row)
      }
    } catch (err) {
      handleError(err)
    }
  }

  function collapseRow(row: BaseTableRow): void {
    try {
      const index = expandedRows.value.findIndex((r) => r.id === row.id)
      if (index !== -1) {
        expandedRows.value.splice(index, 1)
      }
    } catch (err) {
      handleError(err)
    }
  }

  // Column Manager Operations
  function openColumnManager(): void {
    isColumnManagerOpen.value = true
  }

  function closeColumnManager(): void {
    isColumnManagerOpen.value = false
  }

  // Sort Operations
  function updateSort(field: string | undefined, order: number | undefined): void {
    try {
      sortField.value = field
      sortOrder.value = order
    } catch (err) {
      handleError(err)
    }
  }

  // Filter Operations
  function updateFilters(newFilters: DataTableFilterMeta | undefined): void {
    try {
      filters.value = newFilters
    } catch (err) {
      handleError(err)
    }
  }

  // Reset Operations
  function reset(): void {
    try {
      parentColumns.value = [...options.initialParentColumns]
      childColumns.value = [...options.initialChildColumns]
      expandedRows.value = []
      sortField.value = undefined
      sortOrder.value = undefined
      filters.value = undefined
      error.value = null
    } catch (err) {
      handleError(err)
    }
  }

  return {
    // State
    isLoading,
    error,
    parentColumns,
    childColumns,
    expandedRows,
    isColumnManagerOpen,
    sortField,
    sortOrder,
    filters,
    tableState,

    // Column Operations
    updateColumns,

    // Row Operations
    expandRow,
    collapseRow,

    // Column Manager Operations
    openColumnManager,
    closeColumnManager,

    // Sort Operations
    updateSort,

    // Filter Operations
    updateFilters,

    // Reset Operations
    reset
  }
}
