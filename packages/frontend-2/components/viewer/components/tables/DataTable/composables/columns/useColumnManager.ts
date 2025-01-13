import { computed, ref, watch } from 'vue'
import { useParameterStore } from '~/composables/core/parameters/store/store'
import { useTableStore } from '~/composables/core/tables/store/store'
import { useUserParameterStore } from '~/composables/core/userparameters/store'
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

export function useColumnManager() {
  const parameterStore = useParameterStore()
  const tableStore = useTableStore()
  const userParameterStore = useUserParameterStore()

  // Local view state that syncs with store
  const currentView = ref<View>('parent')

  // Sync with store's view
  watch(
    () => tableStore.currentView.value,
    (newView) => {
      if (newView !== currentView.value) {
        currentView.value = newView
      }
    },
    { immediate: true }
  )

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

    // Get BIM parameters from parameter store
    const bimParams = isParent
      ? parameterStore.state.value.collections.available.parent.bim
      : parameterStore.state.value.collections.available.child.bim

    // Get user parameters from user parameter store
    const userParams = Object.values(userParameterStore.state.value.parameters)

    // Merge and filter out already selected parameters
    return [...bimParams, ...userParams].filter((param) => !selectedIds.has(param.id))
  })

  // Keep for component compatibility
  function setView(view: View) {
    currentView.value = view
    tableStore.toggleView()
  }

  async function handleColumnOperation(operation: ColumnOperation): Promise<void> {
    debug.startState(
      operation.type === 'add' || operation.type === 'remove'
        ? DebugCategories.SAVED_PARAMETERS
        : DebugCategories.PARAMETER_UPDATES,
      'Processing column operation',
      {
        type: operation.type,
        view: currentView.value
      }
    )

    try {
      const isParent = currentView.value === 'parent'
      const currentTable = tableStore.computed.currentTable.value
      if (!currentTable) return

      switch (operation.type) {
        case 'add': {
          // Add debug logging
          debug.log(DebugCategories.STATE, 'Adding parameter to columns', {
            parameter: operation.parameter,
            isParent,
            kind: operation.parameter.kind
          })

          // Create column with debug logging
          const order = (
            isParent ? currentTable.parentColumns : currentTable.childColumns
          ).length
          const newColumn = createTableColumn(operation.parameter, order)

          debug.log(DebugCategories.STATE, 'Created new column', {
            column: newColumn
          })

          const columns = isParent
            ? [...currentTable.parentColumns, newColumn]
            : [...currentTable.childColumns, newColumn]

          // Update table with new columns
          await tableStore.updateTableState({
            ...(isParent ? { parentColumns: columns } : { childColumns: columns })
          })

          debug.log(DebugCategories.STATE, 'Updated table state with new column')
          break
        }
        case 'remove': {
          // Filter out removed column
          const columns = (
            isParent ? currentTable.parentColumns : currentTable.childColumns
          ).filter((col) => col.id !== operation.column.id)

          // Update table with filtered columns
          await tableStore.updateTableState({
            ...(isParent ? { parentColumns: columns } : { childColumns: columns })
          })
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
          await tableStore.updateTableState({
            ...(isParent ? { parentColumns: columns } : { childColumns: columns })
          })
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

          // Create new column objects with updated order values
          const updatedColumns = columns.map((col, index) => ({
            ...col,
            order: index
          }))

          // Update table with reordered columns
          await tableStore.updateTableState({
            ...(isParent
              ? { parentColumns: updatedColumns }
              : { childColumns: updatedColumns })
          })
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
          currentView: currentView.value
        }
      )
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      debug.error(DebugCategories.ERROR, 'Column operation failed', error)
      throw error
    }
  }

  return {
    // State
    currentView,
    activeColumns,
    availableParameters,

    // Methods
    setView,
    handleColumnOperation
  }
}
