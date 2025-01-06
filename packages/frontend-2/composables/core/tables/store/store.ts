import { ref, computed } from 'vue'
import type { TableStore, TableStoreState, TableSettings } from './types'
import type { TableColumn } from '~/composables/core/types/tables/table-column'
import { useTableService } from '../services/tableService'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import { defaultTableConfig } from '../config/defaults'
import { useParameterStore } from '~/composables/core/parameters/store'
import { createTableColumns } from '~/composables/core/types/tables/table-column'
import type { useApolloClient } from '@vue/apollo-composable'

/**
 * Table Store
 *
 * Responsibilities:
 * 1. Table Management
 *    - Load/save tables via GraphQL
 *    - Manage current table state
 *    - Handle table operations (create, update, delete)
 *
 * 2. Column Management
 *    - Own table columns using TableColumn type
 *    - Manage column visibility and order
 *
 * Does NOT handle:
 * - Parameters (managed by Parameter Store)
 * - Categories (managed by Core Store)
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
export interface TableStoreOptions {
  initialTables?: TableSettings[]
  apolloClient?: ReturnType<typeof useApolloClient>['client']
}

function createTableStore(options: TableStoreOptions = {}): TableStore {
  // Initialize state
  const state = ref<TableStoreState>(createInitialState())
  const tableService = useTableService({
    apolloClient: options.apolloClient
  })

  // Initialize stores
  const parameterStore = useParameterStore()

  // Create default table
  const defaultTable: TableSettings = {
    ...defaultTableConfig,
    parentColumns: [],
    childColumns: [],
    lastUpdateTimestamp: Date.now()
  }

  // Set default table and make it current
  state.value.tables.set(defaultTable.id, defaultTable)
  state.value.currentTableId = defaultTable.id

  debug.log(DebugCategories.STATE, 'Default table created')

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

      // Create columns from parameter store
      const parentColumns = createTableColumns(
        parameterStore.selectedParentParameters.value
      )
      const childColumns = createTableColumns(
        parameterStore.selectedChildParameters.value
      )

      // Preserve existing visibility settings from loaded table
      const updatedParentColumns = parentColumns.map((col) => ({
        ...col,
        visible:
          table.parentColumns.find((c) => c.id === col.id)?.visible ??
          col.parameter.visible
      }))

      const updatedChildColumns = childColumns.map((col) => ({
        ...col,
        visible:
          table.childColumns.find((c) => c.id === col.id)?.visible ??
          col.parameter.visible
      }))

      // Update store with table and generated columns
      state.value.tables.set(tableId, {
        ...table,
        parentColumns: updatedParentColumns,
        childColumns: updatedChildColumns
      })
      state.value.currentTableId = tableId
      state.value.lastUpdated = Date.now()

      debug.log(DebugCategories.STATE, 'Table loaded with columns', {
        tableId,
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
      // Save table with current visibility settings
      const savedTable = await tableService.saveTable({
        ...settings,
        parentColumns: settings.parentColumns.map((col) => ({
          ...col,
          visible: col.visible // Keep visibility override
        })),
        childColumns: settings.childColumns.map((col) => ({
          ...col,
          visible: col.visible // Keep visibility override
        }))
      })

      // Create columns from parameter store with saved visibility
      const parentColumns = createTableColumns(
        parameterStore.selectedParentParameters.value
      )
      const childColumns = createTableColumns(
        parameterStore.selectedChildParameters.value
      )

      // Preserve saved visibility settings
      const updatedParentColumns = parentColumns.map((col) => ({
        ...col,
        visible:
          savedTable.parentColumns.find((c) => c.id === col.id)?.visible ??
          col.parameter.visible
      }))

      const updatedChildColumns = childColumns.map((col) => ({
        ...col,
        visible:
          savedTable.childColumns.find((c) => c.id === col.id)?.visible ??
          col.parameter.visible
      }))

      // Update store with table and generated columns
      state.value.tables.set(savedTable.id, {
        ...savedTable,
        parentColumns: updatedParentColumns,
        childColumns: updatedChildColumns
      })
      state.value.lastUpdated = Date.now()

      debug.log(DebugCategories.STATE, 'Table saved with columns', {
        tableId: savedTable.id,
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

    // Update table with current state
    const updated = { ...current, ...updates }

    state.value.tables.set(current.id, updated)
    state.value.lastUpdated = Date.now()

    debug.log(DebugCategories.STATE, 'Table updated', {
      tableId: current.id,
      updates,
      table: updated
    })
  }

  /**
   * Delete table and save changes
   */
  async function deleteTable(tableId: string) {
    debug.startState(DebugCategories.STATE, 'Deleting table', { tableId })
    state.value.loading = true

    try {
      // Remove from local state
      state.value.tables.delete(tableId)
      if (state.value.currentTableId === tableId) {
        state.value.currentTableId = null
      }

      // Delete from PostgreSQL
      await tableService.deleteTable(tableId)

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
   * Update columns with visibility
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

    // Get current table
    const current = state.value.tables.get(state.value.currentTableId)
    if (!current) {
      debug.error(
        DebugCategories.ERROR,
        'Cannot update columns: Current table not found'
      )
      return
    }

    // Preserve existing visibility settings
    const updatedParentColumns = parentColumns.map((col) => {
      const existingCol = current.parentColumns.find((c) => c.id === col.id)
      return {
        ...col,
        visible: existingCol?.visible ?? col.parameter.visible // Use existing visibility or fall back to parameter visibility
      }
    })

    const updatedChildColumns = childColumns.map((col) => {
      const existingCol = current.childColumns.find((c) => c.id === col.id)
      return {
        ...col,
        visible: existingCol?.visible ?? col.parameter.visible // Use existing visibility or fall back to parameter visibility
      }
    })

    // Update table with new columns
    updateTable({
      parentColumns: updatedParentColumns,
      childColumns: updatedChildColumns
    })

    debug.completeState(DebugCategories.STATE, 'Columns updated with visibility', {
      tableId: state.value.currentTableId,
      columns: {
        parent: {
          count: updatedParentColumns.length,
          ids: updatedParentColumns.map((col) => col.id),
          visible: updatedParentColumns.filter((col) => col.visible).length
        },
        child: {
          count: updatedChildColumns.length,
          ids: updatedChildColumns.map((col) => col.id),
          visible: updatedChildColumns.filter((col) => col.visible).length
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

    // Create default table
    const defaultTable: TableSettings = {
      ...defaultTableConfig,
      parentColumns: [],
      childColumns: [],
      lastUpdateTimestamp: Date.now()
    }

    // Set default table
    initialState.tables.set(defaultTable.id, defaultTable)
    initialState.currentTableId = defaultTable.id

    debug.log(DebugCategories.STATE, 'Default table reset')

    // Update state
    state.value = initialState

    debug.log(DebugCategories.STATE, 'Table store reset with defaults', {
      tableId: defaultTable.id
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

    // Column management
    updateColumns,

    // Store management
    initialize,
    reset
  }
}

// Store factory
let storeInstance: TableStore | null = null

/**
 * Table store composable
 * Creates or returns the global table store instance
 */
export function useTableStore(options: TableStoreOptions = {}) {
  if (!storeInstance || options.apolloClient) {
    storeInstance = createTableStore(options)
  }
  return storeInstance
}

// Reset store (useful for testing)
export function resetTableStore() {
  storeInstance = null
}
