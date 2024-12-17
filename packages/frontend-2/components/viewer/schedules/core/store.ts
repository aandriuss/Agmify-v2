import { ref, computed } from 'vue'
import type {
  Store,
  StoreState,
  ElementData,
  TableRow,
  Parameter,
  ColumnDef,
  UserParameter
} from '~/composables/core/types'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import { useInjectedViewer } from '~~/lib/viewer/composables/setup'

const initialState: StoreState = {
  projectId: null,
  scheduleData: [],
  evaluatedData: [],
  tableData: [],
  userParameters: [],
  // Parameters
  parameterColumns: [],
  parentParameterColumns: [],
  childParameterColumns: [],
  parentParameters: [],
  childParameters: [],
  processedParameters: {},
  parameterDefinitions: {},
  // Columns
  currentTableColumns: [],
  currentDetailColumns: [],
  mergedTableColumns: [],
  mergedDetailColumns: [],
  parentBaseColumns: [],
  parentAvailableColumns: [],
  parentVisibleColumns: [],
  childBaseColumns: [],
  childAvailableColumns: [],
  childVisibleColumns: [],
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
      debug.startState(DebugCategories.STATE, 'Updating store state')

      // Log parameter-related updates
      if ('parentParameters' in state || 'childParameters' in state) {
        debug.log(DebugCategories.PARAMETERS, 'Updating parameters', {
          parentCount: state.parentParameters?.length,
          childCount: state.childParameters?.length,
          parentSample: state.parentParameters?.slice(0, 3),
          childSample: state.childParameters?.slice(0, 3)
        })
      }

      if ('parentAvailableColumns' in state || 'childAvailableColumns' in state) {
        debug.log(DebugCategories.PARAMETERS, 'Updating available columns', {
          parentCount: state.parentAvailableColumns?.length,
          childCount: state.childAvailableColumns?.length,
          parentSample: state.parentAvailableColumns?.slice(0, 3),
          childSample: state.childAvailableColumns?.slice(0, 3)
        })
      }

      try {
        await Promise.resolve() // Make async to satisfy eslint
        const oldState = { ...internalState.value }
        internalState.value = {
          ...oldState,
          ...state
        }

        // Log state after update
        debug.log(DebugCategories.STATE, 'Store state updated', {
          parameters: {
            parentCount: internalState.value.parentParameters.length,
            childCount: internalState.value.childParameters.length
          },
          availableColumns: {
            parentCount: internalState.value.parentAvailableColumns.length,
            childCount: internalState.value.childAvailableColumns.length
          },
          visibleColumns: {
            parentCount: internalState.value.parentVisibleColumns.length,
            childCount: internalState.value.childVisibleColumns.length
          }
        })

        debug.completeState(DebugCategories.STATE, 'Store update complete')
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
    userParameters: computed(() => internalState.value.userParameters),
    // Parameters
    parameterColumns: computed(() => internalState.value.parameterColumns),
    parentParameterColumns: computed(() => internalState.value.parentParameterColumns),
    childParameterColumns: computed(() => internalState.value.childParameterColumns),
    parentParameters: computed(() => internalState.value.parentParameters),
    childParameters: computed(() => internalState.value.childParameters),
    processedParameters: computed(() => internalState.value.processedParameters),
    parameterDefinitions: computed(() => internalState.value.parameterDefinitions),
    // Columns
    currentTableColumns: computed(() => internalState.value.currentTableColumns),
    currentDetailColumns: computed(() => internalState.value.currentDetailColumns),
    mergedTableColumns: computed(() => internalState.value.mergedTableColumns),
    mergedDetailColumns: computed(() => internalState.value.mergedDetailColumns),
    parentBaseColumns: computed(() => internalState.value.parentBaseColumns),
    parentAvailableColumns: computed(() => internalState.value.parentAvailableColumns),
    parentVisibleColumns: computed(() => internalState.value.parentVisibleColumns),
    childBaseColumns: computed(() => internalState.value.childBaseColumns),
    childAvailableColumns: computed(() => internalState.value.childAvailableColumns),
    childVisibleColumns: computed(() => internalState.value.childVisibleColumns),
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
    setUserParameters: (params: UserParameter[]) =>
      lifecycle.update({ userParameters: params }),
    setParameters: (params: { parent: Parameter[]; child: Parameter[] }) => {
      debug.log(DebugCategories.PARAMETERS, 'Setting parameters', {
        parentCount: params.parent.length,
        childCount: params.child.length,
        parentSample: params.parent.slice(0, 3),
        childSample: params.child.slice(0, 3)
      })
      return lifecycle.update({
        parentParameters: params.parent,
        childParameters: params.child
      })
    },
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

      debug.log(DebugCategories.PARAMETERS, `Setting ${type} columns`, {
        parentCount: parentColumns.length,
        childCount: childColumns.length,
        parentSample: parentColumns.slice(0, 3),
        childSample: childColumns.slice(0, 3)
      })

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
