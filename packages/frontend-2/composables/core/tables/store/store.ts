import { ref, computed } from 'vue'
import { isEqual } from 'lodash'
import type {
  TableStore,
  TableStoreState,
  TableSettings,
  TableStoreOptions,
  TableUIState
} from './types'
import type { TableColumn, TableCategoryFilters } from '~/composables/core/types'
import { createTableColumn } from '~/composables/core/types'
import { useTablesGraphQL } from '~/composables/settings/tables/useTablesGraphQL'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import { defaultTableConfig } from '../config/defaults'
import { useStore } from '~/composables/core/store'
import type {
  AvailableBimParameter,
  AvailableUserParameter
} from '../../types/parameters/parameter-states'

const LAST_SELECTED_TABLE_KEY = 'speckle:lastSelectedTableId'

// Storage helper with fallback
const storage = {
  getItem(key: string): string | null {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null
    } catch {
      return null
    }
  },
  setItem(key: string, value: string): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value)
      }
    } catch {
      // Ignore storage errors
    }
  },
  removeItem(key: string): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key)
      }
    } catch {
      // Ignore storage errors
    }
  }
}

/**
 * Default UI state
 */
const defaultUIState: TableUIState = {
  showCategoryOptions: false
}

/**
 * Create initial store state
 */
function createInitialState(): TableStoreState {
  return {
    availableTables: [],
    currentTableId: null,
    currentTable: null,
    originalTable: null,
    loading: false,
    error: null,
    currentView: 'parent',
    lastUpdated: Date.now(),
    ui: { ...defaultUIState }
  }
}

/**
 * Create table store
 */
function createTableStore(options: TableStoreOptions = {}): TableStore {
  // Initialize state
  const state = ref<TableStoreState>(createInitialState())
  let graphqlOps: Awaited<ReturnType<typeof useTablesGraphQL>> | null = null

  // Create default table with columns
  const defaultParentColumns = defaultTableConfig.parentColumns
  const defaultChildColumns = defaultTableConfig.childColumns

  // Use consistent default table config
  const defaultTable: TableSettings = {
    ...defaultTableConfig,
    parentColumns: defaultParentColumns,
    childColumns: defaultChildColumns,
    categoryFilters: {
      ...defaultTableConfig.categoryFilters
    },
    lastUpdateTimestamp: Date.now()
  }

  // Initialize state with available tables
  if (options.initialTables?.length) {
    state.value.availableTables = options.initialTables.map((table) => ({
      id: table.id,
      name: table.name,
      displayName: table.displayName
    }))

    // Set current table if saved ID exists
    const savedTableId = storage.getItem(LAST_SELECTED_TABLE_KEY)
    const initialTableId = savedTableId || options.initialTables[0].id
    state.value.currentTableId = initialTableId
    state.value.currentTable =
      options.initialTables.find((t) => t.id === initialTableId) || null
  } else {
    // Create default table if no tables exist
    state.value.availableTables = [
      {
        id: defaultTable.id,
        name: defaultTable.name,
        displayName: defaultTable.displayName
      }
    ]
    state.value.currentTableId = defaultTable.id
    state.value.currentTable = defaultTable
  }

  debug.log(DebugCategories.STATE, 'Store initialized', {
    availableTables: state.value.availableTables.length,
    currentTableId: state.value.currentTableId
  })

  // Computed properties for change detection
  const computedState = {
    currentTable: computed(() => state.value.currentTable),
    hasChanges: computed(() => {
      if (!state.value.currentTable) return false
      if (!state.value.originalTable) return true // New table

      // Deep compare all properties that can change
      return !isEqual(state.value.currentTable, state.value.originalTable)
    })
  }

  // Basic state refs
  const isLoading = computed(() => state.value.loading)
  const error = computed(() => state.value.error)
  const hasError = computed(() => state.value.error !== null)
  const currentView = computed(() => state.value.currentView)
  const lastUpdated = computed(() => state.value.lastUpdated)

  /**
   * Initialize GraphQL operations
   */
  async function initGraphQL() {
    try {
      debug.startState(
        DebugCategories.INITIALIZATION,
        'Initializing GraphQL operations'
      )
      graphqlOps = await useTablesGraphQL()
      debug.completeState(
        DebugCategories.INITIALIZATION,
        'GraphQL operations initialized'
      )
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error('Failed to initialize GraphQL')
      state.value.error = error
      debug.error(DebugCategories.ERROR, 'Failed to initialize GraphQL:', error)
      throw error
    }
  }

  /**
   * Toggle between parent and child view
   */
  function toggleView(): void {
    debug.startState(DebugCategories.STATE, 'Toggling view', {
      from: state.value.currentView
    })

    state.value.currentView = state.value.currentView === 'parent' ? 'child' : 'parent'
    state.value.lastUpdated = Date.now()

    debug.completeState(DebugCategories.STATE, 'View toggled', {
      to: state.value.currentView
    })
  }

  /**
   * Load table from PostgreSQL
   */
  async function loadTable(tableId: string) {
    debug.startState(DebugCategories.STATE, 'Loading table', { tableId })
    state.value.loading = true

    try {
      // Initialize GraphQL if not already done
      if (!graphqlOps) {
        await initGraphQL()
      }

      if (!graphqlOps) {
        throw new Error('GraphQL operations not initialized')
      }

      // Fetch table from PostgreSQL
      const tables = await graphqlOps.fetchTables()
      const loadedTable = tables[tableId]

      // If table exists, preserve all data
      const table = loadedTable || {
        ...defaultTableConfig,
        id: tableId,
        name: `Table ${tableId}`,
        displayName: `Table ${tableId}`,
        lastUpdateTimestamp: Date.now()
      }

      // Update store with table and set original state for change detection
      state.value.currentTable = table
      state.value.originalTable = { ...table }
      state.value.lastUpdated = Date.now()

      debug.log(DebugCategories.STATE, 'Table loaded', {
        tableId,
        fromServer: !!loadedTable
      })
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load table')
      state.value.error = error
      debug.error(DebugCategories.ERROR, 'Failed to load table:', error)
      throw error
    } finally {
      state.value.loading = false
    }
  }

  /**
   * Save table to PostgreSQL
   */
  async function saveTable(settings: TableSettings) {
    const isNewTable = !state.value.availableTables.some((t) => t.id === settings.id)
    debug.startState(DebugCategories.STATE, 'Saving table', {
      tableId: settings.id,
      isNew: isNewTable
    })
    state.value.loading = true

    try {
      // Initialize GraphQL if not already done
      if (!graphqlOps) {
        await initGraphQL()
      }

      if (!graphqlOps) {
        throw new Error('GraphQL operations not initialized')
      }

      // Ensure id is included in settings
      const tableSettings: TableSettings = {
        ...settings,
        id: settings.id // Explicitly include id
      }

      // Save to PostgreSQL
      const success = await graphqlOps.updateTables({
        [settings.id]: tableSettings
      })

      if (!success) {
        throw new Error('Failed to save table')
      }

      // Fetch all tables to ensure we have the latest list
      const tables = await graphqlOps.fetchTables()

      // Update store with saved table data from PostgreSQL
      const savedTable = tables[settings.id]
      if (!savedTable) {
        throw new Error('Saved table not found in PostgreSQL response')
      }

      // Update both current and original table state to track changes
      const updatedTable = {
        ...savedTable,
        lastUpdateTimestamp: Date.now()
      }
      state.value.currentTable = updatedTable
      state.value.originalTable = { ...updatedTable }

      // Update available tables list
      state.value.availableTables = Object.values(tables).map((table) => ({
        id: table.id,
        name: table.name,
        displayName: table.displayName
      }))

      // Update core store's tables array
      const coreStore = useStore()
      await coreStore.setTablesArray([...state.value.availableTables])

      state.value.lastUpdated = Date.now()

      debug.log(DebugCategories.STATE, 'Table saved', {
        tableId: settings.id,
        isNewTable
      })
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to save table')
      state.value.error = error
      debug.error(DebugCategories.ERROR, 'Failed to save table:', error)
      throw error
    } finally {
      state.value.loading = false
    }
  }

  /**
   * Update current table in store only
   * Does not save to PostgreSQL
   */
  async function updateTable(updates: Partial<TableSettings>): Promise<void> {
    try {
      debug.startState(DebugCategories.STATE, 'Updating table')

      if (!state.value.currentTableId || !state.value.currentTable) {
        throw new Error('No table selected')
      }

      const currentTable = state.value.currentTable
      const updatedTable: TableSettings = {
        ...currentTable,
        ...updates,
        id: currentTable.id, // Ensure id is preserved
        lastUpdateTimestamp: Date.now()
      }

      // Update current table without modifying originalTable to track unsaved changes
      state.value.currentTable = updatedTable

      // Update available tables list if name changed
      if (updates.name || updates.displayName) {
        const index = state.value.availableTables.findIndex(
          (t) => t.id === state.value.currentTableId
        )
        if (index !== -1) {
          state.value.availableTables[index] = {
            id: updatedTable.id,
            name: updatedTable.name,
            displayName: updatedTable.displayName
          }
        }
      }

      state.value.lastUpdated = Date.now()

      debug.completeState(DebugCategories.STATE, 'Table updated in store', {
        tableId: updatedTable.id,
        updates: Object.keys(updates)
      })

      // Return resolved promise since this is a synchronous operation
      return Promise.resolve()
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update table')
      state.value.error = error
      debug.error(DebugCategories.ERROR, 'Failed to update table:', error)
      throw error
    }
  }

  /**
   * Delete table from PostgreSQL
   */
  async function deleteTable(tableId: string) {
    debug.startState(DebugCategories.STATE, 'Deleting table', { tableId })
    state.value.loading = true

    try {
      // Initialize GraphQL if not already done
      if (!graphqlOps) {
        await initGraphQL()
      }

      if (!graphqlOps) {
        throw new Error('GraphQL operations not initialized')
      }

      // Delete from PostgreSQL by saving an empty table
      const success = await graphqlOps.updateTables({
        [tableId]: {
          id: tableId, // Include id
          name: '',
          displayName: '',
          parentColumns: [],
          childColumns: [],
          categoryFilters: {
            selectedParentCategories: [],
            selectedChildCategories: []
          },
          filters: [],
          metadata: {}, // Include empty metadata
          lastUpdateTimestamp: Date.now()
        }
      })

      if (!success) {
        throw new Error('Failed to delete table')
      }

      // Remove from available tables
      state.value.availableTables = state.value.availableTables.filter(
        (t) => t.id !== tableId
      )

      // Clear current table if it was deleted
      if (state.value.currentTableId === tableId) {
        state.value.currentTableId = null
        state.value.currentTable = null
        state.value.originalTable = null
        storage.removeItem(LAST_SELECTED_TABLE_KEY)
      }

      state.value.lastUpdated = Date.now()

      debug.log(DebugCategories.STATE, 'Table deleted', { tableId })
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete table')
      state.value.error = error
      debug.error(DebugCategories.ERROR, 'Failed to delete table:', error)
      throw error
    } finally {
      state.value.loading = false
    }
  }

  /**
   * Column operations
   */
  async function addColumn(
    parameter: AvailableBimParameter | AvailableUserParameter,
    isParent: boolean
  ): Promise<void> {
    try {
      debug.startState(DebugCategories.STATE, 'Adding column')

      if (!state.value.currentTableId || !state.value.currentTable) {
        throw new Error('No table selected')
      }

      const currentTable = state.value.currentTable
      const columns = isParent ? currentTable.parentColumns : currentTable.childColumns
      const order = columns.length

      const newColumn = createTableColumn(parameter, order)
      const updatedColumns = [...columns, newColumn]

      await updateTable({
        ...(isParent
          ? { parentColumns: updatedColumns }
          : { childColumns: updatedColumns })
      })

      debug.completeState(DebugCategories.STATE, 'Column added', {
        tableId: currentTable.id,
        columnId: newColumn.id,
        isParent
      })
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to add column')
      state.value.error = error
      debug.error(DebugCategories.ERROR, 'Failed to add column:', error)
      throw error
    }
  }

  async function removeColumn(columnId: string, isParent: boolean): Promise<void> {
    try {
      debug.startState(DebugCategories.STATE, 'Removing column')

      if (!state.value.currentTableId || !state.value.currentTable) {
        throw new Error('No table selected')
      }

      const currentTable = state.value.currentTable
      const columns = isParent ? currentTable.parentColumns : currentTable.childColumns
      const updatedColumns = columns.filter((col) => col.id !== columnId)

      await updateTable({
        ...(isParent
          ? { parentColumns: updatedColumns }
          : { childColumns: updatedColumns })
      })

      debug.completeState(DebugCategories.STATE, 'Column removed', {
        tableId: currentTable.id,
        columnId,
        isParent
      })
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to remove column')
      state.value.error = error
      debug.error(DebugCategories.ERROR, 'Failed to remove column:', error)
      throw error
    }
  }

  async function updateColumns(
    parentColumns: TableColumn[],
    childColumns: TableColumn[]
  ): Promise<void> {
    try {
      debug.startState(DebugCategories.STATE, 'Updating columns')

      if (!state.value.currentTableId || !state.value.currentTable) {
        throw new Error('No table selected')
      }

      await updateTable({
        parentColumns,
        childColumns
      })

      debug.completeState(DebugCategories.STATE, 'Columns updated', {
        tableId: state.value.currentTable.id,
        parentCount: parentColumns.length,
        childCount: childColumns.length
      })
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update columns')
      state.value.error = error
      debug.error(DebugCategories.ERROR, 'Failed to update columns:', error)
      throw error
    }
  }

  /**
   * Category operations
   */
  async function updateCategories(categories: TableCategoryFilters): Promise<void> {
    try {
      debug.startState(DebugCategories.STATE, 'Updating categories')

      if (!state.value.currentTableId || !state.value.currentTable) {
        throw new Error('No table selected')
      }

      await updateTable({
        categoryFilters: categories
      })

      debug.completeState(DebugCategories.STATE, 'Categories updated', {
        tableId: state.value.currentTable.id,
        categories
      })
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error('Failed to update categories')
      state.value.error = error
      debug.error(DebugCategories.ERROR, 'Failed to update categories:', error)
      throw error
    }
  }

  async function resetCategories(): Promise<void> {
    try {
      debug.startState(DebugCategories.STATE, 'Resetting categories')

      if (!state.value.currentTableId || !state.value.currentTable) {
        throw new Error('No table selected')
      }

      await updateTable({
        categoryFilters: {
          selectedParentCategories: [],
          selectedChildCategories: []
        }
      })

      debug.completeState(DebugCategories.STATE, 'Categories reset', {
        tableId: state.value.currentTable.id
      })
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to reset categories')
      state.value.error = error
      debug.error(DebugCategories.ERROR, 'Failed to reset categories:', error)
      throw error
    }
  }

  /**
   * UI state operations
   */
  function setShowCategoryOptions(show: boolean): void {
    state.value.ui.showCategoryOptions = show
    state.value.lastUpdated = Date.now()
  }

  function toggleCategoryOptions(): void {
    state.value.ui.showCategoryOptions = !state.value.ui.showCategoryOptions
    state.value.lastUpdated = Date.now()
  }

  /**
   * Store management
   */
  async function initialize(): Promise<void> {
    debug.startState(DebugCategories.STATE, 'Initializing table store')
    try {
      await initGraphQL()
      debug.completeState(DebugCategories.STATE, 'Table store initialized')
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to initialize store')
      state.value.error = error
      debug.error(DebugCategories.ERROR, 'Failed to initialize store:', error)
      throw error
    }
  }

  function reset(): void {
    state.value = createInitialState()
    state.value.availableTables = [
      {
        id: defaultTable.id,
        name: defaultTable.name,
        displayName: defaultTable.displayName
      }
    ]
    state.value.currentTableId = defaultTable.id
    state.value.currentTable = defaultTable
    state.value.originalTable = { ...defaultTable }
    state.value.lastUpdated = Date.now()
  }

  return {
    // State
    state: computed(() => state.value),
    computed: computedState,
    isLoading,
    error,
    hasError,
    currentView,
    lastUpdated,

    // Core operations
    loadTable,
    saveTable,
    updateTable,
    deleteTable,

    // Column operations
    addColumn,
    removeColumn,
    updateColumns,

    // Category operations
    updateCategories,
    resetCategories,

    // UI state
    setShowCategoryOptions,
    toggleCategoryOptions,

    // View management
    toggleView,

    // Store management
    initialize,
    reset
  }
}

// Global store instance
const store = createTableStore()

/**
 * Table store composable
 */
export function useTableStore() {
  return store
}
