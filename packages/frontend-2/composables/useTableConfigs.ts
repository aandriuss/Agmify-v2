import { ref, computed } from 'vue'
import type {
  TableConfig,
  TableSettings,
  CategoryFilters,
  TableColumn
} from '~/composables/core/types'
import { useTablesState } from '~/composables/settings/tables/useTablesState'
import { useParametersState } from '~/composables/parameters/useParametersState'
import { useParameterStore } from '~/composables/core/parameters/store/store'
import { debug, DebugCategories } from '~/composables/core/utils/debug'

const LAST_SELECTED_TABLE_KEY = 'speckle:lastSelectedTableId'

/**
 * Composable for managing table configurations with parameter integration
 */
export function useTableConfigs() {
  // Table state management
  const {
    state: tablesState,
    loading: tablesLoading,
    error: tablesError,
    saveTables,
    loadTables,
    selectTable: selectTableState,
    deselectTable,
    getSelectedTable
  } = useTablesState()

  // Parameter state for integration
  const {
    parameters,
    loading: parametersLoading,
    error: parametersError,
    addParameterToTable,
    removeParameterFromTable
  } = useParametersState()

  // Initialize stores
  const parameterStore = useParameterStore()
  if (!parameterStore) {
    throw new Error('Failed to initialize parameter store')
  }

  const selectedTableId = ref<string | null>(
    localStorage.getItem(LAST_SELECTED_TABLE_KEY)
  )

  const namedTables = computed<Record<string, TableSettings>>(() => {
    const tables = tablesState.value?.tables || {}
    // Filter out default table when returning named tables
    return Object.entries(tables).reduce<Record<string, TableSettings>>(
      (acc, [key, table]) => {
        if (table.id !== 'defaultTable') {
          acc[key] = table
        }
        return acc
      },
      {}
    )
  })

  const currentTable = computed(() => getSelectedTable())

  // Get parameters for current table
  const currentTableParameters = computed(() => {
    if (!currentTable.value) return { parent: [], child: [] }
    return currentTable.value.selectedParameters || { parent: [], child: [] }
  })

  // Get available parameters for parent/child tables
  const availableParameters = computed(() => {
    if (!parameters.value) return { parent: [], child: [] }

    return {
      parent: {
        bim: parameterStore?.parentAvailableBimParameters.value || [],
        user: parameterStore?.parentAvailableUserParameters.value || []
      },
      child: {
        bim: parameterStore?.childAvailableBimParameters.value || [],
        user: parameterStore?.childAvailableUserParameters.value || []
      }
    }
  })

  const initialize = async () => {
    try {
      debug.startState(DebugCategories.INITIALIZATION, 'Initializing table configs')

      // Load tables
      await loadTables()

      // Try to select last used table
      const lastSelectedId = selectedTableId.value
      if (lastSelectedId && namedTables.value[lastSelectedId]) {
        selectTable(lastSelectedId)
      } else if (Object.keys(namedTables.value).length > 0) {
        // Select first available table
        selectTable(Object.keys(namedTables.value)[0])
      }

      debug.completeState(DebugCategories.INITIALIZATION, 'Table configs initialized')
    } catch (error) {
      debug.error(DebugCategories.ERROR, 'Failed to initialize table configs:', error)
      throw error instanceof Error
        ? error
        : new Error('Failed to initialize table configs')
    }
  }

  const createNamedTable = async (
    name: string,
    config?: Partial<Omit<TableConfig, 'id' | 'name' | 'lastUpdateTimestamp'>>
  ) => {
    try {
      debug.startState(DebugCategories.STATE, 'Creating new named table')

      const newTableId = crypto.randomUUID()
      const timestamp = Date.now()

      const newTable: TableSettings = {
        id: newTableId,
        name,
        displayName: name,
        parentColumns: config?.parentColumns || [],
        childColumns: config?.childColumns || [],
        categoryFilters: config?.categoryFilters || {
          selectedParentCategories: [],
          selectedChildCategories: []
        },
        selectedParameters: config?.selectedParameters || { parent: [], child: [] },
        metadata: config?.metadata || {},
        lastUpdateTimestamp: timestamp
      }

      const updatedTables = {
        ...namedTables.value,
        [newTableId]: newTable
      }

      await saveTables(updatedTables)

      // Add parameter mappings if any
      if (newTable.selectedParameters) {
        const allParams = [
          ...newTable.selectedParameters.parent,
          ...newTable.selectedParameters.child
        ]
        await Promise.all(
          allParams.map((param) => addParameterToTable(param.id, newTableId))
        )
      }

      selectTable(newTableId)

      debug.completeState(DebugCategories.STATE, 'Named table created successfully')
      return newTableId
    } catch (error) {
      debug.error(DebugCategories.ERROR, 'Error creating named table:', error)
      throw error instanceof Error ? error : new Error('Failed to create named table')
    }
  }

  const updateNamedTable = async (
    tableId: string,
    updates: {
      name?: string
      displayName?: string
      description?: string
      config?: Partial<Omit<TableConfig, 'id' | 'name' | 'lastUpdateTimestamp'>>
      categoryFilters?: CategoryFilters
    }
  ) => {
    try {
      debug.startState(DebugCategories.STATE, 'Updating named table', { tableId })

      const currentTable = namedTables.value[tableId]
      if (!currentTable) {
        throw new Error('Table not found')
      }

      const timestamp = Date.now()

      const updatedTable: TableSettings = {
        ...currentTable,
        name: updates.name || currentTable.name,
        displayName: updates.displayName || currentTable.displayName,
        description: updates.description,
        parentColumns: updates.config?.parentColumns || currentTable.parentColumns,
        childColumns: updates.config?.childColumns || currentTable.childColumns,
        categoryFilters: updates.categoryFilters || currentTable.categoryFilters,
        selectedParameters:
          updates.config?.selectedParameters || currentTable.selectedParameters,
        metadata: {
          ...currentTable.metadata,
          ...(updates.config?.metadata || {})
        },
        lastUpdateTimestamp: timestamp
      }

      // Update parameter mappings if they changed
      if (updates.config?.selectedParameters) {
        const newParams = [
          ...updates.config.selectedParameters.parent,
          ...updates.config.selectedParameters.child
        ]
        const oldParams = [
          ...currentTable.selectedParameters.parent,
          ...currentTable.selectedParameters.child
        ]

        const addedParams = newParams.filter(
          (param) => !oldParams.find((p) => p.id === param.id)
        )
        const removedParams = oldParams.filter(
          (param) => !newParams.find((p) => p.id === param.id)
        )

        await Promise.all([
          ...addedParams.map((param) => addParameterToTable(param.id, tableId)),
          ...removedParams.map((param) => removeParameterFromTable(param.id, tableId))
        ])
      }

      const updatedTables = {
        ...namedTables.value,
        [tableId]: updatedTable
      }

      await saveTables(updatedTables)
      debug.completeState(DebugCategories.STATE, 'Named table updated successfully')
    } catch (error) {
      debug.error(DebugCategories.ERROR, 'Error updating named table:', error)
      throw error instanceof Error ? error : new Error('Failed to update named table')
    }
  }

  const updateTableColumns = async (
    tableId: string,
    parentColumns: TableColumn[],
    childColumns: TableColumn[]
  ) => {
    try {
      debug.startState(DebugCategories.STATE, 'Updating table columns', { tableId })

      const table = namedTables.value[tableId]
      if (!table) {
        throw new Error('Table not found')
      }

      await updateNamedTable(tableId, {
        config: {
          parentColumns,
          childColumns,
          selectedParameters: table.selectedParameters
        }
      })

      debug.completeState(DebugCategories.STATE, 'Table columns updated successfully')
    } catch (error) {
      debug.error(DebugCategories.ERROR, 'Error updating table columns:', error)
      throw error instanceof Error ? error : new Error('Failed to update table columns')
    }
  }

  const deleteNamedTable = async (tableId: string) => {
    try {
      debug.startState(DebugCategories.STATE, 'Deleting named table', { tableId })

      const table = namedTables.value[tableId]
      if (table) {
        // Remove all parameter mappings
        const allParams = [
          ...table.selectedParameters.parent,
          ...table.selectedParameters.child
        ]
        await Promise.all(
          allParams.map((param) => removeParameterFromTable(param.id, tableId))
        )
      }

      const { [tableId]: _, ...remainingTables } = namedTables.value

      await saveTables(remainingTables)

      if (selectedTableId.value === tableId) {
        deselectTable()
        localStorage.removeItem(LAST_SELECTED_TABLE_KEY)
      }

      debug.completeState(DebugCategories.STATE, 'Named table deleted successfully')
    } catch (error) {
      debug.error(DebugCategories.ERROR, 'Error deleting named table:', error)
      throw error instanceof Error ? error : new Error('Failed to delete named table')
    }
  }

  const selectTable = (tableId: string | null) => {
    debug.log(DebugCategories.STATE, 'Selecting table', { tableId })

    if (tableId) {
      selectTableState(tableId)
      localStorage.setItem(LAST_SELECTED_TABLE_KEY, tableId)
    } else {
      deselectTable()
      localStorage.removeItem(LAST_SELECTED_TABLE_KEY)
    }

    selectedTableId.value = tableId
  }

  return {
    // State
    namedTables,
    currentTable,
    selectedTableId,
    currentTableParameters,
    availableParameters,
    loading: tablesLoading || parametersLoading,
    error: tablesError || parametersError,

    // Operations
    initialize,
    createNamedTable,
    updateNamedTable,
    updateTableColumns,
    deleteNamedTable,
    selectTable
  }
}
