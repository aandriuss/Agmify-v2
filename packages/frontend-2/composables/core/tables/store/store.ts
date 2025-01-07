import { ref, computed } from 'vue'
import type {
  TableStore,
  TableStoreState,
  TableSettings,
  TableStoreOptions,
  TableSort
} from './types'
import type {
  TableCategoryFilters,
  TableSelectedParameters,
  TableFilter,
  TableColumn
} from '~/composables/core/types'
import { createTableColumns } from '~/composables/core/types'
import { isSelectedParameter } from '~/composables/core/types/parameters/parameter-states'
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
    loading: false,
    error: null,
    lastUpdated: Date.now(),
    sort: undefined,
    filters: [],
    currentView: 'parent',
    isDirty: false,
    isUpdating: false,
    lastUpdateTime: Date.now()
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

  // Computed state
  const currentTable = computed(() => {
    const id = state.value.currentTableId
    return id ? state.value.tables.get(id) || null : null
  })

  const isLoading = computed(() => state.value.loading)
  const error = computed(() => state.value.error)
  const hasError = computed(() => state.value.error !== null)
  const lastUpdated = computed(() => state.value.lastUpdated)
  const sort = computed(() => state.value.sort)
  const filters = computed<TableFilter[]>(() => state.value.filters || [])
  const currentView = computed(() => state.value.currentView)
  const isDirty = computed(() => state.value.isDirty)
  const isUpdating = computed(() => state.value.isUpdating)
  const lastUpdateTime = computed(() => state.value.lastUpdateTime)

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

    state.value.currentTableId = tableId
    state.value.isDirty = false

    if (tableId) {
      storage.setItem(LAST_SELECTED_TABLE_KEY, tableId)
    } else {
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

      debug.log(DebugCategories.STATE, 'Table loaded', {
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
      settings
    })
    state.value.loading = true
    state.value.isUpdating = true
    state.value.lastUpdateTime = Date.now()

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

      // Update store with saved table
      state.value.tables.set(settings.id, settings)
      state.value.lastUpdated = Date.now()
      state.value.isDirty = false

      debug.log(DebugCategories.STATE, 'Table saved', {
        tableId: settings.id,
        table: settings
      })
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      debug.error(DebugCategories.ERROR, 'Failed to save table:', error)
      state.value.error = error
      throw error
    } finally {
      state.value.loading = false
      state.value.isUpdating = false
    }
  }

  /**
   * Update sort state
   */
  function updateSort(sort: TableSort | undefined): void {
    debug.startState(DebugCategories.STATE, 'Updating sort', sort)

    state.value.sort = sort
    state.value.lastUpdated = Date.now()
    state.value.isDirty = true

    debug.completeState(DebugCategories.STATE, 'Sort updated')
  }

  /**
   * Update filters
   */
  function updateFilters(newFilters: TableFilter[]): void {
    debug.startState(DebugCategories.STATE, 'Updating filters', {
      filterCount: newFilters.length
    })

    state.value.filters = [...newFilters]
    state.value.lastUpdated = Date.now()
    state.value.isDirty = true

    debug.completeState(DebugCategories.STATE, 'Filters updated')
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
      state.value.tables.set(updates.id, updates as TableSettings)
      state.value.lastUpdated = Date.now()
      state.value.isDirty = true
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
    state.value.isDirty = true

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

      // Delete from PostgreSQL by saving an empty record
      const success = await graphqlOps.updateTables({})

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
   * Update selected parameters and corresponding columns
   */
  function updateSelectedParameters(parameters: TableSelectedParameters) {
    if (!state.value.currentTableId) {
      debug.error(
        DebugCategories.ERROR,
        'Cannot update parameters: No current table selected'
      )
      return
    }

    debug.startState(DebugCategories.STATE, 'Updating selected parameters')

    try {
      // Validate parameters
      const validParentParams = parameters.parent.filter(isSelectedParameter)
      const validChildParams = parameters.child.filter(isSelectedParameter)

      if (
        validParentParams.length !== parameters.parent.length ||
        validChildParams.length !== parameters.child.length
      ) {
        throw new Error('Invalid parameters detected')
      }

      // Create columns from validated parameters
      const parentColumns = createTableColumns(validParentParams)
      const childColumns = createTableColumns(validChildParams)

      // Update state with validated data
      const currentId = state.value.currentTableId
      const current = state.value.tables.get(currentId)
      if (current) {
        state.value.tables.set(currentId, {
          ...current,
          selectedParameters: {
            parent: validParentParams,
            child: validChildParams
          },
          parentColumns,
          childColumns,
          lastUpdateTimestamp: Date.now()
        })
        state.value.lastUpdated = Date.now()
        state.value.isDirty = true
      }
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to update parameters:', err)
      state.value.error =
        err instanceof Error ? err : new Error('Failed to update parameters')
      return
    }

    debug.completeState(DebugCategories.STATE, 'Parameters and columns updated', {
      parameters: {
        parent: parameters.parent.length,
        child: parameters.child.length
      },
      columns: {
        parent: parameters.parent.length,
        child: parameters.child.length
      }
    })
  }

  /**
   * Update category filters
   */
  function updateCategoryFilters(filters: TableCategoryFilters) {
    if (!state.value.currentTableId) {
      debug.error(
        DebugCategories.ERROR,
        'Cannot update filters: No current table selected'
      )
      return
    }

    updateTable({ categoryFilters: filters })
  }

  /**
   * Update columns
   */
  function updateColumns(parentColumns: TableColumn[], childColumns: TableColumn[]) {
    if (!state.value.currentTableId) {
      debug.error(
        DebugCategories.ERROR,
        'Cannot update columns: No current table selected'
      )
      return
    }

    debug.startState(DebugCategories.STATE, 'Updating columns', {
      tableId: state.value.currentTableId,
      currentState: {
        parent: currentTable.value?.parentColumns?.length || 0,
        child: currentTable.value?.childColumns?.length || 0
      },
      newState: {
        parent: parentColumns.length,
        child: childColumns.length
      }
    })

    // Validate columns
    const isValid =
      parentColumns.every((col) => col.id && col.field && col.header) &&
      childColumns.every((col) => col.id && col.field && col.header)
    if (!isValid) {
      debug.error(DebugCategories.ERROR, 'Invalid columns: Missing required properties')
      return
    }

    // Update table with new columns
    updateTable({ parentColumns, childColumns })

    debug.completeState(DebugCategories.STATE, 'Columns updated', {
      tableId: state.value.currentTableId,
      columns: {
        parent: {
          count: parentColumns.length,
          ids: parentColumns.map((col) => col.id)
        },
        child: {
          count: childColumns.length,
          ids: childColumns.map((col) => col.id)
        }
      }
    })
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

  return {
    // State
    state: computed(() => state.value),
    currentTable,
    isLoading,
    error,
    hasError,
    lastUpdated,
    sort,
    filters,

    // View management
    toggleView,
    currentView,
    isDirty,
    isUpdating,
    lastUpdateTime,

    // Table operations
    loadTable,
    saveTable,
    updateTable,
    deleteTable,
    updateSort,
    updateFilters,

    // Parameter management
    updateSelectedParameters,

    // Category management
    updateCategoryFilters,

    // Column management
    updateColumns,

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
