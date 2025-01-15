import { ref, computed } from 'vue'
import type { TableColumn } from '~/composables/core/types/tables/table-column'
import { createTableColumn } from '~/composables/core/types/tables/table-column'
import type { SelectedParameter } from '~/composables/core/types/parameters/parameter-states'
import { debug, DebugCategories } from '~/composables/core/utils/debug'

export interface UseColumnStateOptions {
  initialParameters?: SelectedParameter[]
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
  initialParameters = [],
  onError
}: UseColumnStateOptions = {}) {
  const handleError = (err: unknown) => {
    const message = err instanceof Error ? err.message : 'An unknown error occurred'
    if (onError) onError(message)
    throw new ColumnStateError(message)
  }

  // Column state
  const columns = ref<TableColumn[]>(initialParameters.map(createTableColumn))

  // Computed properties
  const visibleColumns = computed(() => columns.value.filter((col) => col.visible))

  const sortedColumns = computed(() =>
    [...columns.value].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  )

  const columnsByField = computed(() =>
    columns.value.reduce((acc, col) => {
      acc[col.field] = col
      return acc
    }, {} as Record<string, TableColumn>)
  )

  // Column operations
  const addColumn = (parameter: SelectedParameter) => {
    try {
      if (columnsByField.value[parameter.id]) {
        throw new ColumnStateError(
          `Column for parameter ${parameter.id} already exists`
        )
      }

      debug.log(DebugCategories.COLUMNS, 'Adding new column', {
        id: parameter.id,
        name: parameter.name
      })

      const newColumn = createTableColumn({
        ...parameter,
        order: columns.value.length
      })

      columns.value = [...columns.value, newColumn]

      debug.log(DebugCategories.COLUMNS, 'Column added successfully', {
        id: newColumn.id,
        name: newColumn.header,
        order: newColumn.order
      })
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to add column:', err)
      handleError(err)
    }
  }

  const removeColumn = (id: string) => {
    try {
      const column = columnsByField.value[id]
      if (!column) {
        throw new ColumnStateError(`Column with id ${id} not found`)
      }

      columns.value = columns.value.filter((col) => col.id !== id)
      reorderColumns() // Update order after removal
    } catch (err) {
      handleError(err)
    }
  }

  const updateColumn = (id: string, parameter: SelectedParameter) => {
    try {
      const index = columns.value.findIndex((col) => col.id === id)
      if (index === -1) {
        throw new ColumnStateError(`Column with id ${id} not found`)
      }

      const updatedColumn = createTableColumn({
        ...parameter,
        order: columns.value[index].order
      })

      columns.value = [
        ...columns.value.slice(0, index),
        updatedColumn,
        ...columns.value.slice(index + 1)
      ]
    } catch (err) {
      handleError(err)
    }
  }

  const toggleVisibility = (id: string, visible?: boolean) => {
    try {
      const column = columnsByField.value[id]
      if (!column) {
        throw new ColumnStateError(`Column with id ${id} not found`)
      }

      updateColumn(id, {
        ...column.parameter,
        visible: visible ?? !column.visible
      })
    } catch (err) {
      handleError(err)
    }
  }

  const moveColumn = (id: string, toIndex: number) => {
    try {
      const fromIndex = columns.value.findIndex((col) => col.id === id)
      if (fromIndex === -1) {
        throw new ColumnStateError(`Column with id ${id} not found`)
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
      columns.value = initialParameters.map(createTableColumn)
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
