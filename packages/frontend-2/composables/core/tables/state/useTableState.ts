import { ref, computed } from 'vue'
import type { TableColumn } from '~/composables/core/types/'
import type {
  CoreTableState,
  TableStateOptions,
  FilterDef
} from '~/composables/core/types/tables/table-config'
import { TableStateError } from '../../types/errors'
import { debug, DebugCategories } from '~/composables/core/utils/debug'

/**
 * Core table state management
 * Provides base functionality for all table implementations
 */
export function useTableState({
  tableId,
  initialColumns = [],
  onError,
  onUpdate
}: TableStateOptions): CoreTableState {
  // Core state
  const columns = ref<TableColumn[]>(initialColumns)
  const sortField = ref<string | undefined>(undefined)
  const sortOrder = ref<number | undefined>(undefined)
  const filters = ref<Record<string, FilterDef> | undefined>(undefined)
  const error = ref<Error | null>(null)

  // Error handling
  const handleError = (err: unknown) => {
    const tableError =
      err instanceof Error
        ? new TableStateError(err.message, err)
        : new TableStateError('Unknown error occurred')

    error.value = tableError
    onError?.(tableError)
    return tableError
  }

  // Column operations
  function updateColumns(newColumns: TableColumn[]): void {
    try {
      debug.startState(DebugCategories.TABLE_UPDATES, 'Updating columns', {
        tableId,
        columnCount: newColumns.length
      })

      columns.value = [...newColumns]
      onUpdate?.()

      debug.completeState(DebugCategories.TABLE_UPDATES, 'Columns updated')
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to update columns:', err)
      throw handleError(err)
    }
  }

  // Sort operations
  function updateSort(field: string | undefined, order: number | undefined): void {
    try {
      debug.startState(DebugCategories.TABLE_UPDATES, 'Updating sort', {
        tableId,
        field,
        order
      })

      sortField.value = field
      sortOrder.value = order
      onUpdate?.()

      debug.completeState(DebugCategories.TABLE_UPDATES, 'Sort updated')
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to update sort:', err)
      throw handleError(err)
    }
  }

  // Filter operations
  function updateFilters(newFilters: Record<string, FilterDef> | undefined): void {
    try {
      debug.startState(DebugCategories.TABLE_UPDATES, 'Updating filters', {
        tableId,
        filterCount: newFilters ? Object.keys(newFilters).length : 0
      })

      filters.value = newFilters
      onUpdate?.()

      debug.completeState(DebugCategories.TABLE_UPDATES, 'Filters updated')
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to update filters:', err)
      throw handleError(err)
    }
  }

  // Reset state
  function resetState(): void {
    try {
      debug.startState(DebugCategories.TABLE_UPDATES, 'Resetting table state', {
        tableId
      })

      columns.value = initialColumns
      sortField.value = undefined
      sortOrder.value = undefined
      filters.value = undefined
      error.value = null
      onUpdate?.()

      debug.completeState(DebugCategories.TABLE_UPDATES, 'Table state reset')
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to reset state:', err)
      throw handleError(err)
    }
  }

  // Computed state
  const tableState = computed(() => ({
    columns: columns.value,
    sortField: sortField.value,
    sortOrder: sortOrder.value,
    filters: filters.value
  }))

  return {
    // State
    columns,
    sortField,
    sortOrder,
    filters,
    error,
    tableState,

    // Methods
    updateColumns,
    updateSort,
    updateFilters,
    resetState
  }
}
