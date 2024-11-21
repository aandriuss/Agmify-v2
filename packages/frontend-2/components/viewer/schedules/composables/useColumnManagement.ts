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

  // Helper to ensure column properties
  function ensureColumnProperties(column: ColumnDef): ColumnDef {
    // Use existing source or default to Parameters
    const source = column.source || 'Parameters'

    return {
      ...column,
      visible: column.visible ?? true,
      removable: column.removable ?? true,
      category: column.category || 'Parameters',
      source,
      description: column.description || `${source} > ${column.header}`
    }
  }

  function handleColumnVisibilityChange(column: ColumnDef) {
    debug.log(DebugCategories.COLUMNS, 'Column visibility change requested', {
      column,
      visible: column.visible,
      source: column.source
    })

    try {
      if (!('field' in column)) {
        throw new Error('Invalid column definition')
      }

      // Update visibility in merged columns
      const updatedTableColumns = state.mergedTableColumns.map((col) => {
        if ('field' in col && col.field === column.field) {
          return ensureColumnProperties({ ...col, visible: column.visible })
        }
        return col
      })

      const updatedDetailColumns = state.mergedDetailColumns.map((col) => {
        if ('field' in col && col.field === column.field) {
          return ensureColumnProperties({ ...col, visible: column.visible })
        }
        return col
      })

      // Update state
      updateMergedColumns(updatedTableColumns, updatedDetailColumns)

      debug.log(DebugCategories.COLUMNS, 'Column visibility updated', {
        field: column.field,
        visible: column.visible,
        source: column.source
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
      newOrder,
      source: column.source
    })

    try {
      if (!('field' in column)) {
        throw new Error('Invalid column definition')
      }

      // Update order in merged columns, preserving group order
      const updatedTableColumns = [...state.mergedTableColumns]
        .map((col) => ensureColumnProperties(col))
        .sort((a, b) => {
          // First sort by source/group
          const sourceCompare = (a.source || '').localeCompare(b.source || '')
          if (sourceCompare !== 0) return sourceCompare

          // Then by order within group
          if (a.field === column.field) return newOrder
          if (b.field === column.field) return -newOrder
          return (a.order || 0) - (b.order || 0)
        })

      const updatedDetailColumns = [...state.mergedDetailColumns]
        .map((col) => ensureColumnProperties(col))
        .sort((a, b) => {
          // First sort by source/group
          const sourceCompare = (a.source || '').localeCompare(b.source || '')
          if (sourceCompare !== 0) return sourceCompare

          // Then by order within group
          if (a.field === column.field) return newOrder
          if (b.field === column.field) return -newOrder
          return (a.order || 0) - (b.order || 0)
        })

      // Update state
      updateMergedColumns(updatedTableColumns, updatedDetailColumns)

      debug.log(DebugCategories.COLUMNS, 'Column order updated', {
        field: column.field,
        newOrder,
        source: column.source
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
      // Group parameters by source
      const paramsBySource = new Map<string, ColumnDef[]>()
      state.parameterColumns
        .map((col) => ensureColumnProperties(col))
        .forEach((col) => {
          const source = col.source || 'Parameters'
          if (!paramsBySource.has(source)) {
            paramsBySource.set(source, [])
          }
          paramsBySource.get(source)!.push(col)
        })

      // Sort parameters within each group
      paramsBySource.forEach((cols) => {
        // Sort by order within the group
        cols.sort((a, b) => (a.order || 0) - (b.order || 0))
      })

      // Merge parameter columns with current columns, preserving group order
      const updatedTableColumns = [
        ...state.currentTableColumns.map((col) => ensureColumnProperties(col)),
        ...state.parameterColumns
          .filter((param) => {
            return !state.currentTableColumns.some(
              (col) => 'field' in col && col.field === param.field
            )
          })
          .map((col) => ensureColumnProperties(col))
      ].sort((a, b) => {
        // First sort by source/group
        const sourceCompare = (a.source || '').localeCompare(b.source || '')
        if (sourceCompare !== 0) return sourceCompare
        // Then by order within group
        return (a.order || 0) - (b.order || 0)
      })

      const updatedDetailColumns = [
        ...state.currentDetailColumns.map((col) => ensureColumnProperties(col)),
        ...state.parameterColumns
          .filter((param) => {
            return !state.currentDetailColumns.some(
              (col) => 'field' in col && col.field === param.field
            )
          })
          .map((col) => ensureColumnProperties(col))
      ].sort((a, b) => {
        // First sort by source/group
        const sourceCompare = (a.source || '').localeCompare(b.source || '')
        if (sourceCompare !== 0) return sourceCompare
        // Then by order within group
        return (a.order || 0) - (b.order || 0)
      })

      // Update both current and merged columns
      updateCurrentColumns(updatedTableColumns, updatedDetailColumns)
      updateMergedColumns(updatedTableColumns, updatedDetailColumns)

      debug.log(DebugCategories.COLUMNS, 'Parameter columns merged', {
        tableColumnsCount: updatedTableColumns.length,
        detailColumnsCount: updatedDetailColumns.length,
        groups: [
          ...new Set(
            [...updatedTableColumns, ...updatedDetailColumns].map((c) => c.source)
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
