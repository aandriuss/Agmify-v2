import { ref, computed, watch } from 'vue'
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

interface StateVersion {
  id: string
  timestamp: number
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
  categoryFilters: {
    selectedParentCategories: string[]
    selectedChildCategories: string[]
  }
}

interface PendingOperation {
  id: string
  type:
    | 'ADD_COLUMN'
    | 'REMOVE_COLUMN'
    | 'REORDER'
    | 'UPDATE_VISIBILITY'
    | 'UPDATE_FILTERS'
  targetView: 'parent' | 'child'
  data: any
  timestamp: number
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

  // Version control
  const stateHistory = ref<StateVersion[]>([])
  const currentVersionIndex = ref(-1)
  const pendingOperations = ref<PendingOperation[]>([])
  const isDirty = ref(false)

  const draggedItem = ref<DragItem | null>(null)

  const { updateNamedTable } = useUserSettings()

  // Create initial version
  const createInitialVersion = () => {
    const version: StateVersion = {
      id: generateUniqueId(),
      timestamp: Date.now(),
      parentColumns: [...parentColumns.value],
      childColumns: [...childColumns.value],
      categoryFilters: {
        selectedParentCategories: [],
        selectedChildCategories: []
      }
    }
    stateHistory.value = [version]
    currentVersionIndex.value = 0
  }

  // Create new version
  const createVersion = (operation: PendingOperation) => {
    const version: StateVersion = {
      id: generateUniqueId(),
      timestamp: Date.now(),
      parentColumns: [...parentColumns.value],
      childColumns: [...childColumns.value],
      categoryFilters: {
        selectedParentCategories: [],
        selectedChildCategories: []
      }
    }

    // Remove any versions after current (in case of undo/redo)
    stateHistory.value = stateHistory.value.slice(0, currentVersionIndex.value + 1)
    stateHistory.value.push(version)
    currentVersionIndex.value++
    isDirty.value = true
  }

  // Optimistic update handling
  const applyOptimisticUpdate = (operation: PendingOperation) => {
    pendingOperations.value.push(operation)

    switch (operation.type) {
      case 'ADD_COLUMN':
        if (operation.targetView === 'parent') {
          parentColumns.value = [...parentColumns.value, operation.data]
        } else {
          childColumns.value = [...childColumns.value, operation.data]
        }
        break
      case 'REMOVE_COLUMN':
        if (operation.targetView === 'parent') {
          parentColumns.value = parentColumns.value.filter(
            (col) => col.field !== operation.data.field
          )
        } else {
          childColumns.value = childColumns.value.filter(
            (col) => col.field !== operation.data.field
          )
        }
        break
      case 'REORDER':
        const { fromIndex, toIndex } = operation.data
        if (operation.targetView === 'parent') {
          const cols = [...parentColumns.value]
          const [movedCol] = cols.splice(fromIndex, 1)
          cols.splice(toIndex, 0, movedCol)
          parentColumns.value = cols
        } else {
          const cols = [...childColumns.value]
          const [movedCol] = cols.splice(fromIndex, 1)
          cols.splice(toIndex, 0, movedCol)
          childColumns.value = cols
        }
        break
    }

    createVersion(operation)
  }

  const saveChanges = async () => {
    if (!isDirty.value) {
      console.log('SaveChanges - No changes to save')
      return true
    }

    console.log('SaveChanges - Starting:', {
      tableId,
      parentColumnsCount: parentColumns.value.length,
      childColumnsCount: childColumns.value.length
    })

    try {
      const result = await updateNamedTable(tableId, {
        parentColumns: parentColumns.value,
        childColumns: childColumns.value
      })

      console.log('SaveChanges - Success:', result)
      isDirty.value = false
      return true
    } catch (error) {
      console.error('SaveChanges - Failed:', error)
      throw error
    }
  }

  // Add validation before save
  const validateColumns = (columns: ColumnDef[]) => {
    return columns.every((col, index) => {
      const isValid = col.field && typeof col.order === 'number'
      if (!isValid) {
        console.error('Invalid column:', { col, index })
      }
      return isValid
    })
  }

  // Sync with backend
  const syncChanges = async () => {
    if (!isDirty.value) return

    try {
      await updateNamedTable(tableId, {
        parentColumns: parentColumns.value,
        childColumns: childColumns.value
      })
      pendingOperations.value = []
      isDirty.value = false
    } catch (error) {
      console.error('Failed to sync changes:', error)
      // Handle failure - possibly revert to last known good state
      throw error
    }
  }

  // Undo/Redo
  const canUndo = computed(() => currentVersionIndex.value > 0)
  const canRedo = computed(
    () => currentVersionIndex.value < stateHistory.value.length - 1
  )

  const undo = () => {
    if (!canUndo.value) return
    currentVersionIndex.value--
    const version = stateHistory.value[currentVersionIndex.value]
    parentColumns.value = [...version.parentColumns]
    childColumns.value = [...version.childColumns]
    isDirty.value = true
  }

  const redo = () => {
    if (!canRedo.value) return
    currentVersionIndex.value++
    const version = stateHistory.value[currentVersionIndex.value]
    parentColumns.value = [...version.parentColumns]
    childColumns.value = [...version.childColumns]
    isDirty.value = true
  }

  // Initialize
  createInitialVersion()

  // Watch for view changes
  watch(currentView, (newView) => {
    console.log('View changed:', newView)
  })

  // Watch for column changes
  watch(
    [parentColumns, childColumns],
    () => {
      isDirty.value = true
    },
    { deep: true }
  )

  function ensureUniqueKeys(columns: ColumnDef[]): ColumnDef[] {
    return columns.map((col, index) => ({
      ...col,
      key: `${col.field}-${index}`, // Add unique key
      order: index
    }))
  }

  // Computed values
  const activeColumns = computed(() => {
    console.log('Getting active columns for view:', currentView.value)
    return currentView.value === 'parent' ? parentColumns.value : childColumns.value
  })

  const availableParameters = computed(() => {
    const currentParams =
      currentView.value === 'parent'
        ? availableParentParameters
        : availableChildParameters

    const activeFields = activeColumns.value.map((col) => col.field)
    console.log('Filtering available parameters:', {
      total: currentParams.length,
      activeFields
    })

    // Filter out parameters that are already active
    return currentParams.filter((param) => !activeFields.includes(param.field))
  })

  // Methods
  const updateColumns = (columns: ColumnDef[]) => {
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
    console.log('Columns updated:', {
      view: currentView.value,
      columns: reorderedColumns
    })
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

  // Drag and Drop methods
  const handleDragStart = (
    item: ColumnDef | ParameterDefinition,
    sourceList: 'active' | 'available'
  ) => {
    console.log('Drag started:', { item, sourceList })
    draggedItem.value = { item, sourceList }
  }

  const handleDrop = (targetIndex: number) => {
    console.log('Drop handled:', { draggedItem: draggedItem.value, targetIndex })
    if (!draggedItem.value) return

    const { item, sourceList } = draggedItem.value

    if (sourceList === 'available') {
      // Only add if not already in active columns
      const isAlreadyActive = activeColumns.value.some(
        (col) => col.field === item.field
      )
      if (!isAlreadyActive) {
        const newColumn: ColumnDef = {
          ...item,
          visible: true,
          removable: true,
          order: activeColumns.value.length
        }

        const newColumns = [...activeColumns.value]
        newColumns.splice(targetIndex, 0, newColumn)
        updateColumns(newColumns)
      }
    } else if (sourceList === 'active') {
      // Handle reordering
      const sourceIndex = activeColumns.value.findIndex(
        (col) => col.field === item.field
      )
      if (sourceIndex !== -1 && sourceIndex !== targetIndex) {
        const columns = [...activeColumns.value]
        const [movedColumn] = columns.splice(sourceIndex, 1)
        columns.splice(targetIndex, 0, movedColumn)
        updateColumns(columns)
      }
    }

    draggedItem.value = null
  }

  const handleDropToAvailable = () => {
    console.log('Drop to available:', { draggedItem: draggedItem.value })
    if (!draggedItem.value) return

    const { item, sourceList } = draggedItem.value

    if (sourceList === 'active' && 'removable' in item && item.removable) {
      // Remove from active columns
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
    updateColumns(columns)
  }

  // Reset to initial state
  const reset = () => {
    parentColumns.value = initialParentColumns
    childColumns.value = initialChildColumns
    isDirty.value = false
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
    canUndo,
    canRedo,
    pendingOperations,
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
    },
    applyOptimisticUpdate,
    syncChanges,
    undo,
    redo
  }
}

function generateUniqueId(): string {
  return crypto.randomUUID()
}

function ensureUniqueKeys(columns: ColumnDef[]): ColumnDef[] {
  return columns.map((col, index) => ({
    ...col,
    key: `${col.field}-${index}`,
    order: index
  }))
}
