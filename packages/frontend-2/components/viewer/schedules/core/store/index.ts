import { computed } from 'vue'
import { state, initialState } from './store'
import { createMutations } from './mutations'
import type { Store, StoreState } from '../types'
import { debug, DebugCategories } from '../../utils/debug'

// Create mutations
const mutations = createMutations(state)

// Helper function for type-safe state updates
function updateStateValue<K extends keyof StoreState>(
  key: K,
  value: StoreState[K]
): void {
  state.value[key] = value
}

// Create store
export function useStore(): Store {
  return {
    // State
    state: computed(() => state.value),
    projectId: computed(() => state.value.projectId),
    scheduleData: computed(() => state.value.scheduleData),
    evaluatedData: computed(() => state.value.evaluatedData),
    tableData: computed(() => state.value.tableData),
    customParameters: computed(() => state.value.customParameters),
    parameterColumns: computed(() => state.value.parameterColumns),
    mergedParentParameters: computed(() => state.value.mergedParentParameters),
    mergedChildParameters: computed(() => state.value.mergedChildParameters),
    processedParameters: computed(() => state.value.processedParameters),
    currentTableColumns: computed(() => state.value.currentTableColumns),
    currentDetailColumns: computed(() => state.value.currentDetailColumns),
    mergedTableColumns: computed(() => state.value.mergedTableColumns),
    mergedDetailColumns: computed(() => state.value.mergedDetailColumns),
    parameterDefinitions: computed(() => state.value.parameterDefinitions),
    availableHeaders: computed(() => state.value.availableHeaders),
    selectedCategories: computed(() => state.value.selectedCategories),
    selectedParentCategories: computed(() => state.value.selectedParentCategories),
    selectedChildCategories: computed(() => state.value.selectedChildCategories),
    tablesArray: computed(() => state.value.tablesArray),
    tableName: computed(() => state.value.tableName),
    selectedTableId: computed(() => state.value.selectedTableId),
    currentTableId: computed(() => state.value.currentTableId),
    tableKey: computed(() => state.value.tableKey),
    initialized: computed(() => state.value.initialized),
    loading: computed(() => state.value.loading),
    error: computed(() => state.value.error),

    // Mutations
    setProjectId: mutations.setProjectId,
    setScheduleData: mutations.setScheduleData,
    setEvaluatedData: mutations.setEvaluatedData,
    setTableData: mutations.setTableData,
    setCustomParameters: mutations.setCustomParameters,
    setParameterColumns: mutations.setParameterColumns,
    setMergedParameters: mutations.setMergedParameters,
    setProcessedParameters: mutations.setProcessedParameters,
    setParameterDefinitions: mutations.setParameterDefinitions,
    setParameterVisibility: mutations.setParameterVisibility,
    setParameterOrder: mutations.setParameterOrder,
    setCurrentColumns: mutations.setCurrentColumns,
    setMergedColumns: mutations.setMergedColumns,
    setColumnVisibility: mutations.setColumnVisibility,
    setColumnOrder: mutations.setColumnOrder,
    setSelectedCategories: mutations.setSelectedCategories,
    setParentCategories: mutations.setParentCategories,
    setChildCategories: mutations.setChildCategories,
    setTableInfo: mutations.setTableInfo,
    setTablesArray: mutations.setTablesArray,
    setElementVisibility: mutations.setElementVisibility,
    setAvailableHeaders: mutations.setAvailableHeaders,
    setInitialized: mutations.setInitialized,
    setLoading: mutations.setLoading,
    setError: mutations.setError,
    processData: mutations.processData,
    reset: mutations.reset,

    // Lifecycle
    lifecycle: {
      init: async () => {
        debug.log(DebugCategories.INITIALIZATION, 'Initializing store')
        try {
          mutations.setLoading(true)
          mutations.setError(null)

          // Validate project ID
          if (!state.value.projectId) {
            throw new Error('Project ID is required but not provided')
          }

          // Wait for any async initialization tasks
          await Promise.resolve()

          debug.log(DebugCategories.INITIALIZATION, 'Store initialization complete')
          mutations.setInitialized(true)
        } catch (error) {
          debug.error(DebugCategories.ERROR, 'Store initialization failed:', error)
          mutations.setError(error instanceof Error ? error : new Error(String(error)))
          throw error
        } finally {
          mutations.setLoading(false)
        }
      },
      update: async (newState: Partial<StoreState>) => {
        debug.log(DebugCategories.STATE, 'Updating store state', newState)
        try {
          mutations.setLoading(true)

          // Process updates sequentially to maintain consistency
          for (const [key, value] of Object.entries(newState)) {
            const typedKey = key as keyof StoreState
            if (typedKey in state.value) {
              // Ensure type safety with the helper function
              updateStateValue(typedKey, value as StoreState[typeof typedKey])
              // Add a small delay to ensure Vue reactivity
              await new Promise((resolve) => setTimeout(resolve, 0))
            }
          }
        } catch (error) {
          debug.error(DebugCategories.ERROR, 'Store update failed:', error)
          mutations.setError(error instanceof Error ? error : new Error(String(error)))
          throw error
        } finally {
          mutations.setLoading(false)
        }
      },
      cleanup: () => {
        debug.log(DebugCategories.STATE, 'Cleaning up store')
        state.value = { ...initialState }
      }
    }
  }
}
