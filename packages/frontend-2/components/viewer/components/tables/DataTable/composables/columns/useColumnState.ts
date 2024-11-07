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

interface ColumnState {
  currentView: Ref<'parent' | 'child'>
  parentColumns: Ref<ColumnDef[]>
  childColumns: Ref<ColumnDef[]>
}

const initializeFromSettings = (settings) => {
  if (!settings?.namedTables?.[tableId]) return

  console.log('Initializing from settings:', {
    currentCount: parentColumns.value?.length,
    settingsCount: settings.namedTables[tableId].parentColumns?.length,
    settings: settings.namedTables[tableId]
  })

  isUpdating.value = true
  try {
    const tableSettings = settings.namedTables[tableId]
    if (tableSettings.parentColumns?.length) {
      parentColumns.value = ensureUniqueKeys(tableSettings.parentColumns)
    }
    if (tableSettings.childColumns?.length) {
      childColumns.value = ensureUniqueKeys(tableSettings.childColumns)
    }
  } finally {
    isUpdating.value = false
  }
}

export function useColumnState({
  tableId,
  initialParentColumns,
  initialChildColumns,
  availableParentParameters,
  availableChildParameters
}: {
  tableId: string
  initialParentColumns: ColumnDef[]
  initialChildColumns: ColumnDef[]
  availableParentParameters: ParameterDefinition[]
  availableChildParameters: ParameterDefinition[]
}) {
  const validateColumns = (cols: any[]): boolean =>
    Array.isArray(cols) && cols.length > 0

  // User settings
  const { settings, loadSettings, updateNamedTable } = useUserSettings()
  // View state
  const currentView = ref<'parent' | 'child'>('parent')

  // Column state
  const parentColumns = ref<ColumnDef[]>(
    validateColumns(initialParentColumns) ? initialParentColumns : []
  )
  const childColumns = ref<ColumnDef[]>(
    validateColumns(initialChildColumns) ? initialChildColumns : []
  )

  // Loading state
  const settingsLoading = ref(false)
  const isUpdating = ref(false)
  const initialized = ref(false)

  // Version control
  const stateHistory = ref<StateVersion[]>([])
  const currentVersionIndex = ref(-1)
  const pendingOperations = ref<PendingOperation[]>([])
  const isDirty = ref(false)

  const draggedItem = ref<{
    item: ColumnDef | ParameterDefinition
    sourceList: 'active' | 'available'
    sourceIndex: number
  } | null>(null)

  // Computed values
  const activeColumns = computed(() => {
    return currentView.value === 'parent' ? parentColumns.value : childColumns.value
  })

  const availableParameters = computed(() => {
    const params =
      currentView.value === 'parent'
        ? availableParentParameters
        : availableChildParameters

    console.log('Available parameters computed:', {
      view: currentView.value,
      count: params?.length,
      isArray: Array.isArray(params)
    })

    return params
  })

  async function initializeState() {
    if (settingsLoading.value) return

    settingsLoading.value = true
    try {
      await loadSettings()
      const currentSettings = settings.value?.namedTables?.[tableId]

      if (currentSettings) {
        if (currentSettings.parentColumns) {
          await updateColumns(currentSettings.parentColumns, 'parent')
        }
        if (currentSettings.childColumns) {
          await updateColumns(currentSettings.childColumns, 'child')
        }
      }
      initialized.value = true
    } finally {
      settingsLoading.value = false
    }
  }

  // Call initialize immediately
  initializeState()

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
      currentParentCount: parentColumns.value.length,
      parentColumns: parentColumns.value
    })

    isUpdating.value = true
    try {
      const columnsToSave = {
        parentColumns: parentColumns.value.map((col, index) => ({
          ...col,
          order: index,
          key: `${col.field}-${index}`,
          visible: col.visible ?? true,
          removable: col.removable ?? true
        })),
        childColumns: childColumns.value.map((col, index) => ({
          ...col,
          order: index,
          key: `${col.field}-${index}`,
          visible: col.visible ?? true,
          removable: col.removable ?? true
        }))
      }

      console.log('SaveChanges - About to save:', {
        parentColumnsCount: columnsToSave.parentColumns.length,
        columns: columnsToSave.parentColumns
      })

      const result = await updateNamedTable(tableId, columnsToSave)
      isDirty.value = false

      // Verify save
      console.log('SaveChanges - After save:', {
        savedParentCount: settings.value?.namedTables?.[tableId]?.parentColumns?.length,
        expectedCount: columnsToSave.parentColumns.length
      })

      return result
    } catch (error) {
      console.error('SaveChanges failed:', error)
      throw error
    } finally {
      isUpdating.value = false
    }
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
      if (isUpdating.value) return
      isDirty.value = true
    },
    { deep: true }
  )

  function generateUniqueId(): string {
    return crypto.randomUUID()
  }

  function ensureUniqueKeys(columns: ColumnDef[]): ColumnDef[] {
    return columns.map((col, index) => ({
      ...col,
      key: `${col.field}-${index}`, // Add unique key
      order: index
    }))
  }

  // Methods
  async function updateColumns(
    columns: ColumnDef[],
    type: 'parent' | 'child' = 'parent'
  ) {
    isUpdating.value = true
    try {
      const processedColumns = columns.map((col, index) => ({
        ...col,
        order: col.order ?? index,
        visible: col.visible ?? true,
        removable: col.removable ?? true
      }))

      if (type === 'parent') {
        parentColumns.value = processedColumns
      } else {
        childColumns.value = processedColumns
      }

      if (initialized.value) {
        await saveColumnState()
      }
    } finally {
      isUpdating.value = false
    }
  }
  // uuuu
  async function saveColumnState() {
    if (!initialized.value || isUpdating.value) return

    try {
      const currentSettings = settings.value?.namedTables?.[tableId]
      if (currentSettings) {
        await updateNamedTable(tableId, {
          ...currentSettings,
          parentColumns: parentColumns.value,
          childColumns: childColumns.value
        })
      }
    } catch (error) {
      console.error('Failed to save column state:', error)
      throw error
    }
  }

  // async function saveColumnState() {
  //   try {
  //     isUpdating.value = true
  //     const currentSettings = settings.value?.namedTables?.[tableId]
  //     if (currentSettings) {
  //       await updateNamedTable(tableId, {
  //         ...currentSettings,
  //         parentColumns: parentColumns.value,
  //         childColumns: childColumns.value
  //       })
  //     }
  //   } catch (error) {
  //     console.error('Failed to save column state:', error)
  //     throw error
  //   } finally {
  //     isUpdating.value = false
  //   }
  // }

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

  async function handleColumnRemoval(column: ColumnDef) {
    if (!column.removable) return

    isUpdating.value = true
    try {
      const currentColumns = [...activeColumns.value]
      const updatedColumns = currentColumns.filter((col) => col.field !== column.field)

      // Update the correct column set based on current view
      if (currentView.value === 'parent') {
        parentColumns.value = updatedColumns
      } else {
        childColumns.value = updatedColumns
      }

      // Ensure order is maintained
      reorderColumns(updatedColumns)
    } finally {
      isUpdating.value = false
    }
  }

  function reorderColumns(columns: ColumnDef[]) {
    return columns.map((col, index) => ({
      ...col,
      order: index
    }))
  }

  // Drag and Drop methods
  function handleDragStart(
    item: ColumnDef | ParameterDefinition,
    sourceList: 'active' | 'available',
    sourceIndex: number
  ) {
    draggedItem.value = { item, sourceList, sourceIndex }
  }

  function handleDrop(targetList: 'active' | 'available', targetIndex?: number) {
    if (!draggedItem.value) return

    const { item, sourceList, sourceIndex } = draggedItem.value

    // Handle drops between lists
    if (sourceList !== targetList) {
      if (sourceList === 'active' && targetList === 'available') {
        // Remove from active
        handleColumnRemoval(item as ColumnDef)
      } else if (sourceList === 'available' && targetList === 'active') {
        // Add to active
        const newColumn: ColumnDef = {
          ...item,
          visible: true,
          removable: true,
          order: activeColumns.value.length
        }

        if (currentView.value === 'parent') {
          parentColumns.value = [...parentColumns.value, newColumn]
        } else {
          childColumns.value = [...childColumns.value, newColumn]
        }
      }
    }
    // Handle reordering within the same list
    else if (sourceList === 'active' && targetIndex !== undefined) {
      const columns = [...activeColumns.value]
      const [moved] = columns.splice(sourceIndex, 1)
      columns.splice(targetIndex, 0, moved)

      if (currentView.value === 'parent') {
        parentColumns.value = reorderColumns(columns)
      } else {
        childColumns.value = reorderColumns(columns)
      }
    }

    draggedItem.value = null
  }

  function handleDragEnd() {
    // If item was dropped outside any valid target
    if (draggedItem.value?.sourceList === 'active') {
      handleColumnRemoval(draggedItem.value.item as ColumnDef)
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

  watch(
    parentColumns,
    (newCols, oldCols) => {
      console.log('Parent columns updated:', {
        oldColumns: oldCols?.length,
        newColumns: newCols?.length,
        firstColumn: newCols?.[0],
        source: new Error().stack // This will show us where the change is coming from
      })
    },
    { deep: true }
  )

  watch(currentView, (newView) => {
    console.log('View changed:', newView)
  })

  watch(
    parentColumns,
    (newCols) => {
      console.log('Parent columns watch triggered:', {
        count: newCols.length,
        firstColumn: newCols[0],
        allColumns: newCols,
        stack: new Error().stack // This will show us where the change is coming from
      })
    },
    { deep: true }
  )

  // Add this to debug column updates
  watch(
    parentColumns,
    (newCols, oldCols) => {
      console.log('Parent columns changed:', {
        oldCount: oldCols?.length,
        newCount: newCols?.length,
        isUpdating: isUpdating.value,
        stack: new Error().stack
      })
    },
    { deep: true }
  )

  watch(
    () => settings.value?.namedTables?.[tableId],
    async (newSettings) => {
      if (newSettings && !settingsLoading.value) {
        await initializeState()
      }
    },
    { deep: true }
  )

  watch(
    [() => parentColumns.value, () => childColumns.value],
    async () => {
      if (initialized.value && !isUpdating.value) {
        // Handle column updates
        await saveColumnState()
      }
    },
    { deep: true }
  )
  watch(
    [() => initialParentColumns, () => initialChildColumns],
    ([newParentCols, newChildCols]) => {
      if (isUpdating.value) return

      console.log('Column update watcher triggered:', {
        newParentCount: newParentCols?.length,
        newChildCount: newChildCols?.length,
        currentParentCount: parentColumns.value.length,
        currentChildCount: childColumns.value.length
      })

      if (validateColumns(newParentCols)) {
        parentColumns.value = [...newParentCols]
      }
      if (validateColumns(newChildCols)) {
        childColumns.value = [...newChildCols]
      }
    },
    { deep: true }
  )

  // Watch for external changes to initial columns
  // watch(
  //   [() => initialParentColumns, () => initialChildColumns],
  //   ([newParentCols, newChildCols]) => {
  //     if (!isUpdating.value) {
  //       if (newParentCols) parentColumns.value = [...newParentCols]
  //       if (newChildCols) childColumns.value = [...newChildCols]
  //     }
  //   },
  //   { deep: true }
  // )

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
    settings,
    settingsLoading,
    isUpdating,
    initialized,

    // Methods
    updateColumns,
    handleAddColumn,
    handleRemoveColumn,
    handleReorder,
    handleDragStart,
    handleDrop,
    handleDropToAvailable,
    saveChanges,
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
    redo,
    initializeState,

    // Utilities
    setView: (view: 'parent' | 'child') => {
      currentView.value = view
    }
  }
}
