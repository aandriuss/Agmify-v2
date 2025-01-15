import { ref, computed } from 'vue'
import type { TableColumn } from '~/composables/core/types/tables/table-column'
import type { BaseTableRow } from '~/composables/core/types'
import type {
  DataTableState,
  DataTableStateOptions,
  FilterDef
} from '~/composables/core/types/tables/table-config'
import { TableStateError } from '~/composables/core/types/errors'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import { useTableStore } from '../store/store'

/**
 * DataTable component-specific state management
 * Extends core table state with UI-specific functionality
 */
export function useDataTableState({
  tableId,
  initialState = {},
  onError,
  onUpdate
}: DataTableStateOptions): DataTableState {
  // Initialize store
  const store = useTableStore()

  // Core state
  const columns = ref<TableColumn[]>(initialState.detailColumns || [])
  const sortField = ref<string | undefined>(undefined)
  const sortOrder = ref<number | undefined>(undefined)
  const filters = ref<Record<string, FilterDef> | undefined>(undefined)
  const error = ref<Error | null>(null)

  // UI-specific state
  const isLoading = ref(false)
  const expandedRows = ref<BaseTableRow[]>(initialState.expandedRows || [])
  const detailColumns = ref<TableColumn[]>(initialState.detailColumns || [])

  // Computed state
  const tableState = computed(() => ({
    columns: columns.value,
    sortField: sortField.value,
    sortOrder: sortOrder.value,
    filters: filters.value
  }))

  // Row operations
  function expandRow(row: BaseTableRow): void {
    try {
      debug.startState(DebugCategories.TABLE_UPDATES, 'Expanding row', {
        tableId,
        rowId: row.id
      })

      if (!expandedRows.value.some((r) => r.id === row.id)) {
        expandedRows.value.push(row)
      }

      debug.completeState(DebugCategories.TABLE_UPDATES, 'Row expanded')
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to expand row:', err)
      const error =
        err instanceof Error
          ? new TableStateError(err.message, err)
          : new TableStateError('Failed to expand row')
      onError?.(error)
      throw error
    }
  }

  function collapseRow(row: BaseTableRow): void {
    try {
      debug.startState(DebugCategories.TABLE_UPDATES, 'Collapsing row', {
        tableId,
        rowId: row.id
      })

      const index = expandedRows.value.findIndex((r) => r.id === row.id)
      if (index !== -1) {
        expandedRows.value.splice(index, 1)
      }

      debug.completeState(DebugCategories.TABLE_UPDATES, 'Row collapsed')
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to collapse row:', err)
      const error =
        err instanceof Error
          ? new TableStateError(err.message, err)
          : new TableStateError('Failed to collapse row')
      onError?.(error)
      throw error
    }
  }

  // Detail column operations
  function updateDetailColumns(newColumns: TableColumn[]): void {
    try {
      debug.startState(DebugCategories.TABLE_UPDATES, 'Updating detail columns', {
        tableId,
        columnCount: newColumns.length
      })

      isLoading.value = true
      detailColumns.value = [...newColumns]
      onUpdate?.()

      debug.completeState(DebugCategories.TABLE_UPDATES, 'Detail columns updated')
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to update detail columns:', err)
      const error =
        err instanceof Error
          ? new TableStateError(err.message, err)
          : new TableStateError('Failed to update detail columns')
      onError?.(error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // Core state operations
  function updateColumns(newColumns: TableColumn[]): void {
    try {
      debug.startState(DebugCategories.TABLE_UPDATES, 'Updating columns', {
        tableId,
        columnCount: newColumns.length
      })

      // Update local state
      columns.value = [...newColumns]

      // Update store based on current view
      if (store.currentView.value === 'parent') {
        store.updateColumns(newColumns, store.currentTable.value?.childColumns || [])
      } else {
        store.updateColumns(store.currentTable.value?.parentColumns || [], newColumns)
      }

      debug.completeState(DebugCategories.TABLE_UPDATES, 'Columns updated')
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to update columns:', err)
      const error =
        err instanceof Error
          ? new TableStateError(err.message, err)
          : new TableStateError('Failed to update columns')
      onError?.(error)
      throw error
    }
  }

  function updateSort(field: string | undefined, order: number | undefined): void {
    try {
      debug.startState(DebugCategories.TABLE_UPDATES, 'Updating sort')

      sortField.value = field
      sortOrder.value = order
      store.updateSort(field, order)

      debug.completeState(DebugCategories.TABLE_UPDATES, 'Sort updated')
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to update sort:', err)
      const error =
        err instanceof Error
          ? new TableStateError(err.message, err)
          : new TableStateError('Failed to update sort')
      onError?.(error)
      throw error
    }
  }

  function updateFilters(newFilters: Record<string, FilterDef> | undefined): void {
    try {
      debug.startState(DebugCategories.TABLE_UPDATES, 'Updating filters')

      filters.value = newFilters
      store.updateFilters(newFilters)

      debug.completeState(DebugCategories.TABLE_UPDATES, 'Filters updated')
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to update filters:', err)
      const error =
        err instanceof Error
          ? new TableStateError(err.message, err)
          : new TableStateError('Failed to update filters')
      onError?.(error)
      throw error
    }
  }

  function resetState(): void {
    try {
      debug.startState(DebugCategories.TABLE_UPDATES, 'Resetting state')

      columns.value = []
      sortField.value = undefined
      sortOrder.value = undefined
      filters.value = undefined
      error.value = null
      expandedRows.value = []
      detailColumns.value = []

      debug.completeState(DebugCategories.TABLE_UPDATES, 'State reset')
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to reset state:', err)
      const error =
        err instanceof Error
          ? new TableStateError(err.message, err)
          : new TableStateError('Failed to reset state')
      onError?.(error)
      throw error
    }
  }

  return {
    // Core state
    columns,
    sortField,
    sortOrder,
    filters,
    error,
    tableState,

    // Core methods
    updateColumns,
    updateSort,
    updateFilters,
    resetState,

    // UI state
    isLoading,
    expandedRows,
    detailColumns,

    // UI methods
    expandRow,
    collapseRow,
    updateDetailColumns
  }
}
