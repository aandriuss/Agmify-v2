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
  // Parent table columns
  parentBaseColumns: [], // Base columns from PostgreSQL
  parentAvailableColumns: [], // All available columns (including custom)
  parentVisibleColumns: [], // Currently visible columns
  // Child table columns
  childBaseColumns: [], // Base columns from PostgreSQL
  childAvailableColumns: [], // All available columns (including custom)
  childVisibleColumns: [], // Currently visible columns
  // Parameters
  mergedParentParameters: [],
  mergedChildParameters: [],
  processedParameters: {},
  parameterDefinitions: {},
  // Headers
  availableHeaders: { parent: [], child: [] },
  // Categories
  selectedCategories: new Set(),
  selectedParentCategories: [],
  selectedChildCategories: [],
  // Table info
  tablesArray: [],
  tableName: '',
  selectedTableId: '',
  currentTableId: '',
  tableKey: '',
  // State
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
    // Parent table columns
    parentBaseColumns: computed(() => internalState.value.parentBaseColumns),
    parentAvailableColumns: computed(() => internalState.value.parentAvailableColumns),
    parentVisibleColumns: computed(() => internalState.value.parentVisibleColumns),
    // Child table columns
    childBaseColumns: computed(() => internalState.value.childBaseColumns),
    childAvailableColumns: computed(() => internalState.value.childAvailableColumns),
    childVisibleColumns: computed(() => internalState.value.childVisibleColumns),
    // Parameters
    mergedParentParameters: computed(() => internalState.value.mergedParentParameters),
    mergedChildParameters: computed(() => internalState.value.mergedChildParameters),
    processedParameters: computed(() => internalState.value.processedParameters),
    parameterDefinitions: computed(() => internalState.value.parameterDefinitions),
    // Headers
    availableHeaders: computed(() => internalState.value.availableHeaders),
    // Categories
    selectedCategories: computed(() => internalState.value.selectedCategories),
    selectedParentCategories: computed(
      () => internalState.value.selectedParentCategories
    ),
    selectedChildCategories: computed(
      () => internalState.value.selectedChildCategories
    ),
    // Table info
    tablesArray: computed(() => internalState.value.tablesArray),
    tableName: computed(() => internalState.value.tableName),
    selectedTableId: computed(() => internalState.value.selectedTableId),
    currentTableId: computed(() => internalState.value.currentTableId),
    tableKey: computed(() => internalState.value.tableKey),
    // State
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
    setColumns: (
      parentColumns: ColumnDef[],
      childColumns: ColumnDef[],
      type: 'base' | 'available' | 'visible'
    ) => {
      const updates: Partial<StoreState> = {}
      if (type === 'base') {
        updates.parentBaseColumns = parentColumns
        updates.childBaseColumns = childColumns
      } else if (type === 'available') {
        updates.parentAvailableColumns = parentColumns
        updates.childAvailableColumns = childColumns
      } else {
        updates.parentVisibleColumns = parentColumns
        updates.childVisibleColumns = childColumns
      }
      return lifecycle.update(updates)
    },
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
