import { ref, computed } from 'vue'
import type { Store, StoreState } from './types'
import { debug, DebugCategories } from '../utils/debug'
import { useInjectedViewer } from '~~/lib/viewer/composables/setup'

const initialState: StoreState = {
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
  tablesArray: [],
  tableName: '',
  selectedTableId: '',
  currentTableId: '',
  tableKey: '',
  initialized: false,
  loading: false,
  error: null
}

export function createStore(): Store {
  const internalState = ref<StoreState>(initialState)

  // Lifecycle methods
  const lifecycle = {
    init: async () => {
      debug.log(DebugCategories.INITIALIZATION, 'Initializing store')
      try {
        internalState.value.loading = true
        internalState.value.error = null

        // Wait for viewer to be available
        let viewer
        try {
          viewer = useInjectedViewer()
          if (!viewer) {
            throw new Error('Viewer state not available')
          }
        } catch (error) {
          debug.error(DebugCategories.ERROR, 'Error accessing viewer state:', error)
          throw new Error('Failed to access viewer state')
        }

        // Wait for viewer initialization
        const startTime = Date.now()
        while (!viewer.init.ref.value) {
          if (Date.now() - startTime > 10000) {
            throw new Error('Timeout waiting for viewer initialization')
          }
          await new Promise((resolve) => setTimeout(resolve, 100))
        }

        debug.log(DebugCategories.INITIALIZATION, 'Store initialization complete')
        internalState.value.initialized = true
      } catch (error) {
        debug.error(DebugCategories.ERROR, 'Store initialization failed:', error)
        internalState.value.error =
          error instanceof Error ? error : new Error(String(error))
        throw error
      } finally {
        internalState.value.loading = false
      }
    },

    update: async (state: Partial<StoreState>) => {
      debug.log(DebugCategories.STATE, 'Updating store state', state)
      try {
        internalState.value = {
          ...internalState.value,
          ...state
        }
      } catch (error) {
        debug.error(DebugCategories.ERROR, 'Error updating store state:', error)
        throw error
      }
    },

    cleanup: () => {
      debug.log(DebugCategories.STATE, 'Cleaning up store')
      internalState.value = { ...initialState }
    }
  }

  // Create computed properties for all state fields
  const store = {
    state: computed(() => internalState.value),
    lifecycle,

    // Computed properties
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
    tablesArray: computed(() => internalState.value.tablesArray),
    tableName: computed(() => internalState.value.tableName),
    selectedTableId: computed(() => internalState.value.selectedTableId),
    currentTableId: computed(() => internalState.value.currentTableId),
    tableKey: computed(() => internalState.value.tableKey),
    initialized: computed(() => internalState.value.initialized),
    loading: computed(() => internalState.value.loading),
    error: computed(() => internalState.value.error),

    // Mutations
    setScheduleData: (data) => lifecycle.update({ scheduleData: data }),
    setEvaluatedData: (data) => lifecycle.update({ evaluatedData: data }),
    setTableData: (data) => lifecycle.update({ tableData: data }),
    setCustomParameters: (params) => lifecycle.update({ customParameters: params }),
    setParameterColumns: (columns) => lifecycle.update({ parameterColumns: columns }),
    setMergedParameters: (parent, child) =>
      lifecycle.update({
        mergedParentParameters: parent,
        mergedChildParameters: child
      }),
    setProcessedParameters: (params) =>
      lifecycle.update({ processedParameters: params }),
    setCurrentColumns: (table, detail) =>
      lifecycle.update({
        currentTableColumns: table,
        currentDetailColumns: detail
      }),
    setMergedColumns: (table, detail) =>
      lifecycle.update({
        mergedTableColumns: table,
        mergedDetailColumns: detail
      }),
    setParameterDefinitions: (defs) => lifecycle.update({ parameterDefinitions: defs }),
    setAvailableHeaders: (headers) => lifecycle.update({ availableHeaders: headers }),
    setTableInfo: (info) => lifecycle.update(info),
    setTablesArray: (tables) => lifecycle.update({ tablesArray: tables }),
    setInitialized: (value) => lifecycle.update({ initialized: value }),
    setLoading: (value) => lifecycle.update({ loading: value }),
    setError: (err) => lifecycle.update({ error: err }),
    setColumnVisibility: (columnId, visible) => {
      const columns = [...internalState.value.currentTableColumns]
      const column = columns.find((c) => c.field === columnId)
      if (column) {
        column.visible = visible
        lifecycle.update({ currentTableColumns: columns })
      }
    },
    setColumnOrder: (columnId, newIndex) => {
      const columns = [...internalState.value.currentTableColumns]
      const oldIndex = columns.findIndex((c) => c.field === columnId)
      if (oldIndex !== -1) {
        const [column] = columns.splice(oldIndex, 1)
        columns.splice(newIndex, 0, column)
        lifecycle.update({ currentTableColumns: columns })
      }
    },
    setElementVisibility: (elementId, visible) => {
      const data = [...internalState.value.tableData]
      const element = data.find((e) => e.id === elementId)
      if (element) {
        element._visible = visible
        lifecycle.update({ tableData: data })
      }
    },
    setParameterVisibility: (parameterId, visible) => {
      const params = [...internalState.value.parameterColumns]
      const param = params.find((p) => p.field === parameterId)
      if (param) {
        param.visible = visible
        lifecycle.update({ parameterColumns: params })
      }
    },
    setParameterOrder: (parameterId, newIndex) => {
      const params = [...internalState.value.parameterColumns]
      const oldIndex = params.findIndex((p) => p.field === parameterId)
      if (oldIndex !== -1) {
        const [param] = params.splice(oldIndex, 1)
        params.splice(newIndex, 0, param)
        lifecycle.update({ parameterColumns: params })
      }
    },
    processData: async () => {
      try {
        internalState.value.loading = true
        await Promise.all([
          // Add data processing promises here
        ])
      } catch (err) {
        internalState.value.error = err instanceof Error ? err : new Error(String(err))
        throw err
      } finally {
        internalState.value.loading = false
      }
    },
    reset: () => lifecycle.cleanup()
  }

  return store
}

// Store instance
let storeInstance: Store | null = null

// Singleton accessor
export function useStore(): Store {
  if (!storeInstance) {
    storeInstance = createStore()
  }
  return storeInstance
}

// Reset store (useful for testing)
export function resetStore(): void {
  storeInstance = null
}
