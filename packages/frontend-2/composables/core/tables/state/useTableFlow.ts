import { ref, computed, type ComputedRef } from 'vue'
import type {
  NamedTableConfig,
  Parameter,
  UserParameter
} from '~/composables/core/types'
import {
  createUserParameterWithDefaults,
  isUserParameter
} from '~/composables/core/types/parameters/parameter-types'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import { useStore } from '~/composables/core/store'

export interface UseTableFlowOptions {
  currentTable: ComputedRef<NamedTableConfig | null>
  defaultConfig: {
    id: string
    name: string
    displayName: string
    parentColumns: NamedTableConfig['parentColumns']
    childColumns: NamedTableConfig['childColumns']
    categoryFilters: NamedTableConfig['categoryFilters']
    selectedParameterIds: string[]
    userParameters?: Parameter[]
    lastUpdateTimestamp: number
  }
}

interface InitializationState {
  initialized: boolean
  loading: boolean
  error: Error | null
}

/**
 * Convert parameters to user parameters
 */
function ensureUserParameters(parameters: Parameter[]): UserParameter[] {
  return parameters
    .filter((param): param is UserParameter => isUserParameter(param))
    .map((param) =>
      createUserParameterWithDefaults({
        ...param,
        group: param.group || 'Custom'
      })
    )
}

/**
 * Manages the flow of data and initialization between different parts of the table system,
 * ensuring proper type conversion and state management.
 */
export function useTableFlow({ currentTable, defaultConfig }: UseTableFlowOptions) {
  const store = useStore()
  const state = ref<InitializationState>({
    initialized: false,
    loading: false,
    error: null
  })

  // Keep the NamedTableConfig type intact, use defaults if no table
  const tableConfig = computed<NamedTableConfig>(() => {
    const table = currentTable.value
    if (!table) {
      debug.log(DebugCategories.STATE, 'No table available, using defaults', {
        defaultColumns: defaultConfig.parentColumns.length,
        defaultDetailColumns: defaultConfig.childColumns.length
      })
      return {
        ...defaultConfig,
        id: defaultConfig.id,
        name: defaultConfig.name,
        displayName: defaultConfig.displayName,
        lastUpdateTimestamp: Date.now()
      }
    }

    debug.log(DebugCategories.STATE, 'Processing table config', {
      id: table.id,
      name: table.name,
      parentColumnsCount: table.parentColumns.length,
      childColumnsCount: table.childColumns.length
    })

    // Ensure required columns are present
    const parentColumns = table.parentColumns.length
      ? table.parentColumns
      : defaultConfig.parentColumns
    const childColumns = table.childColumns.length
      ? table.childColumns
      : defaultConfig.childColumns

    // Return table with defaults as fallback
    return {
      ...table,
      parentColumns,
      childColumns,
      categoryFilters: table.categoryFilters || defaultConfig.categoryFilters,
      userParameters: ensureUserParameters(
        table.userParameters || defaultConfig.userParameters || []
      ),
      selectedParameterIds:
        table.selectedParameterIds || defaultConfig.selectedParameterIds,
      lastUpdateTimestamp: table.lastUpdateTimestamp || Date.now()
    }
  })

  /**
   * Initializes the table system
   */
  async function initialize() {
    debug.startState(DebugCategories.INITIALIZATION, 'Table initialization')
    state.value.loading = true
    state.value.error = null

    try {
      // Only initialize if not already initialized
      if (!store.initialized.value) {
        // Initialize store with table config
        await store.lifecycle.update({
          selectedTableId: tableConfig.value.id,
          currentTableId: tableConfig.value.id,
          tableName: tableConfig.value.name,
          parentBaseColumns: tableConfig.value.parentColumns,
          childBaseColumns: tableConfig.value.childColumns,
          parentVisibleColumns: tableConfig.value.parentColumns,
          childVisibleColumns: tableConfig.value.childColumns,
          selectedParentCategories:
            tableConfig.value.categoryFilters.selectedParentCategories,
          selectedChildCategories:
            tableConfig.value.categoryFilters.selectedChildCategories,
          userParameters: ensureUserParameters(tableConfig.value.userParameters || [])
        })

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
      }
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
