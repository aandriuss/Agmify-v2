import { ref, computed } from 'vue'
import { useParameterStore } from '~/composables/core/parameters/store/store'
import { useTableStore } from '~/composables/core/tables/store/store'
import type {
  AvailableBimParameter,
  AvailableUserParameter
} from '~/composables/core/types/parameters/parameter-states'
import type { TableColumn } from '~/composables/core/types/tables'
import { createTableColumn } from '~/composables/core/types/tables/table-column'
import { debug, DebugCategories } from '~/composables/core/utils/debug'

type View = 'parent' | 'child'
type ColumnOperation =
  | { type: 'add'; parameter: AvailableBimParameter | AvailableUserParameter }
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

  const parameterStore = useParameterStore()
  const tableStore = useTableStore()

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

  // Available parameters for the current view (excluding ones already in columns)
  const availableParameters = computed(() => {
    const currentTable = tableStore.computed.currentTable.value
    if (!currentTable) return []

    const isParent = currentView.value === 'parent'
    const selectedIds = new Set(
      (isParent ? currentTable.parentColumns : currentTable.childColumns).map(
        (col) => col.parameter?.id
      )
    )

    const bimParams = isParent
      ? parameterStore.state.value.collections.available.parent.bim
      : parameterStore.state.value.collections.available.child.bim

    const userParams = isParent
      ? parameterStore.state.value.collections.available.parent.user
      : parameterStore.state.value.collections.available.child.user

    return [...bimParams, ...userParams].filter((param) => !selectedIds.has(param.id))
  })

  function setView(view: View) {
    debug.log(DebugCategories.COLUMN_UPDATES, 'View changed', {
      from: currentView.value,
      to: view,
      activeColumns: activeColumns.value.length,
      availableParameters: availableParameters.value.length
    })
    currentView.value = view
  }

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
      const currentTable = tableStore.computed.currentTable.value
      if (!currentTable) return

      switch (operation.type) {
        case 'add': {
          // Create column directly from available parameter
          const order = (
            isParent ? currentTable.parentColumns : currentTable.childColumns
          ).length
          const newColumn = createTableColumn(operation.parameter, order)
          const columns = isParent
            ? [...currentTable.parentColumns, newColumn]
            : [...currentTable.childColumns, newColumn]

          // Update table with new columns
          tableStore.updateTableState({
            ...(isParent ? { parentColumns: columns } : { childColumns: columns })
          })

          columnState.value.pendingChanges.push(operation)
          break
        }
        case 'remove': {
          // Filter out removed column
          const columns = (
            isParent ? currentTable.parentColumns : currentTable.childColumns
          ).filter((col) => col.id !== operation.column.id)

          // Update table with filtered columns
          tableStore.updateTableState({
            ...(isParent ? { parentColumns: columns } : { childColumns: columns })
          })
          columnState.value.pendingChanges.push(operation)
          break
        }
        case 'visibility': {
          // Update column visibility
          const columns = (
            isParent ? currentTable.parentColumns : currentTable.childColumns
          ).map((col) =>
            col.id === operation.column.id
              ? { ...col, visible: operation.visible }
              : col
          )

          // Update table with modified columns
          tableStore.updateTableState({
            ...(isParent ? { parentColumns: columns } : { childColumns: columns })
          })
          columnState.value.pendingChanges.push(operation)
          break
        }
        case 'reorder': {
          const columns = (
            isParent ? currentTable.parentColumns : currentTable.childColumns
          ).slice()

          if (
            operation.fromIndex < 0 ||
            operation.fromIndex >= columns.length ||
            operation.toIndex < 0 ||
            operation.toIndex > columns.length
          ) {
            debug.error(DebugCategories.ERROR, 'Invalid reorder indices', {
              fromIndex: operation.fromIndex,
              toIndex: operation.toIndex,
              length: columns.length
            })
            return
          }

          // Perform reorder
          const [movedColumn] = columns.splice(operation.fromIndex, 1)
          columns.splice(operation.toIndex, 0, movedColumn)

          // Update order values
          columns.forEach((col, index) => {
            col.order = index
          })

          // Update table with reordered columns
          tableStore.updateTableState({
            ...(isParent ? { parentColumns: columns } : { childColumns: columns })
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

  function saveChanges() {
    debug.startState(DebugCategories.STATE, 'Saving column changes', {
      tableId,
      pendingChanges: columnState.value.pendingChanges.length
    })

    try {
      const currentTable = tableStore.computed.currentTable.value
      if (!currentTable) return false

      // Clear pending changes
      columnState.value.pendingChanges = []

      debug.completeState(DebugCategories.STATE, 'Column changes saved', {
        tableId,
        parentColumns: currentTable.parentColumns.length,
        childColumns: currentTable.childColumns.length
      })

      return {
        parentColumns: currentTable.parentColumns,
        childColumns: currentTable.childColumns
      }
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error('Failed to save column changes')
      debug.error(DebugCategories.ERROR, 'Error saving column changes', error)
      return false
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
