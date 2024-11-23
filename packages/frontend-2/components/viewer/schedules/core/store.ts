import { ref, computed } from 'vue'
import type {
  Store,
  StoreState,
  ElementData,
  TableRow,
  ProcessedHeader
} from '../types'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import type { CustomParameter } from '~/composables/useUserSettings'
import { useDebug, DebugCategories } from '../debug/useDebug'
import { useInjectedViewer } from '~~/lib/viewer/composables/setup'

// Initialize debug
const debug = useDebug()

const initialState: StoreState = {
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
        await Promise.resolve() // Make async to satisfy eslint
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
  const store: Store = {
    state: computed(() => internalState.value),
    lifecycle,

    // Computed properties
    projectId: computed(() => internalState.value.projectId),
    scheduleData: computed(() => internalState.value.scheduleData),
    evaluatedData: computed(() => internalState.value.evaluatedData),
    tableData: computed(() => internalState.value.tableData),
    customParameters: computed(() => internalState.value.customParameters),
    parameterColumns: computed(() => internalState.value.parameterColumns),
    parentParameterColumns: computed(() => internalState.value.parentParameterColumns),
    childParameterColumns: computed(() => internalState.value.childParameterColumns),
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
    setProjectId: (id: string | null) => lifecycle.update({ projectId: id }),
    setScheduleData: (data: ElementData[]) => lifecycle.update({ scheduleData: data }),
    setEvaluatedData: (data: ElementData[]) =>
      lifecycle.update({ evaluatedData: data }),
    setTableData: (data: TableRow[]) => lifecycle.update({ tableData: data }),
    setCustomParameters: (params: CustomParameter[]) =>
      lifecycle.update({ customParameters: params }),
    setParameterColumns: (columns: ColumnDef[]) =>
      lifecycle.update({ parameterColumns: columns }),
    setAvailableHeaders: (headers: {
      parent: ProcessedHeader[]
      child: ProcessedHeader[]
    }) => lifecycle.update({ availableHeaders: headers }),
    setSelectedCategories: (categories: Set<string>) =>
      lifecycle.update({ selectedCategories: categories }),
    setParentCategories: (categories: string[]) =>
      lifecycle.update({ selectedParentCategories: categories }),
    setChildCategories: (categories: string[]) =>
      lifecycle.update({ selectedChildCategories: categories }),
    setTablesArray: (tables: { id: string; name: string }[]) =>
      lifecycle.update({ tablesArray: tables }),
    setTableInfo: (info: { selectedTableId?: string; tableName?: string }) =>
      lifecycle.update(info),
    setMergedColumns: (parentColumns: ColumnDef[], childColumns: ColumnDef[]) =>
      lifecycle.update({
        mergedTableColumns: parentColumns,
        mergedDetailColumns: childColumns
      }),
    setInitialized: (value: boolean) => lifecycle.update({ initialized: value }),
    setLoading: (value: boolean) => lifecycle.update({ loading: value }),
    setError: (error: Error | null) => lifecycle.update({ error })
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
