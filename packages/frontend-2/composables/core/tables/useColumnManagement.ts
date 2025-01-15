import { debug, DebugCategories } from '../utils/debug'
import type { TableColumn } from '../types/tables/table-column'

export interface ColumnManagementOptions {
  state: {
    mergedTableColumns: TableColumn[]
    mergedDetailColumns: TableColumn[]
    currentTableColumns: TableColumn[]
    currentDetailColumns: TableColumn[]
    parameterColumns: TableColumn[]
  }
  updateMergedColumns: (
    tableColumns: TableColumn[],
    detailColumns: TableColumn[]
  ) => void
  updateCurrentColumns: (
    tableColumns: TableColumn[],
    detailColumns: TableColumn[]
  ) => void
  updateParameterVisibility?: (parameterId: string, visible: boolean) => void
  handleError: (error: Error) => void
  defaultSource?: string
  defaultCategory?: string
}

/**
 * Generic column management functionality for data tables
 * Handles column visibility, ordering, and parameter integration
 */
export function useColumnManagement(options: ColumnManagementOptions) {
  const {
    state,
    updateMergedColumns,
    updateCurrentColumns,
    updateParameterVisibility,
    handleError,
    defaultSource = 'Parameters'
  } = options

  /**
   * Handles changes to column visibility
   */
  function handleColumnVisibilityChange(column: TableColumn) {
    debug.log(DebugCategories.COLUMNS, 'Column visibility change requested', {
      column,
      visible: column.visible
    })

    try {
      // Handle parameter visibility if configured
      if (updateParameterVisibility) {
        updateParameterVisibility(column.parameter.id, column.visible)
      }

      // Update visibility in merged columns
      const updatedTableColumns = state.mergedTableColumns.map((col) =>
        col.parameter.id === column.parameter.id
          ? { ...col, visible: column.visible }
          : col
      )

      const updatedDetailColumns = state.mergedDetailColumns.map((col) =>
        col.parameter.id === column.parameter.id
          ? { ...col, visible: column.visible }
          : col
      )

      // Update state
      updateMergedColumns(updatedTableColumns, updatedDetailColumns)

      debug.log(DebugCategories.COLUMNS, 'Column visibility updated', {
        id: column.parameter.id,
        visible: column.visible
      })
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to update column visibility:', err)
      handleError(
        err instanceof Error ? err : new Error('Failed to update column visibility')
      )
    }
  }

  /**
   * Handles changes to column order
   */
  function handleColumnOrderChange(column: TableColumn, newOrder: number) {
    debug.log(DebugCategories.COLUMNS, 'Column order change requested', {
      column,
      newOrder
    })

    try {
      // Sort columns by source and order
      const sortColumns = (columns: TableColumn[]) =>
        [...columns].sort((a, b) => {
          const sourceCompare = (a.parameter.group || defaultSource).localeCompare(
            b.parameter.group || defaultSource
          )
          if (sourceCompare !== 0) return sourceCompare

          if (a.parameter.id === column.parameter.id) return newOrder
          if (b.parameter.id === column.parameter.id) return -newOrder
          return a.parameter.order - b.parameter.order
        })

      const updatedTableColumns = sortColumns(state.mergedTableColumns)
      const updatedDetailColumns = sortColumns(state.mergedDetailColumns)

      // Update state
      updateMergedColumns(updatedTableColumns, updatedDetailColumns)

      debug.log(DebugCategories.COLUMNS, 'Column order updated', {
        id: column.parameter.id,
        newOrder
      })
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to update column order:', err)
      handleError(
        err instanceof Error ? err : new Error('Failed to update column order')
      )
    }
  }

  /**
   * Merges parameter columns with existing columns
   */
  function mergeParameterColumns() {
    debug.log(DebugCategories.COLUMNS, 'Merging parameter columns')

    try {
      // Group parameters by source
      const paramsBySource = new Map<string, TableColumn[]>()
      state.parameterColumns.forEach((col) => {
        const source = col.parameter.group || defaultSource
        if (!paramsBySource.has(source)) {
          paramsBySource.set(source, [])
        }
        paramsBySource.get(source)!.push(col)
      })

      // Sort parameters within each group
      paramsBySource.forEach((cols) => {
        cols.sort((a, b) => a.parameter.order - b.parameter.order)
      })

      // Merge and sort columns
      const mergeAndSortColumns = (
        baseColumns: TableColumn[],
        paramColumns: TableColumn[]
      ) => {
        return [
          ...baseColumns,
          ...paramColumns.filter(
            (param) =>
              !baseColumns.some((col) => col.parameter.id === param.parameter.id)
          )
        ].sort((a, b) => {
          const sourceCompare = (a.parameter.group || defaultSource).localeCompare(
            b.parameter.group || defaultSource
          )
          if (sourceCompare !== 0) return sourceCompare
          return a.parameter.order - b.parameter.order
        })
      }

      // Update both current and merged columns
      const updatedTableColumns = mergeAndSortColumns(
        state.currentTableColumns,
        state.parameterColumns
      )
      const updatedDetailColumns = mergeAndSortColumns(
        state.currentDetailColumns,
        state.parameterColumns
      )

      updateCurrentColumns(updatedTableColumns, updatedDetailColumns)
      updateMergedColumns(updatedTableColumns, updatedDetailColumns)

      debug.log(DebugCategories.COLUMNS, 'Parameter columns merged', {
        tableColumnsCount: updatedTableColumns.length,
        detailColumnsCount: updatedDetailColumns.length,
        groups: [
          ...new Set(
            [...updatedTableColumns, ...updatedDetailColumns].map(
              (c) => c.parameter.group || defaultSource
            )
          )
        ]
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
