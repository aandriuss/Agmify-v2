import { ref } from 'vue'
import type { TableColumn } from '~/composables/core/types/tables/table-column'
import type { BaseTableRow } from '~/composables/core/types'
import type {
  DataTableState,
  DataTableStateOptions
} from '~/composables/core/types/tables/table-config'
import { TableStateError } from '~/composables/core/types/errors'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import { useTableState } from './useTableState'

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
  // Initialize core table state
  const coreState = useTableState({
    tableId,
    initialColumns: initialState.detailColumns,
    onError,
    onUpdate
  })

  // UI-specific state
  const isLoading = ref(false)
  const expandedRows = ref<BaseTableRow[]>(initialState.expandedRows || [])
  const detailColumns = ref<TableColumn[]>(initialState.detailColumns || [])

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
      throw err instanceof Error
        ? new TableStateError(err.message, err)
        : new TableStateError('Failed to expand row')
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
      throw err instanceof Error
        ? new TableStateError(err.message, err)
        : new TableStateError('Failed to collapse row')
    }
  }

  // Detail column operations
  function updateDetailColumns(columns: TableColumn[]): void {
    try {
      debug.startState(DebugCategories.TABLE_UPDATES, 'Updating detail columns', {
        tableId,
        columnCount: columns.length
      })

      isLoading.value = true
      detailColumns.value = [...columns]
      onUpdate?.()

      debug.completeState(DebugCategories.TABLE_UPDATES, 'Detail columns updated')
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to update detail columns:', err)
      throw err instanceof Error
        ? new TableStateError(err.message, err)
        : new TableStateError('Failed to update detail columns')
    } finally {
      isLoading.value = false
    }
  }

  return {
    ...coreState,
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
