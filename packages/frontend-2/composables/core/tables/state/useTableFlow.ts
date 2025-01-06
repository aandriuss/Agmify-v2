import { ref, computed, type ComputedRef } from 'vue'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import { useStore } from '~/composables/core/store'
import { useTableStore } from '~/composables/core/tables/store/store'
import { useParameterStore } from '~/composables/core/parameters/store'
import { createTableColumns } from '~/composables/core/types/tables/table-column'
import { defaultSelectedParameters } from '../config/defaults'
import type { TableSettings } from '../store/types'

export interface UseTableFlowOptions {
  currentTable: ComputedRef<TableSettings | null>
  defaultConfig: TableSettings
}

interface InitializationState {
  initialized: boolean
  loading: boolean
  error: Error | null
}

/**
 * Manages the flow of data and initialization between different parts of the table system,
 * ensuring proper type conversion and state management.
 */
export function useTableFlow({ currentTable, defaultConfig }: UseTableFlowOptions) {
  const store = useStore()
  const tableStore = useTableStore()
  const parameterStore = useParameterStore()

  const state = ref<InitializationState>({
    initialized: false,
    loading: false,
    error: null
  })

  // Create table config from current table or defaults
  const tableConfig = computed<TableSettings>(() => {
    const table = currentTable.value || defaultConfig
    const selectedParams = table.selectedParameters

    // Create columns from selected parameters if they don't exist
    const parentColumns = table.parentColumns?.length
      ? table.parentColumns
      : createTableColumns(selectedParams.parent)
    const childColumns = table.childColumns?.length
      ? table.childColumns
      : createTableColumns(selectedParams.child)

    // Only update timestamp if columns changed
    const timestamp = table.lastUpdateTimestamp || Date.now()

    return {
      ...table,
      parentColumns,
      childColumns,
      lastUpdateTimestamp: timestamp
    }
  })

  /**
   * Initialize stores and load data
   */
  async function initializeStore() {
    debug.startState(DebugCategories.INITIALIZATION, 'Initializing stores')

    try {
      // Initialize core store if needed
      if (!store.initialized.value) {
        debug.log(DebugCategories.INITIALIZATION, 'Initializing core store')
        await store.lifecycle.init()
      }

      // Initialize parameter store if needed
      if (!parameterStore.state.value.initialized) {
        debug.log(DebugCategories.INITIALIZATION, 'Initializing parameter store')
        await parameterStore.init()
      }

      // Get parameters from PostgreSQL or defaults
      const config = {
        ...tableConfig.value,
        selectedParameters:
          tableConfig.value.selectedParameters || defaultSelectedParameters
      }

      // Only update if needed
      const currentConfig = tableStore.currentTable.value
      const needsUpdate =
        !currentConfig ||
        currentConfig.id !== config.id ||
        currentConfig.parentColumns.length !== config.parentColumns.length ||
        currentConfig.childColumns.length !== config.childColumns.length

      if (needsUpdate) {
        debug.log(DebugCategories.INITIALIZATION, 'Updating table store')
        await tableStore.updateTable(config)

        // Update core store with table info
        await store.lifecycle.update({
          selectedTableId: config.id,
          currentTableId: config.id,
          tableName: config.name
        })
      } else {
        debug.log(DebugCategories.INITIALIZATION, 'Table store up to date')
      }

      debug.log(DebugCategories.INITIALIZATION, 'Stores initialized')
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to initialize store:', err)
      throw err
    }
  }

  /**
   * Initializes the table system
   */
  async function initialize() {
    debug.startState(DebugCategories.INITIALIZATION, 'Table initialization')
    state.value.loading = true
    state.value.error = null

    try {
      // First initialize store with base configuration
      await initializeStore()

      // Mark as initialized so data loading can proceed
      state.value.initialized = true

      debug.log(DebugCategories.INITIALIZATION, 'Table initialization complete', {
        storeInitialized: store.initialized.value,
        tableInitialized: state.value.initialized,
        tableId: tableConfig.value.id,
        columnsCount: {
          parent: tableConfig.value.parentColumns.length,
          child: tableConfig.value.childColumns.length
        }
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      state.value.error = new Error(`Initialization failed: ${errorMessage}`)

      debug.error(DebugCategories.ERROR, 'Initialization failed:', {
        error: err,
        storeState: {
          initialized: store.initialized.value,
          tableInitialized: state.value.initialized,
          tableId: tableConfig.value.id
        }
      })
      throw state.value.error
    } finally {
      state.value.loading = false
      debug.completeState(DebugCategories.INITIALIZATION, 'Table initialization')
    }
  }

  // Computed properties for state
  const isInitialized = computed(
    () => state.value.initialized && store.initialized.value
  )
  const isLoading = computed(() => state.value.loading)
  const error = computed(() => state.value.error)

  return {
    // Table configuration
    tableConfig,

    // Initialization
    initialize,
    isInitialized,
    isLoading,
    error,

    // State management
    state: computed(() => state.value)
  }
}
