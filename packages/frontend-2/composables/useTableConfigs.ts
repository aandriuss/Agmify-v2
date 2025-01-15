import { ref, computed } from 'vue'
import type {
  TableSettings,
  TableCategoryFilters,
  TableColumn,
  TableSort,
  TableFilter
} from '~/composables/core/types'
import { useTableStore } from '~/composables/core/tables/store/store'
import { useParametersState } from '~/composables/parameters/useParametersState'
import { useParameterStore } from '~/composables/core/parameters/store/store'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import { createNewTableConfig } from '~/composables/core/tables/config/defaults'

const LAST_SELECTED_TABLE_KEY = 'speckle:lastSelectedTableId'

/**
 * Composable for managing table configurations with parameter integration
 */
export function useTableConfigs() {
  // Table state management
  const store = useTableStore()

  // Parameter state for integration
  const {
    parameters,
    loading: parametersLoading,
    error: parametersError
  } = useParametersState()

  // Initialize stores
  const parameterStore = useParameterStore()
  if (!parameterStore) {
    throw new Error('Failed to initialize parameter store')
  }

  const selectedTableId = ref<string | null>(
    localStorage.getItem(LAST_SELECTED_TABLE_KEY)
  )

  const namedTables = computed(() => {
    // Get tables from store, excluding default table
    return store.state.value.availableTables.reduce<Record<string, TableSettings>>(
      (acc, table) => {
        if (table.id !== 'defaultTable') {
          // If this is the current table, use its full settings
          if (
            store.state.value.currentTableId === table.id &&
            store.state.value.currentTable
          ) {
            acc[table.id] = store.state.value.currentTable
          } else {
            // Create a new table with default settings, preserving all properties
            acc[table.id] = createNewTableConfig(table.id, table.name)
          }
        }
        return acc
      },
      {}
    )
  })

  const currentTable = computed(() => store.state.value.currentTable)

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

      // Initialize store
      await store.initialize()

      // Try to select last used table
      const lastSelectedId = selectedTableId.value
      if (lastSelectedId && namedTables.value[lastSelectedId]) {
        await selectTable(lastSelectedId)
      } else if (Object.keys(namedTables.value).length > 0) {
        // Select first available table
        await selectTable(Object.keys(namedTables.value)[0])
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
    config?: Partial<Omit<TableSettings, 'id' | 'name' | 'lastUpdateTimestamp'>>
  ) => {
    try {
      debug.startState(DebugCategories.STATE, 'Creating new named table')

      const newTableId = crypto.randomUUID()
      const timestamp = Date.now()

      // Create new table with proper column spreading
      const newTable = createNewTableConfig(newTableId, name)

      // Apply any custom config
      if (config) {
        Object.assign(newTable, {
          ...config,
          id: newTableId, // Ensure ID is preserved
          name, // Ensure name is preserved
          displayName: name, // Ensure displayName is preserved
          lastUpdateTimestamp: timestamp // Ensure timestamp is preserved
        })
      }

      // First save the table
      await store.saveTable(newTable)

      // Then load it to ensure we have the latest state from PostgreSQL
      await store.loadTable(newTableId)

      // Finally select it
      await selectTable(newTableId)

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
      config?: Partial<Omit<TableSettings, 'id' | 'name' | 'lastUpdateTimestamp'>>
      categoryFilters?: TableCategoryFilters
      sort?: TableSort
      filters?: TableFilter[]
    }
  ) => {
    try {
      debug.startState(DebugCategories.STATE, 'Updating named table', { tableId })

      const currentTable = store.state.value.currentTable
      if (!currentTable) {
        throw new Error('Table not found')
      }

      const updatedTable: TableSettings = {
        ...currentTable,
        name: updates.name || currentTable.name,
        displayName: updates.displayName || currentTable.displayName,
        parentColumns: updates.config?.parentColumns || currentTable.parentColumns,
        childColumns: updates.config?.childColumns || currentTable.childColumns,
        categoryFilters: updates.categoryFilters || currentTable.categoryFilters,
        sort: updates.sort || currentTable.sort,
        filters: updates.filters || currentTable.filters,
        lastUpdateTimestamp: Date.now()
      }

      // Save and reload to ensure we have the latest state
      await store.saveTable(updatedTable)
      await store.loadTable(tableId)
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

      const table = store.state.value.currentTable
      if (!table) {
        throw new Error('Table not found')
      }

      const updatedTable = {
        ...table,
        parentColumns,
        childColumns,
        lastUpdateTimestamp: Date.now()
      }

      // Save and reload to ensure we have the latest state
      await store.saveTable(updatedTable)
      await store.loadTable(tableId)

      debug.completeState(DebugCategories.STATE, 'Table columns updated successfully')
    } catch (error) {
      debug.error(DebugCategories.ERROR, 'Error updating table columns:', error)
      throw error instanceof Error ? error : new Error('Failed to update table columns')
    }
  }

  const deleteNamedTable = async (tableId: string) => {
    try {
      debug.startState(DebugCategories.STATE, 'Deleting named table', { tableId })

      await store.deleteTable(tableId)

      if (selectedTableId.value === tableId) {
        await selectTable(null)
      }

      debug.completeState(DebugCategories.STATE, 'Named table deleted successfully')
    } catch (error) {
      debug.error(DebugCategories.ERROR, 'Error deleting named table:', error)
      throw error instanceof Error ? error : new Error('Failed to delete named table')
    }
  }

  const selectTable = async (tableId: string | null) => {
    debug.log(DebugCategories.STATE, 'Selecting table', { tableId })

    if (tableId) {
      await store.loadTable(tableId)
      localStorage.setItem(LAST_SELECTED_TABLE_KEY, tableId)
    } else {
      store.reset()
      localStorage.removeItem(LAST_SELECTED_TABLE_KEY)
    }

    selectedTableId.value = tableId
  }

  const updateTableSort = async (tableId: string, sort: TableSort | null) => {
    try {
      debug.startState(DebugCategories.STATE, 'Updating table sort', { tableId })

      const table = store.state.value.currentTable
      if (!table) {
        throw new Error('Table not found')
      }

      await updateNamedTable(tableId, { sort: sort || undefined })

      debug.completeState(DebugCategories.STATE, 'Table sort updated successfully')
    } catch (error) {
      debug.error(DebugCategories.ERROR, 'Error updating table sort:', error)
      throw error instanceof Error ? error : new Error('Failed to update table sort')
    }
  }

  const updateTableFilters = async (tableId: string, filters: TableFilter[]) => {
    try {
      debug.startState(DebugCategories.STATE, 'Updating table filters', { tableId })

      const table = store.state.value.currentTable
      if (!table) {
        throw new Error('Table not found')
      }

      await updateNamedTable(tableId, { filters })

      debug.completeState(DebugCategories.STATE, 'Table filters updated successfully')
    } catch (error) {
      debug.error(DebugCategories.ERROR, 'Error updating table filters:', error)
      throw error instanceof Error ? error : new Error('Failed to update table filters')
    }
  }

  const clearTableFilters = async (tableId: string) => {
    try {
      debug.startState(DebugCategories.STATE, 'Clearing table filters', { tableId })

      await updateTableFilters(tableId, [])

      debug.completeState(DebugCategories.STATE, 'Table filters cleared successfully')
    } catch (error) {
      debug.error(DebugCategories.ERROR, 'Error clearing table filters:', error)
      throw error instanceof Error ? error : new Error('Failed to clear table filters')
    }
  }

  return {
    // State
    namedTables,
    currentTable,
    selectedTableId,
    availableParameters,
    loading: computed(() => store.isLoading.value || parametersLoading),
    error: computed(() => store.error.value || parametersError),

    // Operations
    initialize,
    createNamedTable,
    updateNamedTable,
    updateTableColumns,
    deleteNamedTable,
    selectTable,
    updateTableSort,
    updateTableFilters,
    clearTableFilters
  }
}
