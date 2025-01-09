/**
 * Table Store
 *
 * Responsibilities:
 * 1. Table Management
 * - Load/save tables from/to PostgreSQL
 * - Manage current table state
 *
 * 2. Selected Parameters
 * - Owns selected parameters (both parent and child)
 * - Manages parameter visibility and order
 *
 * 3. Column Management
 * - Owns table columns (using TableColumn type)
 * - Manages column visibility and order
 *
 * Does NOT handle:
 * - Raw parameters (managed by Parameter Store)
 * - Available parameters (managed by Parameter Store)
 * - UI state (managed by Core Store)
 */

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
import { createTableColumns, createTableColumn } from '~/composables/core/types'
import { useTablesGraphQL } from '~/composables/settings/tables/useTablesGraphQL'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import { defaultSelectedParameters, defaultTableConfig } from '../config/defaults'
import { useStore } from '~/composables/core/store'

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

  // Create default table with columns created from default parameters
  const defaultParentColumns = createTableColumns(defaultSelectedParameters.parent)
  const defaultChildColumns = createTableColumns(defaultSelectedParameters.child)

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
  const computedState: {
    currentTable: Ref<TableSettings | null>
    hasChanges: Ref<boolean>
  } = {
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
      debug.error(DebugCategories.ERROR, 'Failed to initialize GraphQL', err)
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to initialize GraphQL'
      const error = new Error(errorMessage)
      state.value.error = error
      throw error
    }
  }

  /**
   * Set current table and persist selection
   */
  // async function setCurrentTable(tableId: string | null) {
  //   debug.startState(DebugCategories.STATE, 'Setting current table', { tableId })

  //   // Update current ID
  //   state.value.currentTableId = tableId
  //   if (tableId) {
  //     // Find table in available tables
  //     const tableInfo = state.value.availableTables.find((t) => t.id === tableId)
  //     if (!tableInfo) {
  //       throw new Error(`Table ${tableId} not found`)
  //     }

  //     // Load full table data if not already current
  //     if (!state.value.currentTable || state.value.currentTable.id !== tableId) {
  //       await loadTable(tableId)
  //     }

  //     // Store original state for change detection
  //     state.value.originalTable = state.value.currentTable
  //       ? { ...state.value.currentTable }
  //       : null
  //     storage.setItem(LAST_SELECTED_TABLE_KEY, tableId)
  //   } else {
  //     state.value.currentTable = null
  //     state.value.originalTable = null
  //     storage.removeItem(LAST_SELECTED_TABLE_KEY)
  //   }

  //   debug.completeState(DebugCategories.STATE, 'Current table set')
  // }

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
      const table = loadedTable
        ? {
            ...loadedTable,
            // Keep existing columns and parameters, only use defaults if missing
            parentColumns:
              loadedTable.parentColumns?.length > 0
                ? (loadedTable.parentColumns.map((col: Partial<TableColumn>) => ({
                    ...col,
                    parameter:
                      col.parameter ||
                      defaultSelectedParameters.parent.find((p) => p.id === col.id)
                  })) as TableColumn[])
                : createTableColumns(defaultSelectedParameters.parent),
            childColumns:
              loadedTable.childColumns?.length > 0
                ? (loadedTable.childColumns.map((col: Partial<TableColumn>) => ({
                    ...col,
                    parameter:
                      col.parameter ||
                      defaultSelectedParameters.child.find((p) => p.id === col.id)
                  })) as TableColumn[])
                : createTableColumns(defaultSelectedParameters.child),
            selectedParameters: {
              parent: loadedTable.selectedParameters?.parent || [
                ...defaultSelectedParameters.parent
              ],
              child: loadedTable.selectedParameters?.child || [
                ...defaultSelectedParameters.child
              ]
            }
          }
        : {
            ...defaultTableConfig,
            id: tableId,
            name: `Table ${tableId}`,
            displayName: `Table ${tableId}`,
            parentColumns: createTableColumns(defaultSelectedParameters.parent),
            childColumns: createTableColumns(defaultSelectedParameters.child),
            selectedParameters: {
              parent: [...defaultSelectedParameters.parent],
              child: [...defaultSelectedParameters.child]
            },
            lastUpdateTimestamp: Date.now()
          }

      // Update store with table
      state.value.currentTable = table
      state.value.lastUpdated = Date.now()

      debug.log(DebugCategories.STATE, 'Table loaded', {
        tableId,
        fromServer: !!loadedTable
      })
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      debug.error(DebugCategories.ERROR, 'Failed to load table:', error)
      state.value.error = error
      throw error
    } finally {
      state.value.loading = false
    }
  }

  /**
   * Save table to PostgreSQL
   */
  async function saveTable(settings: TableSettings) {
    debug.startState(DebugCategories.STATE, 'Saving table', {
      tableId: settings.id,
      settings,
      isNew: !state.value.availableTables.some((t) => t.id === settings.id)
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

      // Save to PostgreSQL
      const success = await graphqlOps.updateTables({
        [settings.id]: settings
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

      // Update both current and original table state
      state.value.currentTable = savedTable
      state.value.originalTable = { ...savedTable }

      // Update available tables list
      state.value.availableTables = Object.values(tables).map((table) => ({
        id: table.id,
        name: table.name,
        displayName: table.displayName
      }))

      // Update current ID if needed
      const isNewTable = !state.value.currentTableId
      if (isNewTable || state.value.currentTableId === settings.id) {
        state.value.currentTableId = settings.id
      }

      // Update core store's tables array
      const coreStore = useStore()
      await coreStore.setTablesArray([...state.value.availableTables])

      state.value.lastUpdated = Date.now()

      debug.log(DebugCategories.STATE, 'Table saved', {
        tableId: settings.id,
        isNewTable
      })
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      debug.error(DebugCategories.ERROR, 'Failed to save table:', error)
      state.value.error = error
      throw error
    } finally {
      state.value.loading = false
    }
  }

  /**
   * Update current table
   */
  function updateTable(updates: Partial<TableSettings>) {
    // If this is a new table, create it with default columns
    if (updates.id && !state.value.availableTables.some((t) => t.id === updates.id)) {
      debug.log(DebugCategories.STATE, 'Creating new table', {
        tableId: updates.id,
        updates
      })

      // Create default columns if none provided
      const parentColumns =
        updates.parentColumns || createTableColumns(defaultSelectedParameters.parent)
      const childColumns =
        updates.childColumns || createTableColumns(defaultSelectedParameters.child)

      const newTable: TableSettings = {
        ...defaultTableConfig,
        ...updates,
        parentColumns,
        childColumns,
        selectedParameters: {
          parent: updates.selectedParameters?.parent || [
            ...defaultSelectedParameters.parent
          ],
          child: updates.selectedParameters?.child || [
            ...defaultSelectedParameters.child
          ]
        },
        lastUpdateTimestamp: Date.now()
      }

      // Update state
      state.value.currentTableId = updates.id
      state.value.currentTable = newTable
      state.value.availableTables.push({
        id: newTable.id,
        name: newTable.name,
        displayName: newTable.displayName
      })
      state.value.lastUpdated = Date.now()
      return
    }

    // Otherwise update existing table
    if (!state.value.currentTableId || !state.value.currentTable) {
      debug.error(
        DebugCategories.ERROR,
        'Cannot update table: No current table selected'
      )
      return
    }

    // If selected parameters are being updated, merge with existing columns
    let updated = { ...state.value.currentTable, ...updates }
    if (updates.selectedParameters) {
      // Get existing column maps for quick lookup
      const existingParentColumns = new Map(
        state.value.currentTable.parentColumns.map((col: TableColumn) => [col.id, col])
      )
      const existingChildColumns = new Map(
        state.value.currentTable.childColumns.map((col: TableColumn) => [col.id, col])
      )

      // Create new columns only for new parameters
      const newParentColumns: TableColumn[] = updates.selectedParameters.parent
        .filter((param) => !existingParentColumns.has(param.id))
        .map((param) => createTableColumn(param))
      const newChildColumns: TableColumn[] = updates.selectedParameters.child
        .filter((param) => !existingChildColumns.has(param.id))
        .map((param) => createTableColumn(param))

      // Merge existing and new columns
      const mergedParentColumns: TableColumn[] = [
        ...state.value.currentTable.parentColumns,
        ...newParentColumns
      ]
      const mergedChildColumns: TableColumn[] = [
        ...state.value.currentTable.childColumns,
        ...newChildColumns
      ]

      updated = {
        ...updated,
        parentColumns: mergedParentColumns,
        childColumns: mergedChildColumns
      }

      debug.log(DebugCategories.STATE, 'Table updated with merged columns', {
        tableId: state.value.currentTable.id,
        selectedParameters: {
          parent: updates.selectedParameters.parent.length,
          child: updates.selectedParameters.child.length
        },
        columns: {
          parent: updated.parentColumns.length,
          child: updated.childColumns.length
        },
        newColumns: {
          parent: newParentColumns.length,
          child: newChildColumns.length
        }
      })
    }

    // Update current table
    state.value.currentTable = updated

    // Update available tables list if name changed
    if (updates.name || updates.displayName) {
      const index = state.value.availableTables.findIndex(
        (t) => t.id === state.value.currentTableId
      )
      if (index !== -1) {
        state.value.availableTables[index] = {
          id: updated.id,
          name: updated.name,
          displayName: updated.displayName
        }
      }
    }

    state.value.lastUpdated = Date.now()

    debug.log(DebugCategories.STATE, 'Table updated', {
      tableId: updated.id,
      updates,
      table: updated
    })
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
          id: tableId,
          name: '',
          displayName: '',
          parentColumns: [],
          childColumns: [],
          categoryFilters: {
            selectedParentCategories: [],
            selectedChildCategories: []
          },
          selectedParameters: {
            parent: [],
            child: []
          },
          filters: [],
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
      const error = err instanceof Error ? err : new Error(String(err))
      debug.error(DebugCategories.ERROR, 'Failed to delete table:', error)
      state.value.error = error
      throw error
    } finally {
      state.value.loading = false
    }
  }

  /**
   * Reset store state
   */
  function reset() {
    // Create initial state
    const initialState = createInitialState()

    // Create default table with columns created from default parameters
    const defaultParentColumns = createTableColumns(defaultSelectedParameters.parent)
    const defaultChildColumns = createTableColumns(defaultSelectedParameters.child)

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

    // Set default table
    initialState.availableTables = [
      {
        id: defaultTable.id,
        name: defaultTable.name,
        displayName: defaultTable.displayName
      }
    ]
    initialState.currentTableId = defaultTable.id
    initialState.currentTable = defaultTable

    debug.log(DebugCategories.STATE, 'Default table reset with columns', {
      selectedParameters: {
        parent: defaultSelectedParameters.parent.length,
        child: defaultSelectedParameters.child.length
      },
      columns: {
        parent: defaultParentColumns.length,
        child: defaultChildColumns.length
      }
    })

    // Update state
    state.value = initialState

    debug.log(DebugCategories.STATE, 'Table store reset with defaults', {
      tableId: defaultTable.id,
      selectedParameters: {
        parent: defaultSelectedParameters.parent.length,
        child: defaultSelectedParameters.child.length
      }
    })
  }

  /**
   * Initialize store
   */
  async function initialize(): Promise<void> {
    debug.startState(DebugCategories.STATE, 'Initializing table store')
    try {
      // Initialize GraphQL operations
      await initGraphQL()

      // Initialize state
      reset()

      debug.log(DebugCategories.STATE, 'Table store initialized')
      return Promise.resolve()
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      debug.error(DebugCategories.ERROR, 'Failed to initialize store:', error)
      state.value.error = error
      throw error
    }
  }

  /**
   * Update table columns
   */
  async function updateColumns(
    parentColumns: TableColumn[],
    childColumns: TableColumn[]
  ): Promise<void> {
    try {
      if (!state.value.currentTableId || !state.value.currentTable) {
        throw new Error('Cannot update columns: No current table selected')
      }

      // Update table with new columns
      const updated = {
        ...state.value.currentTable,
        parentColumns,
        childColumns,
        lastUpdateTimestamp: Date.now()
      }

      // Update current table without modifying originalTable
      state.value.currentTable = updated
      state.value.lastUpdated = Date.now()

      debug.log(DebugCategories.STATE, 'Columns updated', {
        tableId: updated.id,
        columns: {
          parent: parentColumns.length,
          child: childColumns.length
        }
      })

      return Promise.resolve()
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      debug.error(DebugCategories.ERROR, 'Failed to update columns:', error)
      state.value.error = error
      throw error
    }
  }

  /**
   * Update table categories
   */
  function updateCategories(categories: TableCategoryFilters): void {
    debug.startState(DebugCategories.STATE, 'Updating categories', { categories })

    if (!state.value.currentTableId || !state.value.currentTable) {
      const error = new Error('Cannot update categories: No current table selected')
      debug.error(DebugCategories.ERROR, error.message)
      return
    }

    // Update table with new categories
    const updated = {
      ...state.value.currentTable,
      categoryFilters: categories,
      lastUpdateTimestamp: Date.now()
    }

    // Update current table without modifying originalTable
    state.value.currentTable = updated
    state.value.lastUpdated = Date.now()

    debug.log(DebugCategories.STATE, 'Categories updated', {
      tableId: updated.id,
      categories
    })
  }

  /**
   * Reset categories to default state
   */
  function resetCategories(): void {
    debug.startState(DebugCategories.STATE, 'Resetting categories')

    if (!state.value.currentTableId || !state.value.currentTable) {
      const error = new Error('Cannot reset categories: No current table selected')
      debug.error(DebugCategories.ERROR, error.message)
      return
    }

    // Reset to default categories
    const updated = {
      ...state.value.currentTable,
      categoryFilters: {
        selectedParentCategories: [],
        selectedChildCategories: []
      },
      lastUpdateTimestamp: Date.now()
    }

    // Update current table without modifying originalTable
    state.value.currentTable = updated
    state.value.lastUpdated = Date.now()

    debug.log(DebugCategories.STATE, 'Categories reset', {
      tableId: updated.id
    })
  }

  /**
   * Set category options visibility
   */
  function setShowCategoryOptions(show: boolean): void {
    debug.startState(DebugCategories.STATE, 'Setting category options visibility', {
      show
    })

    state.value.ui.showCategoryOptions = show
    state.value.lastUpdated = Date.now()

    debug.completeState(DebugCategories.STATE, 'Category options visibility set')
  }

  /**
   * Toggle category options visibility
   */
  function toggleCategoryOptions(): void {
    debug.startState(DebugCategories.STATE, 'Toggling category options')

    state.value.ui.showCategoryOptions = !state.value.ui.showCategoryOptions
    state.value.lastUpdated = Date.now()

    debug.completeState(DebugCategories.STATE, 'Category options toggled', {
      show: state.value.ui.showCategoryOptions
    })
  }

  // Create lastUpdated ref
  const lastUpdated = computed(() => state.value.lastUpdated)

  /**
   * Refresh available tables list from PostgreSQL
   */
  async function refreshTableList(): Promise<void> {
    debug.startState(DebugCategories.STATE, 'Refreshing table list')
    state.value.loading = true

    try {
      // Initialize GraphQL if not already done
      if (!graphqlOps) {
        await initGraphQL()
      }

      if (!graphqlOps) {
        throw new Error('GraphQL operations not initialized')
      }

      // Fetch tables from PostgreSQL
      const tables = await graphqlOps.fetchTables()

      // Update available tables list with metadata
      state.value.availableTables = Object.values(tables).map((table) => ({
        id: table.id,
        name: table.name,
        displayName: table.displayName
      }))

      state.value.lastUpdated = Date.now()

      debug.log(DebugCategories.STATE, 'Table list refreshed', {
        tableCount: state.value.availableTables.length
      })
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      debug.error(DebugCategories.ERROR, 'Failed to refresh table list:', error)
      state.value.error = error
      throw error
    } finally {
      state.value.loading = false
    }
  }

  /**
   * Get list of available tables
   */
  function getAvailableTables() {
    return state.value.availableTables
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
    updateColumns,

    // Table list management
    refreshTableList,
    getAvailableTables,

    // View management
    toggleView,

    // Category management
    updateCategories,
    resetCategories,

    // UI state management
    setShowCategoryOptions,
    toggleCategoryOptions,

    // Store management
    initialize,
    reset
  }
}

// Global store instance
const store = createTableStore()

/**
 * Table store composable
 * Provides access to the global table store instance
 */
export function useTableStore() {
  return store
}
