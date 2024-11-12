import { debug, DebugCategories } from '../utils/debug'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import type { CustomParameter } from '~/composables/useUserSettings'

interface ColumnManagementOptions {
  state: {
    currentTableColumns: ColumnDef[]
    currentDetailColumns: ColumnDef[]
    parameterColumns: ColumnDef[]
    mergedTableColumns: ColumnDef[]
    mergedDetailColumns: ColumnDef[]
    customParameters: CustomParameter[]
  }
  updateMergedColumns: (tableColumns: ColumnDef[], detailColumns: ColumnDef[]) => void
  updateCurrentColumns: (tableColumns: ColumnDef[], detailColumns: ColumnDef[]) => void
  handleError: (error: Error) => void
}

export function useColumnManagement(options: ColumnManagementOptions) {
  const { state, updateMergedColumns, updateCurrentColumns, handleError } = options

  function handleColumnVisibilityChange(column: ColumnDef) {
    debug.log(DebugCategories.COLUMNS, 'Column visibility change requested', {
      column,
      visible: column.visible
    })

    try {
      if (!('field' in column)) {
        throw new Error('Invalid column definition')
      }

      // Update visibility in merged columns
      const updatedTableColumns = state.mergedTableColumns.map((col) => {
        if ('field' in col && col.field === column.field) {
          return { ...col, visible: column.visible }
        }
        return col
      })

      const updatedDetailColumns = state.mergedDetailColumns.map((col) => {
        if ('field' in col && col.field === column.field) {
          return { ...col, visible: column.visible }
        }
        return col
      })

      // Update state
      updateMergedColumns(updatedTableColumns, updatedDetailColumns)

      debug.log(DebugCategories.COLUMNS, 'Column visibility updated', {
        field: column.field,
        visible: column.visible
      })
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to update column visibility:', err)
      handleError(
        err instanceof Error ? err : new Error('Failed to update column visibility')
      )
    }
  }

  function handleColumnOrderChange(column: ColumnDef, newOrder: number) {
    debug.log(DebugCategories.COLUMNS, 'Column order change requested', {
      column,
      newOrder
    })

    try {
      if (!('field' in column)) {
        throw new Error('Invalid column definition')
      }

      // Update order in merged columns
      const updatedTableColumns = [...state.mergedTableColumns].sort((a, b) => {
        if ('field' in a && 'field' in b) {
          if (a.field === column.field) return newOrder
          if (b.field === column.field) return -newOrder
        }
        return 0
      })

      const updatedDetailColumns = [...state.mergedDetailColumns].sort((a, b) => {
        if ('field' in a && 'field' in b) {
          if (a.field === column.field) return newOrder
          if (b.field === column.field) return -newOrder
        }
        return 0
      })

      // Update state
      updateMergedColumns(updatedTableColumns, updatedDetailColumns)

      debug.log(DebugCategories.COLUMNS, 'Column order updated', {
        field: column.field,
        newOrder
      })
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to update column order:', err)
      handleError(
        err instanceof Error ? err : new Error('Failed to update column order')
      )
    }
  }

  function mergeParameterColumns() {
    debug.log(DebugCategories.COLUMNS, 'Merging parameter columns')

    try {
      // Merge parameter columns with current columns
      const updatedTableColumns = [
        ...state.currentTableColumns,
        ...state.parameterColumns.filter((param) => {
          return !state.currentTableColumns.some(
            (col) => 'field' in col && col.field === param.field
          )
        })
      ]

      const updatedDetailColumns = [
        ...state.currentDetailColumns,
        ...state.parameterColumns.filter((param) => {
          return !state.currentDetailColumns.some(
            (col) => 'field' in col && col.field === param.field
          )
        })
      ]

      // Update both current and merged columns
      updateCurrentColumns(updatedTableColumns, updatedDetailColumns)
      updateMergedColumns(updatedTableColumns, updatedDetailColumns)

      debug.log(DebugCategories.COLUMNS, 'Parameter columns merged', {
        tableColumnsCount: updatedTableColumns.length,
        detailColumnsCount: updatedDetailColumns.length
      })
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to merge parameter columns:', err)
      handleError(
        err instanceof Error ? err : new Error('Failed to merge parameter columns')
      )
    }
  }

  return {
    handleColumnVisibilityChange,
    handleColumnOrderChange,
    mergeParameterColumns
  }
}
