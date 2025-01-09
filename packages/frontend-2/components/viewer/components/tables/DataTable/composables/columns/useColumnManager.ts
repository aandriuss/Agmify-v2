import { ref, computed } from 'vue'
import { useParameterStore } from '~/composables/core/parameters/store/store'
import { useTableStore } from '~/composables/core/tables/store/store'
import type {
  AvailableBimParameter,
  AvailableUserParameter
} from '~/composables/core/types/parameters/parameter-states'
import type { TableColumn } from '~/composables/core/types/tables'
import { createTableColumn } from '~/composables/core/types/tables/table-column'
import { createSelectedParameter } from '~/composables/core/types/parameters/parameter-states'
import { debug, DebugCategories } from '~/composables/core/utils/debug'

type View = 'parent' | 'child'
type ColumnOperation =
  | { type: 'add'; column: AvailableBimParameter | AvailableUserParameter }
  | { type: 'remove'; column: TableColumn }
  | { type: 'visibility'; column: TableColumn; visible: boolean }
  | { type: 'reorder'; fromIndex: number; toIndex: number }

interface UseColumnManagerOptions {
  tableId: string
}

interface ColumnState {
  pendingChanges: ColumnOperation[]
}

export function useColumnManager(options: UseColumnManagerOptions) {
  const { tableId } = options

  // Stores
  const parameterStore = useParameterStore()
  const tableStore = useTableStore()

  // State
  const currentView = ref<View>('parent')
  const isUpdating = ref(false)
  const columnState = ref<ColumnState>({
    pendingChanges: []
  })

  // Active columns are all columns in the current view from table store
  const activeColumns = computed(() => {
    const currentTable = tableStore.computed.currentTable.value
    if (!currentTable) return []

    return currentView.value === 'parent'
      ? currentTable.parentColumns
      : currentTable.childColumns
  })

  // Available parameters for the current view (excluding selected ones)
  const availableParameters = computed(() => {
    const currentTable = tableStore.computed.currentTable.value
    if (!currentTable) return []

    const isParent = currentView.value === 'parent'
    const selectedIds = new Set(
      (isParent
        ? currentTable.selectedParameters.parent
        : currentTable.selectedParameters.child
      ).map((p) => p.id)
    )

    const bimParams = isParent
      ? parameterStore.state.value.collections.available.parent.bim
      : parameterStore.state.value.collections.available.child.bim

    const userParams = isParent
      ? parameterStore.state.value.collections.available.parent.user
      : parameterStore.state.value.collections.available.child.user

    return [...bimParams, ...userParams].filter((param) => !selectedIds.has(param.id))
  })

  // View management
  function setView(view: View) {
    debug.log(DebugCategories.COLUMN_UPDATES, 'View changed', {
      from: currentView.value,
      to: view,
      activeColumns: activeColumns.value.length,
      availableParameters: availableParameters.value.length
    })
    currentView.value = view
  }

  // Column operations
  async function handleColumnOperation(operation: ColumnOperation): Promise<void> {
    debug.startState(
      operation.type === 'add' || operation.type === 'remove'
        ? DebugCategories.SAVED_PARAMETERS
        : DebugCategories.PARAMETER_UPDATES,
      'Processing column operation',
      {
        type: operation.type,
        view: currentView.value,
        pendingChanges: columnState.value.pendingChanges.length
      }
    )

    isUpdating.value = true
    try {
      const isParent = currentView.value === 'parent'

      switch (operation.type) {
        case 'add': {
          const currentTable = tableStore.computed.currentTable.value
          if (!currentTable) return

          const selectedParams = isParent
            ? currentTable.selectedParameters.parent
            : currentTable.selectedParameters.child

          // Convert available parameter to selected parameter
          const newSelectedParam = createSelectedParameter(
            operation.column,
            selectedParams.length
          )

          // Create new column with parameter data preserved
          const newColumn = {
            ...createTableColumn(newSelectedParam),
            parameter: newSelectedParam
          }

          // Create new columns array with existing and new column
          const newColumns = isParent
            ? [...currentTable.parentColumns, newColumn]
            : [...currentTable.childColumns, newColumn]

          // Update both columns and parameters to keep them in sync
          await tableStore.updateTable({
            ...(isParent
              ? {
                  parentColumns: newColumns,
                  selectedParameters: {
                    ...currentTable.selectedParameters,
                    parent: [...selectedParams, newSelectedParam]
                  }
                }
              : {
                  childColumns: newColumns,
                  selectedParameters: {
                    ...currentTable.selectedParameters,
                    child: [...selectedParams, newSelectedParam]
                  }
                })
          })

          columnState.value.pendingChanges.push(operation)
          break
        }
        case 'remove': {
          const currentTable = tableStore.computed.currentTable.value
          if (!currentTable) return

          const selectedParams = isParent
            ? currentTable.selectedParameters.parent
            : currentTable.selectedParameters.child

          // Filter out removed parameter
          const filteredParams = selectedParams.filter(
            (param) => param.id !== operation.column.id
          )

          // Update order values
          filteredParams.forEach((param, index) => {
            param.order = index
          })

          // Filter columns to match parameters
          const filteredColumns = (
            isParent ? currentTable.parentColumns : currentTable.childColumns
          ).filter((col) => col.id !== operation.column.id)

          // Update both columns and parameters to keep them in sync
          await tableStore.updateTable({
            ...(isParent
              ? {
                  parentColumns: filteredColumns,
                  selectedParameters: {
                    ...currentTable.selectedParameters,
                    parent: filteredParams
                  }
                }
              : {
                  childColumns: filteredColumns,
                  selectedParameters: {
                    ...currentTable.selectedParameters,
                    child: filteredParams
                  }
                })
          })
          columnState.value.pendingChanges.push(operation)
          break
        }
        case 'visibility': {
          const currentTable = tableStore.computed.currentTable.value
          if (!currentTable) return

          const selectedParams = isParent
            ? currentTable.selectedParameters.parent
            : currentTable.selectedParameters.child

          // Update both parameters and columns visibility
          const updatedParams = selectedParams.map((param) =>
            param.id === operation.column.id
              ? { ...param, visible: operation.visible }
              : param
          )

          const updatedColumns = (
            isParent ? currentTable.parentColumns : currentTable.childColumns
          ).map((col) =>
            col.id === operation.column.id
              ? { ...col, visible: operation.visible }
              : col
          )

          // Update both arrays to keep them in sync
          await tableStore.updateTable({
            ...(isParent
              ? {
                  parentColumns: updatedColumns,
                  selectedParameters: {
                    ...currentTable.selectedParameters,
                    parent: updatedParams
                  }
                }
              : {
                  childColumns: updatedColumns,
                  selectedParameters: {
                    ...currentTable.selectedParameters,
                    child: updatedParams
                  }
                })
          })
          columnState.value.pendingChanges.push(operation)
          break
        }
        case 'reorder': {
          const currentTable = tableStore.computed.currentTable.value
          if (!currentTable) return

          const selectedParams = isParent
            ? currentTable.selectedParameters.parent
            : currentTable.selectedParameters.child

          // Create a new array with the current order
          const reorderedParams = [...selectedParams]

          // Validate indices
          if (
            operation.fromIndex < 0 ||
            operation.fromIndex >= reorderedParams.length ||
            operation.toIndex < 0 ||
            operation.toIndex > reorderedParams.length
          ) {
            debug.error(DebugCategories.ERROR, 'Invalid reorder indices', {
              fromIndex: operation.fromIndex,
              toIndex: operation.toIndex,
              length: reorderedParams.length
            })
            return
          }

          // Perform the reorder
          const [movedParam] = reorderedParams.splice(operation.fromIndex, 1)
          reorderedParams.splice(operation.toIndex, 0, movedParam)

          // Update order values
          reorderedParams.forEach((param, index) => {
            param.order = index
          })

          // Create reordered columns array to match parameters
          const reorderedColumns = (
            isParent ? currentTable.parentColumns : currentTable.childColumns
          ).slice()
          const [movedColumn] = reorderedColumns.splice(operation.fromIndex, 1)
          reorderedColumns.splice(operation.toIndex, 0, movedColumn)

          // Update both arrays to keep them in sync
          await tableStore.updateTable({
            ...(isParent
              ? {
                  parentColumns: reorderedColumns,
                  selectedParameters: {
                    ...currentTable.selectedParameters,
                    parent: reorderedParams
                  }
                }
              : {
                  childColumns: reorderedColumns,
                  selectedParameters: {
                    ...currentTable.selectedParameters,
                    child: reorderedParams
                  }
                })
          })
          columnState.value.pendingChanges.push(operation)
          break
        }
      }

      debug.completeState(
        operation.type === 'add' || operation.type === 'remove'
          ? DebugCategories.SAVED_PARAMETERS
          : DebugCategories.PARAMETER_UPDATES,
        'Column operation completed',
        {
          operation,
          tableId,
          currentView: currentView.value
        }
      )
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      debug.error(DebugCategories.ERROR, 'Column operation failed', error)
      throw error
    } finally {
      isUpdating.value = false
    }
  }

  // Save changes
  async function saveChanges() {
    debug.startState(DebugCategories.STATE, 'Saving column changes', {
      tableId,
      pendingChanges: columnState.value.pendingChanges.length
    })

    isUpdating.value = true
    try {
      const currentTable = tableStore.computed.currentTable.value
      if (!currentTable) return false

      // Keep existing columns and only update changed ones
      const parentColumns = currentTable.selectedParameters.parent.map((param) => {
        // Find existing column for this parameter
        const existingColumn = currentTable.parentColumns.find(
          (col) => col.id === param.id
        )
        if (existingColumn) {
          // Keep existing column data but update parameter-related fields
          return {
            ...existingColumn,
            parameter: param,
            visible: param.visible,
            order: param.order
          }
        }
        // Create new column only for new parameters
        return createTableColumn(param)
      })

      const childColumns = currentTable.selectedParameters.child.map((param) => {
        // Find existing column for this parameter
        const existingColumn = currentTable.childColumns.find(
          (col) => col.id === param.id
        )
        if (existingColumn) {
          // Keep existing column data but update parameter-related fields
          return {
            ...existingColumn,
            parameter: param,
            visible: param.visible,
            order: param.order
          }
        }
        // Create new column only for new parameters
        return createTableColumn(param)
      })

      // Update table store with merged columns
      await tableStore.updateTable({
        ...currentTable,
        parentColumns,
        childColumns
      })

      // Clear pending changes after successful save
      columnState.value.pendingChanges = []

      debug.completeState(DebugCategories.STATE, 'Column changes saved', {
        tableId,
        parentColumns: parentColumns.length,
        childColumns: childColumns.length,
        selectedParameters: {
          parent: currentTable.selectedParameters.parent.length,
          child: currentTable.selectedParameters.child.length
        }
      })

      return {
        parentColumns,
        childColumns,
        selectedParameters: currentTable.selectedParameters
      }
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error('Failed to save column changes')
      debug.error(DebugCategories.ERROR, 'Error saving column changes', error)
      return false
    } finally {
      isUpdating.value = false
    }
  }

  return {
    // State
    currentView,
    isUpdating,
    columnState,
    activeColumns,
    availableParameters,

    // Methods
    setView,
    handleColumnOperation,
    saveChanges
  }
}
