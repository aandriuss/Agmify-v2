import { ref, computed } from 'vue'
import type { Ref } from 'vue'
import type {
  ColumnDef,
  ParameterDefinition
} from '~/components/viewer/components/tables/DataTable/composables/types'
import { useUserSettings } from '~/composables/useUserSettings'

export interface UseColumnStateOptions {
  tableId: string
  initialParentColumns: ColumnDef[]
  initialChildColumns: ColumnDef[]
  availableParentParameters: ParameterDefinition[]
  availableChildParameters: ParameterDefinition[]
}

export interface DragItem {
  item: ColumnDef | ParameterDefinition
  sourceList: 'active' | 'available'
}

export function useColumnState({
  tableId,
  initialParentColumns,
  initialChildColumns,
  availableParentParameters,
  availableChildParameters
}: UseColumnStateOptions) {
  console.log('Initializing useColumnState with:', {
    tableId,
    initialParentColumns,
    initialChildColumns
  })

  // Core state
  const currentView = ref<'parent' | 'child'>('parent')
  const parentColumns = ref<ColumnDef[]>(ensureUniqueKeys(initialParentColumns))
  const childColumns = ref<ColumnDef[]>(ensureUniqueKeys(initialChildColumns))
  const isDirty = ref(false)
  const draggedItem = ref<DragItem | null>(null)

  const { updateNamedTable } = useUserSettings()

  function ensureUniqueKeys(columns: ColumnDef[]): ColumnDef[] {
    return columns.map((col, index) => ({
      ...col,
      key: `${col.field}-${index}`, // Add unique key
      order: index
    }))
  }

  // Computed values
  const activeColumns = computed(() => {
    const columns =
      currentView.value === 'parent' ? parentColumns.value : childColumns.value
    console.log('Active columns computed:', {
      view: currentView.value,
      columns
    })
    return columns
  })

  const availableParameters = computed(() => {
    const currentParams =
      currentView.value === 'parent'
        ? availableParentParameters
        : availableChildParameters

    const activeFields = activeColumns.value.map((col) => col.field)
    return currentParams.filter((param) => !activeFields.includes(param.field))
  })

  // Methods
  const updateColumns = (columns: ColumnDef[]) => {
    console.log('Updating columns:', {
      view: currentView.value,
      newColumns: columns
    })

    const validatedColumns = ensureUniqueKeys(columns)

    const reorderedColumns = columns.map((col, index) => ({
      ...col,
      order: index
    }))

    if (currentView.value === 'parent') {
      parentColumns.value = validatedColumns
    } else {
      childColumns.value = validatedColumns
    }
    isDirty.value = true
  }

  const handleAddColumn = (column: ParameterDefinition | ColumnDef) => {
    console.log('Adding column:', column)

    const newColumn: ColumnDef = {
      ...column,
      visible: true,
      removable: true,
      order: activeColumns.value.length
    }

    updateColumns([...activeColumns.value, newColumn])
  }

  const handleRemoveColumn = (column: ColumnDef) => {
    console.log('Removing column:', column)

    if (!column.removable) return

    const newColumns = activeColumns.value.filter((col) => col.field !== column.field)
    updateColumns(newColumns)
  }

  const saveChanges = async () => {
    if (!isDirty.value) return

    try {
      await updateNamedTable(tableId, {
        parentColumns: parentColumns.value,
        childColumns: childColumns.value
      })
      isDirty.value = false
      return true
    } catch (error) {
      console.error('Failed to save column changes:', error)
      throw error
    }
  }

  const reset = () => {
    parentColumns.value = initialParentColumns
    childColumns.value = initialChildColumns
    isDirty.value = false
  }

  // Drag and Drop methods
  const handleDragStart = (
    item: ColumnDef | ParameterDefinition,
    sourceList: 'active' | 'available'
  ) => {
    console.log('Drag started:', { item, sourceList })
    draggedItem.value = { item, sourceList }
  }

  const handleDrop = (event: DragEvent) => {
    console.log('Drop handled:', { draggedItem: draggedItem.value })
    if (!draggedItem.value) return

    const { item, sourceList } = draggedItem.value

    if (sourceList === 'available') {
      const newColumn: ColumnDef = {
        ...item,
        visible: true,
        removable: true,
        order: activeColumns.value.length
      }

      if (currentView.value === 'parent') {
        parentColumns.value = [...parentColumns.value, newColumn].map((col, index) => ({
          ...col,
          order: index
        }))
      } else {
        childColumns.value = [...childColumns.value, newColumn].map((col, index) => ({
          ...col,
          order: index
        }))
      }
      isDirty.value = true
    }

    draggedItem.value = null
  }

  const handleDropToAvailable = () => {
    console.log('Drop to available:', { draggedItem: draggedItem.value })
    if (!draggedItem.value) return

    const { item, sourceList } = draggedItem.value

    if (sourceList === 'active' && 'removable' in item && item.removable) {
      const newColumns = activeColumns.value
        .filter((col) => col.field !== item.field)
        .map((col, index) => ({
          ...col,
          order: index
        }))

      if (currentView.value === 'parent') {
        parentColumns.value = newColumns
      } else {
        childColumns.value = newColumns
      }
      isDirty.value = true
    }

    draggedItem.value = null
  }

  const handleReorder = (fromIndex: number, toIndex: number) => {
    console.log('Reordering:', { fromIndex, toIndex })
    const columns = [...activeColumns.value]
    const [movedColumn] = columns.splice(fromIndex, 1)
    columns.splice(toIndex, 0, movedColumn)

    const reorderedColumns = columns.map((col, index) => ({
      ...col,
      order: index
    }))

    if (currentView.value === 'parent') {
      parentColumns.value = reorderedColumns
    } else {
      childColumns.value = reorderedColumns
    }
    isDirty.value = true
  }

  // Watch for state changes
  watch(
    [parentColumns, childColumns],
    (newVal, oldVal) => {
      console.log('Columns changed:', {
        old: oldVal,
        new: newVal
      })
      isDirty.value = true
    },
    { deep: true }
  )

  watch(currentView, (newView) => {
    console.log('View changed:', newView)
  })

  return {
    // State
    currentView,
    parentColumns,
    childColumns,
    activeColumns,
    availableParameters,
    isDirty,
    draggedItem,

    // Methods
    updateColumns,
    handleAddColumn,
    handleRemoveColumn,
    handleReorder,
    handleDragStart,
    handleDrop,
    handleDropToAvailable,
    saveChanges: async () => {
      console.log('Saving changes...')
      if (!isDirty.value) return

      try {
        await updateNamedTable(tableId, {
          parentColumns: parentColumns.value,
          childColumns: childColumns.value
        })
        isDirty.value = false
        console.log('Changes saved successfully')
        return true
      } catch (error) {
        console.error('Failed to save changes:', error)
        throw error
      }
    },
    reset: () => {
      console.log('Resetting state...')
      parentColumns.value = ensureUniqueKeys(initialParentColumns)
      childColumns.value = ensureUniqueKeys(initialChildColumns)
      isDirty.value = false
      draggedItem.value = null
    }
  }
}
