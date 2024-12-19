import { ref, computed } from 'vue'
import type { Store, StoreState, ElementData, TableRow } from '~/composables/core/types'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import { useInjectedViewer } from '~~/lib/viewer/composables/setup'
import { useParameterStore } from '~/composables/core/parameters/store'
import { useColumns } from '~/composables/core/tables/useColumns'

const initialState: StoreState = {
  projectId: null,
  scheduleData: [],
  evaluatedData: [],
  tableData: [],
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
  const parameterStore = useParameterStore()
  const columnManager = useColumns()

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
      try {
        await Promise.resolve() // Make async to satisfy eslint
        const oldState = { ...internalState.value }
        internalState.value = {
          ...oldState,
          ...state
        }
        debug.completeState(DebugCategories.STATE, 'Store state updated')
      } catch (error) {
        debug.error(DebugCategories.ERROR, 'Error updating store state:', error)
        throw error
      }
    },

    cleanup: () => {
      debug.log(DebugCategories.STATE, 'Cleaning up store')
      internalState.value = { ...initialState }
      parameterStore.reset()
      columnManager.reset()
    }
  }

  // Create computed properties for all state fields
  const store: Store = {
    state: computed(() => ({
      ...internalState.value,
      parentBaseColumns: columnManager.parentBaseColumns.value,
      parentAvailableColumns: columnManager.parentAvailableColumns.value,
      parentVisibleColumns: columnManager.parentVisibleColumns.value,
      childBaseColumns: columnManager.childBaseColumns.value,
      childAvailableColumns: columnManager.childAvailableColumns.value,
      childVisibleColumns: columnManager.childVisibleColumns.value
    })),
    lifecycle,

    // Computed properties
    projectId: computed(() => internalState.value.projectId),
    scheduleData: computed(() => internalState.value.scheduleData),
    evaluatedData: computed(() => internalState.value.evaluatedData),
    tableData: computed(() => internalState.value.tableData),
    // Columns
    currentTableColumns: computed(() => internalState.value.currentTableColumns),
    currentDetailColumns: computed(() => internalState.value.currentDetailColumns),
    mergedTableColumns: computed(() => internalState.value.mergedTableColumns),
    mergedDetailColumns: computed(() => internalState.value.mergedDetailColumns),
    parentBaseColumns: columnManager.parentBaseColumns,
    parentAvailableColumns: columnManager.parentAvailableColumns,
    parentVisibleColumns: columnManager.parentVisibleColumns,
    childBaseColumns: columnManager.childBaseColumns,
    childAvailableColumns: columnManager.childAvailableColumns,
    childVisibleColumns: columnManager.childVisibleColumns,
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
    setInitialized: (value: boolean) => lifecycle.update({ initialized: value }),
    setLoading: (value: boolean) => lifecycle.update({ loading: value }),
    setError: (error: Error | null) => lifecycle.update({ error }),
    setAvailableHeaders: (headers) => lifecycle.update({ availableHeaders: headers }),
    // Column mutations
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
    setColumnVisibility: (columnId, visible) => {
      const columns = [...internalState.value.currentTableColumns]
      const column = columns.find((c) => c.id === columnId)
      if (column) {
        column.visible = visible
        return lifecycle.update({ currentTableColumns: columns })
      }
    },
    setColumnOrder: (columnId, newIndex) => {
      const columns = [...internalState.value.currentTableColumns]
      const oldIndex = columns.findIndex((c) => c.id === columnId)
      if (oldIndex !== -1) {
        const [column] = columns.splice(oldIndex, 1)
        columns.splice(newIndex, 0, column)
        return lifecycle.update({ currentTableColumns: columns })
      }
    },
    setElementVisibility: (elementId, visible) => {
      const data = [...internalState.value.scheduleData]
      const element = data.find((e) => e.id === elementId)
      if (element) {
        element.visible = visible
        return lifecycle.update({ scheduleData: data })
      }
    },
    reset: () => {
      debug.log(DebugCategories.STATE, 'Resetting store')
      internalState.value = { ...initialState }
      parameterStore.reset()
      columnManager.reset()
    }
  }

  return store
}

// Store instance
let storeInstance: Store | undefined

// Singleton accessor
export function useStore(): Store {
  if (!storeInstance) {
    storeInstance = createStore()
  }
  return storeInstance
}

// Reset store (useful for testing)
export function resetStore(): void {
  if (storeInstance) {
    storeInstance.reset()
  }
  storeInstance = undefined
}
