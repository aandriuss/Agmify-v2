import { ref, computed } from 'vue'
import type { TableColumnDef, BaseTableRow, TableState } from '../types'
import { TableError } from '../utils'

interface UseTableStateOptions {
  tableId: string
  onError?: (error: TableError) => void
}

export function useTableState(options: UseTableStateOptions) {
  // State
  const isLoading = ref(false)
  const error = ref<Error | null>(null)
  const expandedRows = ref<BaseTableRow[]>([])
  const columns = ref<TableColumnDef[]>([])
  const detailColumns = ref<TableColumnDef[]>([])
  const sortField = ref<string | undefined>(undefined)
  const sortOrder = ref<number | undefined>(undefined)
  const filters = ref<
    Record<string, { value: unknown; matchMode: string }> | undefined
  >(undefined)

  // Computed
  const tableState = computed<TableState>(() => ({
    columns: columns.value,
    detailColumns: detailColumns.value,
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

  // State Management
  function resetState(): void {
    try {
      expandedRows.value = []
      sortField.value = undefined
      sortOrder.value = undefined
      filters.value = undefined
      error.value = null
    } catch (err) {
      handleError(err)
    }
  }

  // Column Operations
  function updateColumns(updates: {
    parentColumns: TableColumnDef[]
    childColumns: TableColumnDef[]
  }): void {
    try {
      isLoading.value = true
      columns.value = [...updates.parentColumns]
      detailColumns.value = [...updates.childColumns]
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
  function updateFilters(
    newFilters: Record<string, { value: unknown; matchMode: string }> | undefined
  ): void {
    try {
      filters.value = newFilters
    } catch (err) {
      handleError(err)
    }
  }

  return {
    // State
    isLoading,
    error,
    expandedRows,
    columns,
    detailColumns,
    sortField,
    sortOrder,
    filters,
    tableState,

    // Methods
    resetState,
    updateColumns,
    expandRow,
    collapseRow,
    updateSort,
    updateFilters
  }
}
