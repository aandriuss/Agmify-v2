import { ref, computed } from 'vue'
import { isEqual } from 'lodash'
import type {
  TableStore,
  TableStoreState,
  TableSettings,
  TableStoreOptions
} from './types'
import type { TableColumn } from '~/composables/core/types'
import { createTableColumns } from '~/composables/core/types'
import { useTablesGraphQL } from '~/composables/settings/tables/useTablesGraphQL'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import { defaultSelectedParameters, defaultTableConfig } from '../config/defaults'

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

/**
 * Create initial store state
 */
function createInitialState(): TableStoreState {
  return {
    tables: new Map(),
    currentTableId: null,
    originalTable: null,
    loading: false,
    error: null,
    currentView: 'parent',
    lastUpdated: Date.now()
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

  // Set default table and make it current or restore from local storage
  state.value.tables.set(defaultTable.id, defaultTable)
  const savedTableId = storage.getItem(LAST_SELECTED_TABLE_KEY)
  state.value.currentTableId = savedTableId || defaultTable.id

  debug.log(DebugCategories.STATE, 'Default table created', {
    selectedParameters: {
      parent: defaultSelectedParameters.parent.length,
      child: defaultSelectedParameters.child.length
    },
    columns: {
      parent: defaultParentColumns.length,
      child: defaultChildColumns.length
    }
  })

  // Add initial tables if provided
  if (options.initialTables) {
    options.initialTables.forEach((table) => {
      state.value.tables.set(table.id, table)
    })
  }

  // Computed properties for change detection
  const computedState: {
    currentTable: Ref<TableSettings | null>
    hasChanges: Ref<boolean>
  } = {
    currentTable: computed(() => {
      const id = state.value.currentTableId
      return id ? state.value.tables.get(id) || null : null
    }),
    hasChanges: computed(() => {
      const current = computedState.currentTable.value
      const original = state.value.originalTable

      if (!current) return false
      if (!original) return true // New table

      // Deep compare all properties that can change
      return !isEqual(current, original)
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
      const error =
        err instanceof Error ? err : new Error('Failed to initialize GraphQL')
      state.value.error = error
      throw error
    }
  }

  /**
   * Set current table and persist selection
   */
  function setCurrentTable(tableId: string | null) {
    debug.startState(DebugCategories.STATE, 'Setting current table', { tableId })

    // Update current ID and store original state for change detection
    state.value.currentTableId = tableId
    if (tableId) {
      const table = state.value.tables.get(tableId)
      state.value.originalTable = table ? { ...table } : null
      storage.setItem(LAST_SELECTED_TABLE_KEY, tableId)
    } else {
      state.value.originalTable = null
      storage.removeItem(LAST_SELECTED_TABLE_KEY)
    }

    debug.completeState(DebugCategories.STATE, 'Current table set')
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
      // First check if we already have the table in memory
      const existingTable = state.value.tables.get(tableId)
      if (existingTable) {
        debug.log(DebugCategories.STATE, 'Using cached table', {
          tableId,
          table: existingTable
        })
        setCurrentTable(tableId)
        state.value.lastUpdated = Date.now()
        return
      }

      // Initialize GraphQL if not already done
      if (!graphqlOps) {
        await initGraphQL()
      }

      if (!graphqlOps) {
        throw new Error('GraphQL operations not initialized')
      }

      // Fetch tables from PostgreSQL
      const tables = await graphqlOps.fetchTables()
      const table = tables[tableId]

      if (!table) {
        throw new Error(`Table ${tableId} not found`)
      }

      // Update store with table
      state.value.tables.set(tableId, table)
      setCurrentTable(tableId)
      state.value.lastUpdated = Date.now()

      debug.log(DebugCategories.STATE, 'Table loaded from server', {
        tableId,
        table
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
      isNew: !state.value.tables.has(settings.id)
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

      // Update store with saved table and set as original
      state.value.tables.set(settings.id, settings)
      state.value.originalTable = { ...settings }

      // Update current ID if needed
      const isNewTable = !state.value.currentTableId
      if (isNewTable || state.value.currentTableId === settings.id) {
        state.value.currentTableId = settings.id
      }

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
    // If this is a new table, create it
    if (updates.id && !state.value.tables.has(updates.id)) {
      debug.log(DebugCategories.STATE, 'Creating new table', {
        tableId: updates.id,
        updates
      })
      setCurrentTable(updates.id)
      const newTable = updates as TableSettings
      state.value.tables.set(updates.id, newTable)
      state.value.originalTable = { ...newTable }
      state.value.lastUpdated = Date.now()
      return
    }

    // Otherwise update existing table
    if (!state.value.currentTableId) {
      debug.error(
        DebugCategories.ERROR,
        'Cannot update table: No current table selected'
      )
      return
    }

    const current = state.value.tables.get(state.value.currentTableId)
    if (!current) {
      debug.error(
        DebugCategories.ERROR,
        'Cannot update table: Current table not found in store'
      )
      return
    }

    // If selected parameters are being updated, ensure columns are created
    let updated = { ...current, ...updates }
    if (updates.selectedParameters) {
      const parentColumns = createTableColumns(updates.selectedParameters.parent)
      const childColumns = createTableColumns(updates.selectedParameters.child)
      updated = {
        ...updated,
        parentColumns,
        childColumns
      }

      debug.log(DebugCategories.STATE, 'Table updated with new columns', {
        tableId: current.id,
        selectedParameters: {
          parent: updates.selectedParameters.parent.length,
          child: updates.selectedParameters.child.length
        },
        columns: {
          parent: parentColumns.length,
          child: childColumns.length
        }
      })
    }

    state.value.tables.set(current.id, updated)
    state.value.lastUpdated = Date.now()

    debug.log(DebugCategories.STATE, 'Table updated', {
      tableId: current.id,
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

      // Delete from PostgreSQL by saving an empty tables array
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

      // Update store
      state.value.tables.delete(tableId)
      if (state.value.currentTableId === tableId) {
        setCurrentTable(null)
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
    initialState.tables.set(defaultTable.id, defaultTable)
    initialState.currentTableId = defaultTable.id

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
      if (!state.value.currentTableId) {
        throw new Error('Cannot update columns: No current table selected')
      }

      const current = state.value.tables.get(state.value.currentTableId)
      if (!current) {
        throw new Error('Cannot update columns: Current table not found in store')
      }

      // Update table with new columns
      const updated = {
        ...current,
        parentColumns,
        childColumns,
        lastUpdateTimestamp: Date.now()
      }

      // Save to store
      await new Promise<void>((resolve) => {
        state.value.tables.set(current.id, updated)
        state.value.lastUpdated = Date.now()
        resolve()
      })

      debug.log(DebugCategories.STATE, 'Columns updated', {
        tableId: current.id,
        columns: {
          parent: parentColumns.length,
          child: childColumns.length
        }
      })
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      debug.error(DebugCategories.ERROR, 'Failed to update columns:', error)
      state.value.error = error
      throw error
    }
  }

  // Create lastUpdated ref
  const lastUpdated = computed(() => state.value.lastUpdated)

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
 * Provides access to the global table store instance
 */
export function useTableStore() {
  return store
}
