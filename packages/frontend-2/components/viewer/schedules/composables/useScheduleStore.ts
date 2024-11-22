import { ref, computed, unref } from 'vue'
import type { Store, StoreState } from '../types'
import { debug, DebugCategories } from '../utils/debug'
import { createMutations } from '../core/store/mutations'
import type { useInjectedViewerState } from '~/lib/viewer/composables/setup'
import {
  defaultColumns,
  defaultDetailColumns,
  defaultTable
} from '../config/defaultColumns'

// Store singleton instance
let store: Store | null = null

// Initialize store with viewer state
export async function initializeStore(
  viewerState: ReturnType<typeof useInjectedViewerState>
) {
  if (!store) {
    store = createStore()
  }

  // Set project ID if available
  if (viewerState.projectId.value) {
    await store.setProjectId(viewerState.projectId.value)
  }

  return store
}

function createStore(): Store {
  // Internal mutable state
  const internalState = ref<StoreState>({
    projectId: null,
    scheduleData: [],
    evaluatedData: [],
    tableData: [],
    customParameters: [],
    parameterColumns: [],
    parentParameterColumns: [],
    childParameterColumns: [],
    mergedParentParameters: [],
    mergedChildParameters: [],
    processedParameters: {},
    currentTableColumns: defaultColumns,
    currentDetailColumns: defaultDetailColumns,
    mergedTableColumns: defaultColumns,
    mergedDetailColumns: defaultDetailColumns,
    parameterDefinitions: {},
    availableHeaders: { parent: [], child: [] },
    selectedCategories: new Set(),
    selectedParentCategories: defaultTable.categoryFilters.selectedParentCategories,
    selectedChildCategories: defaultTable.categoryFilters.selectedChildCategories,
    tablesArray: [],
    tableName: defaultTable.name,
    selectedTableId: defaultTable.id,
    currentTableId: defaultTable.id,
    tableKey: '0',
    initialized: false,
    loading: false,
    error: null
  })

  // Create mutations
  const mutations = createMutations(internalState)

  // Lifecycle
  const lifecycle = {
    init: async () => {
      debug.log(DebugCategories.INITIALIZATION, 'Initializing store')
      try {
        mutations.setLoading(true)
        mutations.setError(null)

        debug.log(DebugCategories.INITIALIZATION, 'Store initialization starting', {
          projectId: internalState.value.projectId
        })

        // Initialize with default columns if none set
        if (!internalState.value.currentTableColumns.length) {
          await mutations.setCurrentColumns(defaultColumns, defaultDetailColumns)
        }

        if (!internalState.value.mergedTableColumns.length) {
          await mutations.setMergedColumns(defaultColumns, defaultDetailColumns)
        }

        // Initialize with default categories if none set
        if (!internalState.value.selectedParentCategories.length) {
          await mutations.setParentCategories(
            defaultTable.categoryFilters.selectedParentCategories
          )
        }

        if (!internalState.value.selectedChildCategories.length) {
          await mutations.setChildCategories(
            defaultTable.categoryFilters.selectedChildCategories
          )
        }

        debug.log(DebugCategories.INITIALIZATION, 'Store initialization complete', {
          projectId: internalState.value.projectId,
          columnsCount: internalState.value.currentTableColumns.length,
          detailColumnsCount: internalState.value.currentDetailColumns.length,
          parentCategories: internalState.value.selectedParentCategories,
          childCategories: internalState.value.selectedChildCategories,
          scheduleDataLength: internalState.value.scheduleData.length
        })

        await mutations.setInitialized(true)
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

        // Handle each state property explicitly with proper type checks
        if ('projectId' in state && state.projectId !== undefined) {
          mutations.setProjectId(state.projectId)
        }

        if ('scheduleData' in state && state.scheduleData) {
          mutations.setScheduleData(state.scheduleData)
        }

        if ('evaluatedData' in state && state.evaluatedData) {
          mutations.setEvaluatedData(state.evaluatedData)
        }

        if ('tableData' in state && state.tableData) {
          mutations.setTableData(state.tableData)
        }

        if ('customParameters' in state && state.customParameters) {
          mutations.setCustomParameters(state.customParameters)
        }

        if ('parameterColumns' in state && state.parameterColumns) {
          mutations.setParameterColumns(state.parameterColumns)
        }

        if ('availableHeaders' in state && state.availableHeaders) {
          mutations.setAvailableHeaders(state.availableHeaders)
        }

        if ('selectedCategories' in state && state.selectedCategories) {
          mutations.setSelectedCategories(state.selectedCategories)
        }

        if ('selectedParentCategories' in state && state.selectedParentCategories) {
          mutations.setParentCategories(state.selectedParentCategories)
        }

        if ('selectedChildCategories' in state && state.selectedChildCategories) {
          mutations.setChildCategories(state.selectedChildCategories)
        }

        if ('tablesArray' in state && state.tablesArray) {
          mutations.setTablesArray(state.tablesArray)
        }

        // Wait for any state updates to settle
        await new Promise((resolve) => setTimeout(resolve, 0))

        debug.log(DebugCategories.STATE, 'Store state updated successfully')
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
      store = null
    }
  }

  return {
    // Readonly state
    state: computed(() => internalState.value),
    projectId: computed(() => internalState.value.projectId),
    scheduleData: computed(() => [...unref(internalState.value.scheduleData)]),
    evaluatedData: computed(() => [...unref(internalState.value.evaluatedData)]),
    tableData: computed(() => [...unref(internalState.value.tableData)]),
    customParameters: computed(() => [...unref(internalState.value.customParameters)]),
    parameterColumns: computed(() => [...unref(internalState.value.parameterColumns)]),
    parentParameterColumns: computed(() => [
      ...unref(internalState.value.parentParameterColumns)
    ]),
    childParameterColumns: computed(() => [
      ...unref(internalState.value.childParameterColumns)
    ]),
    mergedParentParameters: computed(() => [
      ...unref(internalState.value.mergedParentParameters)
    ]),
    mergedChildParameters: computed(() => [
      ...unref(internalState.value.mergedChildParameters)
    ]),
    processedParameters: computed(() => internalState.value.processedParameters),
    currentTableColumns: computed(() => [
      ...unref(internalState.value.currentTableColumns)
    ]),
    currentDetailColumns: computed(() => [
      ...unref(internalState.value.currentDetailColumns)
    ]),
    mergedTableColumns: computed(() => [
      ...unref(internalState.value.mergedTableColumns)
    ]),
    mergedDetailColumns: computed(() => [
      ...unref(internalState.value.mergedDetailColumns)
    ]),
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
    setParentParameterColumns: mutations.setParentParameterColumns,
    setChildParameterColumns: mutations.setChildParameterColumns,
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
    reset: mutations.reset,

    // Lifecycle
    lifecycle
  }
}

// Create and initialize store
export function useScheduleStore() {
  if (!store) {
    store = createStore()
  }
  return store
}

// Export default instance
export default useScheduleStore()
