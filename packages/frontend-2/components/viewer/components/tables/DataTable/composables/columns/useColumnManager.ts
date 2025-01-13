import { computed, ref, toRaw, watch } from 'vue'
import { useParameterStore } from '~/composables/core/parameters/store/store'
import { useTableStore } from '~/composables/core/tables/store/store'
import { useUserParameterStore } from '~/composables/core/userparameters/store'
import type {
  AvailableBimParameter,
  AvailableUserParameter
} from '~/composables/core/types/parameters/parameter-states'
import type { TableColumn } from '~/composables/core/types/tables'
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
    const userParams = Object.values(toRaw(userParameterStore.state.value.parameters))

    debug.log(DebugCategories.STATE, 'User parameter store state', {
      storeState: userParameterStore.state.value,
      rawParams: userParameterStore.state.value.parameters,
      userParamsCount: userParams.length
    })

    debug.log(DebugCategories.STATE, 'Available parameters', {
      bimParams: bimParams.map((p) => ({ id: p.id, name: p.name, kind: p.kind })),
      userParams: userParams.map((p) => ({
        id: p.id,
        name: p.name,
        kind: p.kind,
        field: p.field,
        value: p.value,
        type: p.type
      })),
      selectedIds: Array.from(selectedIds),
      isParent
    })

    // Merge and filter out already selected parameters
    const filteredParams = [...bimParams, ...userParams].filter(
      (param) => !selectedIds.has(param.id)
    )

    debug.log(DebugCategories.STATE, 'Filtered parameters', {
      total: filteredParams.length,
      bimCount: filteredParams.filter((p) => p.kind === 'bim').length,
      userCount: filteredParams.filter((p) => p.kind === 'user').length
    })

    return filteredParams
  })

  // Keep for component compatibility
  function setView(view: View) {
    currentView.value = view
    tableStore.toggleView()
  }

  function handleColumnOperation(operation: ColumnOperation): void {
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
          // Add detailed debug logging
          debug.log(DebugCategories.STATE, 'Adding parameter to columns', {
            parameter: operation.parameter,
            isParent,
            kind: operation.parameter.kind,
            id: operation.parameter.id,
            name: operation.parameter.name,
            currentColumns: isParent
              ? currentTable.parentColumns
              : currentTable.childColumns
          })

          // Add column using store method
          try {
            tableStore.addColumn(operation.parameter, isParent)

            // Log the state after adding
            const updatedColumns = isParent
              ? tableStore.computed.currentTable.value?.parentColumns
              : tableStore.computed.currentTable.value?.childColumns

            debug.log(DebugCategories.STATE, 'Column added', {
              parameter: operation.parameter,
              isUserParam: operation.parameter.kind === 'user',
              currentColumnsCount: updatedColumns?.length || 0,
              addedColumn: updatedColumns?.find(
                (col) => col.parameter.id === operation.parameter.id
              )
            })
          } catch (err) {
            debug.error(DebugCategories.ERROR, 'Failed to add column', {
              error: err instanceof Error ? err : new Error('Unknown error'),
              parameter: operation.parameter,
              isUserParam: operation.parameter.kind === 'user'
            })
            throw err
          }
          break
        }
        case 'remove': {
          debug.log(DebugCategories.STATE, 'Removing column', {
            column: operation.column,
            isParent
          })
          tableStore.removeColumn(operation.column.id, isParent)
          break
        }
        case 'visibility': {
          debug.log(DebugCategories.STATE, 'Updating column visibility', {
            column: operation.column,
            visible: operation.visible,
            isParent
          })
          // Use updateTableState since there's no dedicated visibility method
          tableStore.updateTableState({
            ...(isParent
              ? {
                  parentColumns: currentTable.parentColumns.map((col) =>
                    col.id === operation.column.id
                      ? { ...col, visible: operation.visible }
                      : col
                  )
                }
              : {
                  childColumns: currentTable.childColumns.map((col) =>
                    col.id === operation.column.id
                      ? { ...col, visible: operation.visible }
                      : col
                  )
                })
          })
          break
        }
        case 'reorder': {
          debug.log(DebugCategories.STATE, 'Reordering columns', {
            fromIndex: operation.fromIndex,
            toIndex: operation.toIndex,
            isParent
          })

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

          // Perform reorder and update order values
          const [movedColumn] = columns.splice(operation.fromIndex, 1)
          columns.splice(operation.toIndex, 0, movedColumn)
          const updatedColumns = columns.map((col, index) => ({
            ...col,
            order: index
          }))

          // Update columns using store method
          tableStore.updateColumns(
            isParent ? updatedColumns : currentTable.parentColumns,
            isParent ? currentTable.childColumns : updatedColumns
          )
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
