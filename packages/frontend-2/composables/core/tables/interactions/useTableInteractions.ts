import { ref, watch } from 'vue'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import type {
  TableSettings,
  Store,
  ScheduleInitializationInstance
} from '~/composables/core/types'
import type {
  AvailableBimParameter,
  AvailableUserParameter
} from '~/composables/core/types/parameters/parameter-states'
import { createTableColumn } from '~/composables/core/types/tables/table-column'

export interface TableInteractionsState {
  selectedTableId: string
  tableName: string
  currentTable: TableSettings | null
  selectedParentCategories: string[]
  selectedChildCategories: string[]
  parentParameters: Array<AvailableBimParameter | AvailableUserParameter>
  childParameters: Array<AvailableBimParameter | AvailableUserParameter>
}

export interface TableInteractionsOptions {
  store: Store
  state: TableInteractionsState
  initComponent: ScheduleInitializationInstance
  handleError: (error: unknown) => void
  onClose?: () => void
}

/**
 * Core table interactions composable
 * Handles table management, saving, and UI state
 */
export function useTableInteractions(options: TableInteractionsOptions) {
  const { store, handleError, onClose } = options

  // Create a reactive state
  const state = ref<TableInteractionsState>({
    ...options.state
  })

  // UI State
  const showCategoryOptions = ref(false)
  const showParameterManager = ref(false)

  // UI Toggles
  const toggleCategoryOptions = () => {
    showCategoryOptions.value = !showCategoryOptions.value
  }

  const toggleParameterManager = () => {
    showParameterManager.value = !showParameterManager.value
  }

  // Event Handlers
  const handleClose = () => {
    if (onClose) {
      onClose()
    }
  }

  function validateTableName(name: string | undefined): string {
    debug.log(DebugCategories.TABLE_UPDATES, 'Validating table name', { name })
    const trimmedName = name?.trim()
    if (!trimmedName) {
      debug.error(DebugCategories.ERROR, 'Table name validation failed: empty name')
      throw new Error('Table name is required')
    }
    return trimmedName
  }

  async function updateTablesArray(tables: { id: string; name: string }[]) {
    await store.lifecycle.update({ tablesArray: tables })
  }

  function createColumnsFromParameters(
    parameters: Array<AvailableBimParameter | AvailableUserParameter>
  ) {
    return parameters.map((param, index) => {
      const column = createTableColumn(param, index)
      return {
        ...column,
        field: column.id,
        header: column.parameter.name
      }
    })
  }

  async function handleSaveTable() {
    try {
      debug.startState(DebugCategories.TABLE_UPDATES, 'Save table requested', {
        state: state.value
      })

      // Validate table name
      const trimmedName = validateTableName(state.value.tableName)

      // Get current table settings
      const currentTable = state.value.currentTable

      // Create complete table config
      const tableConfig: TableSettings = {
        id:
          state.value.selectedTableId ||
          `table_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        name: trimmedName,
        displayName: trimmedName,
        categoryFilters: {
          selectedParentCategories: state.value.selectedParentCategories || [],
          selectedChildCategories: state.value.selectedChildCategories || []
        },
        // Create columns from current parameters
        parentColumns: createColumnsFromParameters(state.value.parentParameters),
        childColumns: createColumnsFromParameters(state.value.childParameters),
        filters: currentTable?.filters || [],
        sort: currentTable?.sort,
        metadata: currentTable?.metadata,
        lastUpdateTimestamp: Date.now()
      }

      // Update table store
      await store.lifecycle.update({
        selectedTableId: tableConfig.id,
        currentTableId: tableConfig.id,
        tableName: tableConfig.name
      })

      debug.completeState(DebugCategories.TABLE_UPDATES, 'Table save complete', {
        id: state.value.selectedTableId,
        name: trimmedName
      })

      return tableConfig
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to save table')
      debug.error(DebugCategories.ERROR, 'Error saving table:', error)
      handleError(error)
      throw error
    }
  }

  // Watch for state changes from parent
  watch(
    () => options.state,
    (newState) => {
      debug.log(DebugCategories.STATE, 'Updating interactions state', {
        oldName: state.value.tableName,
        newName: newState.tableName,
        state: newState
      })

      // If switching to create new table (selectedTableId is empty)
      // Keep current settings but update the name to "New table"
      if (!newState.selectedTableId && state.value.selectedTableId) {
        state.value = {
          ...newState,
          tableName: 'New Table'
        }
      } else {
        state.value = { ...newState }
      }
    },
    { deep: true, immediate: true }
  )

  return {
    // UI State
    showCategoryOptions,
    showParameterManager,
    state,

    // UI Toggles
    toggleCategoryOptions,
    toggleParameterManager,

    // Event Handlers
    handleClose,
    handleSaveTable,
    updateTablesArray
  }
}
