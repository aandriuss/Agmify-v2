/**
 * Core Store
 *
 * Purpose:
 * - Manages UI state and view-specific data
 * - Handles temporary column visibility/order for current view
 * - Manages category filters and table info
 *
 * Does NOT handle:
 * - Raw parameters (managed by Parameter Store)
 * - Available parameters (managed by Parameter Store)
 * - Selected parameters (managed by Table Store)
 * - Persistent column definitions (managed by Table Store)
 */

import { ref, computed } from 'vue'
import type {
  Store,
  StoreState,
  ElementData,
  TableRow,
  TableInfo,
  TableInfoUpdatePayload,
  TableHeaders,
  TableColumn
} from '~/composables/core/types'
import { debug, DebugCategories } from '~/composables/core/utils/debug'

const initialState: StoreState = {
  projectId: null,
  scheduleData: [],
  evaluatedData: [],
  tableData: [],
  // Current view columns (temporary state)
  currentTableColumns: [],
  currentDetailColumns: [],
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

export class CoreStore implements Store {
  private internalState = ref<StoreState>(initialState)

  public readonly state = computed<StoreState>(() => this.internalState.value)
  public readonly projectId = computed(() => this.internalState.value.projectId)
  public readonly scheduleData = computed(() => this.internalState.value.scheduleData)
  public readonly evaluatedData = computed(() => this.internalState.value.evaluatedData)
  public readonly tableData = computed(() => this.internalState.value.tableData)

  // Current view columns
  public readonly currentTableColumns = computed(
    () => this.internalState.value.currentTableColumns
  )
  public readonly currentDetailColumns = computed(
    () => this.internalState.value.currentDetailColumns
  )

  // Headers
  public readonly availableHeaders = computed(
    () => this.internalState.value.availableHeaders
  )

  // Categories
  public readonly selectedCategories = computed(
    () => this.internalState.value.selectedCategories
  )
  public readonly selectedParentCategories = computed(
    () => this.internalState.value.selectedParentCategories
  )
  public readonly selectedChildCategories = computed(
    () => this.internalState.value.selectedChildCategories
  )

  // Table info
  public readonly tablesArray = computed(() => this.internalState.value.tablesArray)
  public readonly tableName = computed(() => this.internalState.value.tableName)
  public readonly selectedTableId = computed(
    () => this.internalState.value.selectedTableId
  )
  public readonly currentTableId = computed(
    () => this.internalState.value.currentTableId
  )
  public readonly tableKey = computed(() => this.internalState.value.tableKey)

  // State
  public readonly initialized = computed(() => this.internalState.value.initialized)
  public readonly loading = computed(() => this.internalState.value.loading)
  public readonly error = computed(() => this.internalState.value.error)

  // Lifecycle
  public readonly lifecycle = {
    init: async () => {
      debug.log(DebugCategories.INITIALIZATION, 'Initializing core store')
      try {
        this.internalState.value.loading = true
        await Promise.resolve() // Make async
        this.internalState.value.initialized = true
      } finally {
        this.internalState.value.loading = false
      }
    },
    update: async (state: Partial<StoreState>) => {
      // Determine the most specific category based on what's being updated
      const category = Object.keys(state).some((key) => key.includes('parameter'))
        ? DebugCategories.SAVED_PARAMETERS
        : Object.keys(state).some((key) => key.includes('data'))
        ? DebugCategories.DATA_TRANSFORM
        : DebugCategories.STATE

      debug.startState(category, 'Updating core store state', {
        updatedFields: Object.keys(state),
        type: category
      })
      try {
        this.internalState.value.loading = true
        await Promise.resolve() // Make async
        this.internalState.value = {
          ...this.internalState.value,
          ...state
        }
        debug.completeState(DebugCategories.STATE, 'Core store state updated', {
          updatedFields: Object.keys(state),
          updates: state,
          type: category
        })
      } finally {
        this.internalState.value.loading = false
      }
    },
    cleanup: () => {
      debug.log(DebugCategories.STATE, 'Cleaning up core store')
      this.internalState.value = { ...initialState }
    }
  }

  // Core mutations
  public setProjectId = (id: string | null) => this.lifecycle.update({ projectId: id })
  public setScheduleData = (data: ElementData[]) =>
    this.lifecycle.update({ scheduleData: data })
  public setEvaluatedData = (data: ElementData[]) =>
    this.lifecycle.update({ evaluatedData: data })
  public setTableData = (data: TableRow[]) => this.lifecycle.update({ tableData: data })

  // Column mutations
  public setCurrentColumns = (table: TableColumn[], detail: TableColumn[]) =>
    this.lifecycle.update({
      currentTableColumns: table,
      currentDetailColumns: detail
    })
  public setColumnVisibility = (columnId: string, visible: boolean) => {
    const columns = [...this.internalState.value.currentTableColumns]
    const column = columns.find((c) => c.id === columnId)
    if (column) {
      column.visible = visible
      return this.lifecycle.update({ currentTableColumns: columns })
    }
  }
  public setColumnOrder = (columnId: string, newIndex: number) => {
    const columns = [...this.internalState.value.currentTableColumns]
    const oldIndex = columns.findIndex((c) => c.id === columnId)
    if (oldIndex !== -1) {
      const [column] = columns.splice(oldIndex, 1)
      columns.splice(newIndex, 0, column)
      return this.lifecycle.update({ currentTableColumns: columns })
    }
  }

  // Header mutations
  public setAvailableHeaders = (headers: TableHeaders) =>
    this.lifecycle.update({ availableHeaders: headers })

  // Category mutations
  public setSelectedCategories = (categories: Set<string>) =>
    this.lifecycle.update({ selectedCategories: categories })
  public setParentCategories = (categories: string[]) =>
    this.lifecycle.update({ selectedParentCategories: categories })
  public setChildCategories = (categories: string[]) =>
    this.lifecycle.update({ selectedChildCategories: categories })

  // Table mutations
  public setTablesArray = (tables: TableInfo[]) =>
    this.lifecycle.update({ tablesArray: tables })
  public setTableInfo = (info: TableInfoUpdatePayload) => {
    const update: Partial<StoreState> = {}
    if (info.selectedTableId) update.selectedTableId = info.selectedTableId
    if (info.tableName) update.tableName = info.tableName
    if (info.currentTableId) update.currentTableId = info.currentTableId
    if (info.tableKey) update.tableKey = info.tableKey
    return this.lifecycle.update(update)
  }

  // Element mutations
  public setElementVisibility = (elementId: string, visible: boolean) => {
    const data = [...this.internalState.value.scheduleData]
    const element = data.find((e) => e.id === elementId)
    if (element) {
      element.visible = visible
      return this.lifecycle.update({ scheduleData: data })
    }
  }

  // Status mutations
  public setInitialized = (value: boolean) =>
    this.lifecycle.update({ initialized: value })
  public setLoading = (value: boolean) => this.lifecycle.update({ loading: value })
  public setError = (error: Error | null) => this.lifecycle.update({ error })

  public reset = () => {
    debug.log(DebugCategories.STATE, 'Resetting store')
    this.internalState.value = { ...initialState }
  }
}

// Store instance
let storeInstance: Store | undefined

// Singleton accessor
export function useStore(): Store {
  if (!storeInstance) {
    storeInstance = new CoreStore()
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
