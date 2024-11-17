import { ref, computed } from 'vue'
import type { Store, StoreState } from '../core/types'
import { debug, DebugCategories } from '../utils/debug'
import { createMutations } from '../core/store/mutations'
import type { ViewerState } from './useScheduleSetup'

const initialState: StoreState = {
  projectId: null,
  scheduleData: [],
  evaluatedData: [],
  tableData: [],
  customParameters: [],
  parameterColumns: [],
  mergedParentParameters: [],
  mergedChildParameters: [],
  processedParameters: {},
  currentTableColumns: [],
  currentDetailColumns: [],
  mergedTableColumns: [],
  mergedDetailColumns: [],
  parameterDefinitions: {},
  availableHeaders: { parent: [], child: [] },
  selectedCategories: new Set(),
  selectedParentCategories: [],
  selectedChildCategories: [],
  tablesArray: [],
  tableName: '',
  selectedTableId: '',
  currentTableId: '',
  tableKey: '',
  initialized: false,
  loading: false,
  error: null
}

function createStore(viewerState: ViewerState): Store {
  // Internal mutable state
  const internalState = ref<StoreState>(initialState)

  // Create mutations
  const mutations = createMutations(internalState)

  // Type-safe update helper
  async function updateStateValue<K extends keyof StoreState>(
    key: K,
    value: StoreState[K]
  ): Promise<void> {
    internalState.value[key] = value
    await new Promise((resolve) => setTimeout(resolve, 0)) // Ensure Vue reactivity
  }

  // Lifecycle
  const lifecycle = {
    init: async () => {
      debug.log(DebugCategories.INITIALIZATION, 'Initializing store')
      try {
        mutations.setLoading(true)
        mutations.setError(null)

        // Check project ID
        if (!internalState.value.projectId) {
          debug.warn(DebugCategories.INITIALIZATION, 'No project ID provided')
          return
        }

        debug.log(
          DebugCategories.INITIALIZATION,
          'Using project ID:',
          internalState.value.projectId
        )

        // Check viewer state
        if (!viewerState?.viewer?.instance) {
          throw new Error('Viewer state not available')
        }

        // Wait for viewer initialization
        const startTime = Date.now()
        while (!viewerState.viewer.init.ref.value) {
          if (Date.now() - startTime > 10000) {
            throw new Error('Timeout waiting for viewer initialization')
          }
          await new Promise((resolve) => setTimeout(resolve, 100))
        }

        debug.log(DebugCategories.INITIALIZATION, 'Store initialization complete', {
          projectId: internalState.value.projectId,
          viewerInitialized: true
        })
        mutations.setInitialized(true)
      } catch (error) {
        debug.error(DebugCategories.ERROR, 'Store initialization failed:', error)
        mutations.setError(error instanceof Error ? error : new Error(String(error)))
        throw error
      } finally {
        mutations.setLoading(false)
      }
    },
    update: async (state: Partial<StoreState>) => {
      debug.log(DebugCategories.STATE, 'Updating store state', state)
      try {
        mutations.setLoading(true)
        const updates = Object.entries(state).map(([key, value]) => {
          const typedKey = key as keyof StoreState
          return updateStateValue(typedKey, value as StoreState[typeof typedKey])
        })
        await Promise.all(updates)
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
      mutations.reset()
    }
  }

  return {
    // Readonly state
    state: computed(() => internalState.value),
    projectId: computed(() => internalState.value.projectId),
    scheduleData: computed(() => internalState.value.scheduleData),
    evaluatedData: computed(() => internalState.value.evaluatedData),
    tableData: computed(() => internalState.value.tableData),
    customParameters: computed(() => internalState.value.customParameters),
    parameterColumns: computed(() => internalState.value.parameterColumns),
    mergedParentParameters: computed(() => internalState.value.mergedParentParameters),
    mergedChildParameters: computed(() => internalState.value.mergedChildParameters),
    processedParameters: computed(() => internalState.value.processedParameters),
    currentTableColumns: computed(() => internalState.value.currentTableColumns),
    currentDetailColumns: computed(() => internalState.value.currentDetailColumns),
    mergedTableColumns: computed(() => internalState.value.mergedTableColumns),
    mergedDetailColumns: computed(() => internalState.value.mergedDetailColumns),
    parameterDefinitions: computed(() => internalState.value.parameterDefinitions),
    availableHeaders: computed(() => internalState.value.availableHeaders),
    selectedCategories: computed(() => internalState.value.selectedCategories),
    selectedParentCategories: computed(
      () => internalState.value.selectedParentCategories
    ),
    selectedChildCategories: computed(
      () => internalState.value.selectedChildCategories
    ),
    tablesArray: computed(() => internalState.value.tablesArray),
    tableName: computed(() => internalState.value.tableName),
    selectedTableId: computed(() => internalState.value.selectedTableId),
    currentTableId: computed(() => internalState.value.currentTableId),
    tableKey: computed(() => internalState.value.tableKey),
    initialized: computed(() => internalState.value.initialized),
    loading: computed(() => internalState.value.loading),
    error: computed(() => internalState.value.error),

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
    lifecycle
  }
}

// Export a function to create store instances
export function createScheduleStore(viewerState: ViewerState) {
  return createStore(viewerState)
}
