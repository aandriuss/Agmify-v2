import { debug, DebugCategories } from '../utils/debug'
import type { ColumnDef } from '../types/tables/column-types'
import {
  type ColumnManagementOptions,
  type ManagedColumnDef,
  toManagedColumn,
  fromManagedColumn
} from '../types/tables/column-management-types'

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
    defaultSource = 'Parameters',
    defaultCategory = 'Parameters'
  } = options

  /**
   * Handles changes to column visibility
   */
  function handleColumnVisibilityChange(column: ColumnDef) {
    debug.log(DebugCategories.COLUMNS, 'Column visibility change requested', {
      column,
      visible: column.visible
    })

    try {
      if (!('field' in column)) {
        throw new Error('Invalid column definition')
      }

      // Handle parameter visibility if configured
      if (
        updateParameterVisibility &&
        'parameterRef' in column &&
        typeof column.parameterRef === 'string'
      ) {
        updateParameterVisibility(column.parameterRef, column.visible ?? true)
      }

      // Update visibility in merged columns
      const updatedTableColumns = state.mergedTableColumns.map((col) => {
        if ('field' in col && col.field === column.field) {
          return fromManagedColumn(
            toManagedColumn(
              { ...col, visible: column.visible },
              defaultSource,
              defaultCategory
            )
          )
        }
        return col
      })

      const updatedDetailColumns = state.mergedDetailColumns.map((col) => {
        if ('field' in col && col.field === column.field) {
          return fromManagedColumn(
            toManagedColumn(
              { ...col, visible: column.visible },
              defaultSource,
              defaultCategory
            )
          )
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

  /**
   * Handles changes to column order
   */
  function handleColumnOrderChange(column: ColumnDef, newOrder: number) {
    debug.log(DebugCategories.COLUMNS, 'Column order change requested', {
      column,
      newOrder
    })

    try {
      if (!('field' in column)) {
        throw new Error('Invalid column definition')
      }

      // Convert to managed columns for sorting
      const managedTableColumns = state.mergedTableColumns.map((col) =>
        toManagedColumn(col, defaultSource, defaultCategory)
      )
      const managedDetailColumns = state.mergedDetailColumns.map((col) =>
        toManagedColumn(col, defaultSource, defaultCategory)
      )

      // Sort columns
      const sortColumns = (columns: ManagedColumnDef[]) =>
        [...columns].sort((a, b) => {
          const sourceCompare = (a.source || '').localeCompare(b.source || '')
          if (sourceCompare !== 0) return sourceCompare

          if (a.field === column.field) return newOrder
          if (b.field === column.field) return -newOrder
          return (a.order || 0) - (b.order || 0)
        })

      const sortedTableColumns = sortColumns(managedTableColumns)
      const sortedDetailColumns = sortColumns(managedDetailColumns)

      // Convert back to regular columns
      const updatedTableColumns = sortedTableColumns.map(fromManagedColumn)
      const updatedDetailColumns = sortedDetailColumns.map(fromManagedColumn)

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

  /**
   * Merges parameter columns with existing columns
   */
  function mergeParameterColumns() {
    debug.log(DebugCategories.COLUMNS, 'Merging parameter columns')

    try {
      // Convert all columns to managed columns
      const managedParamColumns = state.parameterColumns.map((col) =>
        toManagedColumn(col, defaultSource, defaultCategory)
      )
      const managedTableColumns = state.currentTableColumns.map((col) =>
        toManagedColumn(col, defaultSource, defaultCategory)
      )
      const managedDetailColumns = state.currentDetailColumns.map((col) =>
        toManagedColumn(col, defaultSource, defaultCategory)
      )

      // Group parameters by source
      const paramsBySource = new Map<string, ManagedColumnDef[]>()
      managedParamColumns.forEach((col) => {
        const source = col.source || defaultSource
        if (!paramsBySource.has(source)) {
          paramsBySource.set(source, [])
        }
        paramsBySource.get(source)!.push(col)
      })

      // Sort parameters within each group
      paramsBySource.forEach((cols) => {
        cols.sort((a, b) => (a.order || 0) - (b.order || 0))
      })

      // Merge and sort columns
      const mergeAndSortColumns = (
        baseColumns: ManagedColumnDef[],
        paramColumns: ManagedColumnDef[]
      ) => {
        const merged = [
          ...baseColumns,
          ...paramColumns.filter(
            (param) =>
              !baseColumns.some((col) => 'field' in col && col.field === param.field)
          )
        ].sort((a, b) => {
          const sourceCompare = (a.source || '').localeCompare(b.source || '')
          if (sourceCompare !== 0) return sourceCompare
          return (a.order || 0) - (b.order || 0)
        })

        return merged.map(fromManagedColumn)
      }

      // Update both current and merged columns
      const updatedTableColumns = mergeAndSortColumns(
        managedTableColumns,
        managedParamColumns
      )
      const updatedDetailColumns = mergeAndSortColumns(
        managedDetailColumns,
        managedParamColumns
      )

      updateCurrentColumns(updatedTableColumns, updatedDetailColumns)
      updateMergedColumns(updatedTableColumns, updatedDetailColumns)

      debug.log(DebugCategories.COLUMNS, 'Parameter columns merged', {
        tableColumnsCount: updatedTableColumns.length,
        detailColumnsCount: updatedDetailColumns.length,
        groups: [
          ...new Set(
            [...updatedTableColumns, ...updatedDetailColumns].map(
              (c) => toManagedColumn(c, defaultSource, defaultCategory).source
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
