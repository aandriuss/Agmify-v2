import { ref, computed } from 'vue'
import { useParameterStore } from '~/composables/core/parameters/store/store'
import { useTableStore } from '~/composables/core/tables/store/store'
import type {
  AvailableBimParameter,
  AvailableUserParameter
} from '~/composables/core/types/parameters/parameter-states'
import type { ColumnDef } from '~/composables/core/types/tables'
import { createSelectedParameter } from '~/composables/core/types/parameters/parameter-states'
import type {
  BimValueType,
  UserValueType
} from '~/composables/core/types/parameters/value-types'
import { debug, DebugCategories } from '~/composables/core/utils/debug'

type View = 'parent' | 'child'
type ColumnOperation =
  | { type: 'add'; column: AvailableBimParameter | AvailableUserParameter }
  | { type: 'remove'; column: ColumnDef }
  | { type: 'visibility'; column: ColumnDef; visible: boolean }
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
    const currentTable = tableStore.currentTable.value
    if (!currentTable) return []

    return currentView.value === 'parent'
      ? currentTable.parentColumns
      : currentTable.childColumns
  })

  // Available parameters for the current view (excluding selected ones)
  const availableParameters = computed(() => {
    const currentTable = tableStore.currentTable.value
    if (!currentTable) return []

    const isParent = currentView.value === 'parent'
    const selectedIds = new Set(
      (isParent
        ? currentTable.selectedParameters.parent
        : currentTable.selectedParameters.child
      ).map((p) => p.id)
    )

    const bimParams = isParent
      ? parameterStore.parentAvailableBimParameters.value
      : parameterStore.childAvailableBimParameters.value

    const userParams = isParent
      ? parameterStore.parentAvailableUserParameters.value
      : parameterStore.childAvailableUserParameters.value

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
          const currentTable = tableStore.currentTable.value
          if (!currentTable) return

          const selectedParams = isParent
            ? currentTable.selectedParameters.parent
            : currentTable.selectedParameters.child

          // Convert available parameter to selected parameter
          const newSelectedParam = createSelectedParameter(
            operation.column,
            selectedParams.length
          )

          const updatedParams = {
            ...currentTable.selectedParameters,
            [isParent ? 'parent' : 'child']: [...selectedParams, newSelectedParam]
          }

          await tableStore.updateSelectedParameters(updatedParams)

          columnState.value.pendingChanges.push(operation)
          break
        }
        case 'remove': {
          const currentTable = tableStore.currentTable.value
          if (!currentTable) return

          const selectedParams = isParent
            ? currentTable.selectedParameters.parent
            : currentTable.selectedParameters.child

          const updatedParams = {
            ...currentTable.selectedParameters,
            [isParent ? 'parent' : 'child']: selectedParams.filter(
              (param) => param.id !== operation.column.id
            )
          }

          await tableStore.updateSelectedParameters(updatedParams)
          columnState.value.pendingChanges.push(operation)
          break
        }
        case 'visibility': {
          const currentTable = tableStore.currentTable.value
          if (!currentTable) return

          const selectedParams = isParent
            ? currentTable.selectedParameters.parent
            : currentTable.selectedParameters.child

          const updatedParams = {
            ...currentTable.selectedParameters,
            [isParent ? 'parent' : 'child']: selectedParams.map((param) =>
              param.id === operation.column.id
                ? { ...param, visible: operation.visible }
                : param
            )
          }

          await tableStore.updateSelectedParameters(updatedParams)
          columnState.value.pendingChanges.push(operation)
          break
        }
        case 'reorder': {
          const currentTable = tableStore.currentTable.value
          if (!currentTable) return

          const selectedParams = [
            ...(isParent
              ? currentTable.selectedParameters.parent
              : currentTable.selectedParameters.child)
          ]

          // Reorder parameters
          const [movedParam] = selectedParams.splice(operation.fromIndex, 1)
          selectedParams.splice(operation.toIndex, 0, movedParam)

          // Update order values
          selectedParams.forEach((param, index) => {
            param.order = index
          })

          const updatedParams = {
            ...currentTable.selectedParameters,
            [isParent ? 'parent' : 'child']: selectedParams
          }

          await tableStore.updateSelectedParameters(updatedParams)
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
      const currentTable = tableStore.currentTable.value
      if (!currentTable) return false

      // Convert selected parameters to column definitions
      const parentColumns: ColumnDef[] = currentTable.selectedParameters.parent.map(
        (param) => {
          return {
            id: param.id,
            field: param.id,
            name: param.name,
            header: param.name,
            visible: param.visible,
            removable: true,
            order: param.order,
            description: param.description,
            category: param.category,
            value: null,
            ...(param.kind === 'bim'
              ? {
                  kind: 'bim' as const,
                  type: param.type as BimValueType,
                  sourceValue: null,
                  fetchedGroup: param.group,
                  currentGroup: param.group,
                  source: 'Parameters',
                  isFixed: false
                }
              : {
                  kind: 'user' as const,
                  type: param.type as UserValueType,
                  group: param.group
                })
          }
        }
      )

      const childColumns: ColumnDef[] = currentTable.selectedParameters.child.map(
        (param) => {
          return {
            id: param.id,
            field: param.id,
            name: param.name,
            header: param.name,
            visible: param.visible,
            removable: true,
            order: param.order,
            description: param.description,
            category: param.category,
            value: null,
            ...(param.kind === 'bim'
              ? {
                  kind: 'bim' as const,
                  type: param.type as BimValueType,
                  sourceValue: null,
                  fetchedGroup: param.group,
                  currentGroup: param.group,
                  source: 'Parameters',
                  isFixed: false
                }
              : {
                  kind: 'user' as const,
                  type: param.type as UserValueType,
                  group: param.group
                })
          }
        }
      )

      // Update table store with new columns
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
