import { ref, computed, unref } from 'vue'
import type { Store, StoreState } from '../../types'
import { debug, DebugCategories } from '../../utils/debug'
import { createMutations } from './mutations'
import {
  defaultColumns,
  defaultDetailColumns,
  defaultTable
} from '../../config/defaultColumns'

// Store singleton instance
let store: Store | null = null

// Initialize store
export function createStore(): Store {
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
      debug.startState('Store initialization')
      try {
        await mutations.setLoading(true)
        await mutations.setError(null)

        // Initialize with default state
        if (!internalState.value.initialized) {
          debug.log(DebugCategories.INITIALIZATION, 'Initializing store state', {
            hasScheduleData: internalState.value.scheduleData.length > 0,
            hasTableData: internalState.value.tableData.length > 0
          })

          // Set initial state
          await mutations.setInitialized(true)

          debug.log(DebugCategories.STATE, 'Store state initialized', {
            scheduleDataLength: internalState.value.scheduleData.length,
            tableDataLength: internalState.value.tableData.length,
            columnsLength: internalState.value.mergedTableColumns.length
          })
        }

        debug.completeState('Store initialization')
      } catch (error) {
        debug.error(DebugCategories.ERROR, 'Store initialization failed:', error)
        await mutations.setError(
          error instanceof Error ? error : new Error(String(error))
        )
        throw error
      } finally {
        await mutations.setLoading(false)
      }
    },

    update: async (state: Partial<StoreState>) => {
      debug.startState('Store update')
      try {
        await mutations.setLoading(true)

        debug.log(DebugCategories.STATE, 'Updating store state', {
          updateKeys: Object.keys(state),
          currentState: {
            hasScheduleData: internalState.value.scheduleData.length > 0,
            hasTableData: internalState.value.tableData.length > 0,
            initialized: internalState.value.initialized
          }
        })

        // Initialize if we have data but not initialized
        if (
          !internalState.value.initialized &&
          (state.scheduleData?.length || state.tableData?.length)
        ) {
          await mutations.setInitialized(true)
        }

        // Handle each state property explicitly with proper type checks
        if ('projectId' in state && state.projectId !== undefined) {
          await mutations.setProjectId(state.projectId)
        }

        if ('scheduleData' in state && state.scheduleData) {
          await mutations.setScheduleData(state.scheduleData)
        }

        if ('evaluatedData' in state && state.evaluatedData) {
          await mutations.setEvaluatedData(state.evaluatedData)
        }

        if ('tableData' in state && state.tableData) {
          await mutations.setTableData(state.tableData)
        }

        if ('customParameters' in state && state.customParameters) {
          await mutations.setCustomParameters(state.customParameters)
        }

        if ('parameterColumns' in state && state.parameterColumns) {
          await mutations.setParameterColumns(state.parameterColumns)
        }

        if ('availableHeaders' in state && state.availableHeaders) {
          await mutations.setAvailableHeaders(state.availableHeaders)
        }

        if ('selectedCategories' in state && state.selectedCategories) {
          await mutations.setSelectedCategories(state.selectedCategories)
        }

        if ('selectedParentCategories' in state && state.selectedParentCategories) {
          await mutations.setParentCategories(state.selectedParentCategories)
        }

        if ('selectedChildCategories' in state && state.selectedChildCategories) {
          await mutations.setChildCategories(state.selectedChildCategories)
        }

        if ('tablesArray' in state && state.tablesArray) {
          await mutations.setTablesArray(state.tablesArray)
        }

        debug.log(DebugCategories.STATE, 'Store update complete', {
          updatedState: {
            hasScheduleData: internalState.value.scheduleData.length > 0,
            hasTableData: internalState.value.tableData.length > 0,
            initialized: internalState.value.initialized
          }
        })

        debug.completeState('Store update')
      } catch (error) {
        debug.error(DebugCategories.ERROR, 'Store update failed:', error)
        await mutations.setError(
          error instanceof Error ? error : new Error(String(error))
        )
        throw error
      } finally {
        await mutations.setLoading(false)
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
    ...mutations,

    // Lifecycle
    lifecycle
  }
}

// Get or create store instance
export function useStore(): Store {
  if (!store) {
    store = createStore()
  }
  return store
}

// Export default instance
export default useStore
