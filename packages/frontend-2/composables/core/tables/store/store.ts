import { ref, computed } from 'vue'
import type {
  TableStore,
  TableStoreState,
  TableSettings,
  TableStoreOptions
} from './types'
import type {
  TableCategoryFilters,
  TableSelectedParameters
} from '~/composables/core/types/tables/table-config'
import type { TableColumn } from '~/composables/core/types/tables/table-column'
import { useTableService } from '../services/tableService'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import { defaultSelectedParameters, defaultTableConfig } from '../config/defaults'
import { createTableColumns } from '~/composables/core/types/tables/table-column'

/**
 * Table Store
 *
 * Responsibilities:
 * 1. Table Management
 *    - Load/save tables from/to PostgreSQL
 *    - Manage current table state
 *
 * 2. Selected Parameters
 *    - Owns selected parameters (both parent and child)
 *    - Manages parameter visibility and order
 *
 * 3. Column Management
 *    - Owns table columns (using TableColumn type)
 *    - Manages column visibility and order
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
    lastUpdated: Date.now()
  }
}

/**
 * Create table store
 */
function createTableStore(options: TableStoreOptions = {}): TableStore {
  // Initialize state
  const state = ref<TableStoreState>(createInitialState())
  const tableService = useTableService()

  // Create default table with columns created from default parameters
  const defaultParentColumns = createTableColumns(defaultSelectedParameters.parent)
  const defaultChildColumns = createTableColumns(defaultSelectedParameters.child)

  // Use consistent default table config
  const defaultTable: TableSettings = {
    ...defaultTableConfig,
    parentColumns: defaultParentColumns,
    childColumns: defaultChildColumns,
    lastUpdateTimestamp: Date.now()
  }

  // Set default table and make it current
  state.value.tables.set(defaultTable.id, defaultTable)
  state.value.currentTableId = defaultTable.id

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

  /**
   * Load table from PostgreSQL
   */
  async function loadTable(tableId: string) {
    debug.startState(DebugCategories.STATE, 'Loading table', { tableId })
    state.value.loading = true

    try {
      // Fetch table from PostgreSQL
      const table = await tableService.fetchTable(tableId)

      // Create columns from selected parameters
      const parentColumns = createTableColumns(table.selectedParameters.parent)
      const childColumns = createTableColumns(table.selectedParameters.child)

      // Update store with table and generated columns
      state.value.tables.set(tableId, {
        ...table,
        parentColumns,
        childColumns
      })
      state.value.currentTableId = tableId
      state.value.lastUpdated = Date.now()

      debug.log(DebugCategories.STATE, 'Table loaded with columns', {
        tableId,
        selectedParameters: {
          parent: table.selectedParameters.parent.length,
          child: table.selectedParameters.child.length
        },
        columns: {
          parent: parentColumns.length,
          child: childColumns.length
        }
      })

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

    try {
      // Save to PostgreSQL
      const savedTable = await tableService.saveTable(settings)

      // Create columns from selected parameters
      const parentColumns = createTableColumns(savedTable.selectedParameters.parent)
      const childColumns = createTableColumns(savedTable.selectedParameters.child)

      // Update store with table and generated columns
      state.value.tables.set(savedTable.id, {
        ...savedTable,
        parentColumns,
        childColumns
      })
      state.value.lastUpdated = Date.now()

      debug.log(DebugCategories.STATE, 'Table saved with columns', {
        tableId: savedTable.id,
        selectedParameters: {
          parent: savedTable.selectedParameters.parent.length,
          child: savedTable.selectedParameters.child.length
        },
        columns: {
          parent: parentColumns.length,
          child: childColumns.length
        }
      })

      debug.log(DebugCategories.STATE, 'Table saved', {
        tableId: savedTable.id,
        table: savedTable
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
      state.value.currentTableId = updates.id
      state.value.tables.set(updates.id, updates as TableSettings)
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
      // Delete from PostgreSQL
      await tableService.deleteTable(tableId)

      // Update store
      state.value.tables.delete(tableId)
      if (state.value.currentTableId === tableId) {
        state.value.currentTableId = null
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

    // Create columns directly from parameters
    const parentColumns = createTableColumns(parameters.parent)
    const childColumns = createTableColumns(parameters.child)

    // Update state immediately
    const currentId = state.value.currentTableId
    const current = state.value.tables.get(currentId)
    if (current) {
      state.value.tables.set(currentId, {
        ...current,
        selectedParameters: parameters,
        parentColumns,
        childColumns,
        lastUpdateTimestamp: Date.now()
      })
      state.value.lastUpdated = Date.now()
    }

    debug.completeState(DebugCategories.STATE, 'Parameters and columns updated', {
      parameters: {
        parent: parameters.parent.length,
        child: parameters.child.length
      },
      columns: {
        parent: parentColumns.length,
        child: childColumns.length
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
      // Initialize state synchronously but return promise
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

    // Table operations
    loadTable,
    saveTable,
    updateTable,
    deleteTable,

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
