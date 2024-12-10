import { ref, computed } from 'vue'
import type { ColumnDef } from '../../types/tables'
import { isColumnDef } from '../../types/tables/column-types'
import { toUserColumn } from '../../types/tables/column-conversion'
import { debug, DebugCategories } from '~/composables/core/utils/debug'

export interface UseColumnStateOptions {
  initialColumns?: ColumnDef[]
  onError?: (error: string) => void
}

export class ColumnStateError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ColumnStateError'
  }
}

/**
 * Column state management
 * Handles column operations, visibility, and ordering
 */
export function useColumnState({
  initialColumns = [],
  onError
}: UseColumnStateOptions = {}) {
  const handleError = (err: unknown) => {
    const message = err instanceof Error ? err.message : 'An unknown error occurred'
    if (onError) onError(message)
    throw new ColumnStateError(message)
  }

  // Column state
  const columns = ref<ColumnDef[]>(initialColumns)

  // Computed properties
  const visibleColumns = computed(() => {
    return columns.value.filter((col) => col.visible)
  })

  const sortedColumns = computed(() => {
    return [...columns.value].sort((a, b) => {
      if (typeof a.order === 'number' && typeof b.order === 'number') {
        return a.order - b.order
      }
      return 0
    })
  })

  const columnsByField = computed(() => {
    return columns.value.reduce((acc, col) => {
      acc[col.field] = col
      return acc
    }, {} as Record<string, ColumnDef>)
  })

  // Column operations
  const addColumn = (column: { field: string } & Partial<ColumnDef>) => {
    try {
      if (columnsByField.value[column.field]) {
        throw new ColumnStateError(`Column with field ${column.field} already exists`)
      }

      debug.log(DebugCategories.COLUMNS, 'Adding new column', {
        field: column.field,
        type: column.type
      })

      // Convert to UserColumnDef
      const newColumn = toUserColumn({
        ...column,
        order: columns.value.length
      })

      columns.value = [...columns.value, newColumn]

      debug.log(DebugCategories.COLUMNS, 'Column added successfully', {
        field: newColumn.field,
        type: newColumn.type,
        group: newColumn.group
      })
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to add column:', err)
      handleError(err)
    }
  }

  const removeColumn = (field: string) => {
    try {
      const column = columnsByField.value[field]
      if (!column) {
        throw new ColumnStateError(`Column with field ${field} not found`)
      }

      if (!column.removable) {
        throw new ColumnStateError(`Column ${field} cannot be removed`)
      }

      columns.value = columns.value.filter((col) => col.field !== field)
      reorderColumns() // Update order after removal
    } catch (err) {
      handleError(err)
    }
  }

  const updateColumn = (field: string, updates: Partial<ColumnDef>) => {
    try {
      const index = columns.value.findIndex((col) => col.field === field)
      if (index === -1) {
        throw new ColumnStateError(`Column with field ${field} not found`)
      }

      const currentColumn = columns.value[index]
      const updatedColumn = {
        ...currentColumn,
        ...updates,
        field, // Prevent field from being changed
        kind: currentColumn.kind // Preserve the original kind
      }

      if (!isColumnDef(updatedColumn)) {
        throw new ColumnStateError('Invalid column definition')
      }

      columns.value = [
        ...columns.value.slice(0, index),
        updatedColumn,
        ...columns.value.slice(index + 1)
      ]
    } catch (err) {
      handleError(err)
    }
  }

  const toggleVisibility = (field: string, visible?: boolean) => {
    try {
      const column = columnsByField.value[field]
      if (!column) {
        throw new ColumnStateError(`Column with field ${field} not found`)
      }

      updateColumn(field, {
        visible: visible ?? !column.visible
      })
    } catch (err) {
      handleError(err)
    }
  }

  const moveColumn = (field: string, toIndex: number) => {
    try {
      const fromIndex = columns.value.findIndex((col) => col.field === field)
      if (fromIndex === -1) {
        throw new ColumnStateError(`Column with field ${field} not found`)
      }

      const newColumns = [...columns.value]
      const [movedColumn] = newColumns.splice(fromIndex, 1)
      newColumns.splice(toIndex, 0, movedColumn)

      columns.value = newColumns
      reorderColumns() // Update order after move
    } catch (err) {
      handleError(err)
    }
  }

  const reorderColumns = () => {
    try {
      columns.value = columns.value.map((col, index) => ({
        ...col,
        order: index
      }))
    } catch (err) {
      handleError(err)
    }
  }

  const reset = () => {
    try {
      columns.value = initialColumns
    } catch (err) {
      handleError(err)
    }
  }

  return {
    // State
    columns,
    visibleColumns,
    sortedColumns,
    columnsByField,

    // Methods
    addColumn,
    removeColumn,
    updateColumn,
    toggleVisibility,
    moveColumn,
    reorderColumns,
    reset
  }
}
