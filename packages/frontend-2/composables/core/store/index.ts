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
import { useWaitForActiveUser } from '~/lib/auth/composables/activeUser'
import { isValidColumn, isValidElement } from './types'

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
  // UI State
  showCategoryOptions: false,
  // State
  initialized: false,
  loading: false,
  error: null
}

export class CoreStore implements Store {
  private internalState = ref<StoreState>(initialState)

  public readonly state = computed<StoreState>(() => ({ ...this.internalState.value }))
  public readonly projectId = computed(() => this.internalState.value.projectId)
  public readonly scheduleData = computed<ElementData[]>(() => [
    ...this.internalState.value.scheduleData
  ])
  public readonly evaluatedData = computed<ElementData[]>(() => [
    ...this.internalState.value.evaluatedData
  ])
  public readonly tableData = computed<TableRow[]>(() => [
    ...this.internalState.value.tableData
  ])

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

  // Transaction manager
  private transactionQueue: Array<Partial<StoreState>> = []
  private transactionTimeout: ReturnType<typeof setTimeout> | null = null
  private readonly TRANSACTION_DELAY = 100 // ms

  private async flushTransaction() {
    if (this.transactionQueue.length === 0) return

    // Set loading state before processing
    this.internalState.value.loading = true

    // Split updates into parameter updates and other updates
    const parameterUpdates = this.transactionQueue.filter((update) =>
      Object.keys(update).some((key) => key.includes('parameter'))
    )
    const otherUpdates = this.transactionQueue.filter(
      (update) => !Object.keys(update).some((key) => key.includes('parameter'))
    )

    this.transactionQueue = []
    this.transactionTimeout = null

    // Wait for any pending operations and give time for parameters to settle
    await new Promise((resolve) => setTimeout(resolve, 50))

    try {
      this.internalState.value.loading = true

      // Process parameter updates first
      if (parameterUpdates.length > 0) {
        const mergedParams = parameterUpdates.reduce(
          (acc, update) => ({ ...acc, ...update }),
          {} as Partial<StoreState>
        )
        debug.startState(DebugCategories.SAVED_PARAMETERS, 'Updating parameters', {
          updatedFields: Object.keys(mergedParams)
        })
        this.internalState.value = {
          ...this.internalState.value,
          ...mergedParams
        }
        debug.completeState(DebugCategories.SAVED_PARAMETERS, 'Parameters updated')
      }

      // Process other updates
      if (otherUpdates.length > 0) {
        const mergedOthers = otherUpdates.reduce(
          (acc, update) => ({ ...acc, ...update }),
          {} as Partial<StoreState>
        )
        const category = Object.keys(mergedOthers).some((key) => key.includes('data'))
          ? DebugCategories.DATA_TRANSFORM
          : DebugCategories.STATE

        debug.startState(category, 'Updating store state', {
          updatedFields: Object.keys(mergedOthers)
        })
        this.internalState.value = {
          ...this.internalState.value,
          ...mergedOthers
        }
        debug.completeState(category, 'Store state updated')
      }
    } finally {
      this.internalState.value.loading = false
    }
  }

  // Lifecycle
  public readonly lifecycle = {
    init: async () => {
      debug.startState(DebugCategories.INITIALIZATION, 'Initializing core store')
      try {
        this.internalState.value.loading = true
        this.internalState.value.error = null

        // Check auth synchronously
        const waitForUser = useWaitForActiveUser()
        const userResult = await waitForUser()
        if (!userResult?.data?.activeUser) {
          const error = new Error('Authentication required')
          debug.error(DebugCategories.INITIALIZATION, error.message)
          this.internalState.value.error = error
          throw error
        }

        // Initialize state immediately
        this.internalState.value = {
          ...this.internalState.value,
          scheduleData: [],
          evaluatedData: [],
          tableData: [],
          currentTableColumns: [],
          currentDetailColumns: [],
          availableHeaders: { parent: [], child: [] },
          selectedCategories: new Set(),
          selectedParentCategories: [],
          selectedChildCategories: [],
          tablesArray: [],
          initialized: true
        }

        debug.completeState(DebugCategories.INITIALIZATION, 'Core store initialized')
      } catch (err) {
        debug.error(DebugCategories.ERROR, 'Failed to initialize core store', err)
        const error =
          err instanceof Error ? err : new Error('Failed to initialize store')
        this.internalState.value.error = error
        throw error
      } finally {
        this.internalState.value.loading = false
      }
    },
    update: async (state: Partial<StoreState>) => {
      // For initialization only, apply immediately
      if (state.initialized !== undefined) {
        this.internalState.value = {
          ...this.internalState.value,
          ...state
        }
        return
      }

      // Queue all other updates including scheduleData
      this.transactionQueue.push(state)

      // Schedule flush if not already scheduled
      if (!this.transactionTimeout) {
        return new Promise<void>((resolve) => {
          this.transactionTimeout = setTimeout(async () => {
            await this.flushTransaction()
            resolve()
          }, this.TRANSACTION_DELAY)
        })
      }
    },
    cleanup: () => {
      debug.log(DebugCategories.STATE, 'Cleaning up core store')
      this.internalState.value = { ...initialState }
    }
  }

  // Core mutations with optimized updates and schedule integration
  public setProjectId = (id: string | null) => this.lifecycle.update({ projectId: id })

  public setScheduleData = async (data: ElementData[]) => {
    debug.startState(DebugCategories.DATA_TRANSFORM, 'Setting schedule data')
    try {
      await this.lifecycle.update({ scheduleData: data })
      debug.completeState(DebugCategories.DATA_TRANSFORM, 'Schedule data updated', {
        count: data.length,
        sample: data[0] ? { id: data[0].id, type: data[0].type } : null
      })
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to set schedule data:', err)
      throw err
    }
  }

  public setEvaluatedData = async (data: ElementData[]) => {
    debug.startState(DebugCategories.DATA_TRANSFORM, 'Setting evaluated data')
    try {
      await this.lifecycle.update({ evaluatedData: data })
      debug.completeState(DebugCategories.DATA_TRANSFORM, 'Evaluated data updated', {
        count: data.length,
        sample: data[0] ? { id: data[0].id, type: data[0].type } : null
      })
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to set evaluated data:', err)
      throw err
    }
  }

  public setTableData = async (data: TableRow[]) => {
    debug.startState(DebugCategories.DATA_TRANSFORM, 'Setting table data')
    try {
      await this.lifecycle.update({ tableData: data })
      debug.completeState(DebugCategories.DATA_TRANSFORM, 'Table data updated', {
        count: data.length,
        sample: data[0] ? { id: data[0].id, type: data[0].type } : null
      })
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to set table data:', err)
      throw err
    }
  }

  // Column mutations with validation
  public setCurrentColumns = async (table: TableColumn[], detail: TableColumn[]) => {
    debug.startState(DebugCategories.COLUMN_UPDATES, 'Setting current columns')
    try {
      const validTable = table.filter(isValidColumn)
      const validDetail = detail.filter(isValidColumn)

      await this.lifecycle.update({
        currentTableColumns: validTable,
        currentDetailColumns: validDetail
      })

      debug.completeState(DebugCategories.COLUMN_UPDATES, 'Current columns updated', {
        table: {
          total: table.length,
          valid: validTable.length
        },
        detail: {
          total: detail.length,
          valid: validDetail.length
        }
      })
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to set current columns:', err)
      throw err
    }
  }

  public setColumnVisibility = (columnId: string, visible: boolean) => {
    const currentColumns = this.internalState.value.currentTableColumns
    if (!Array.isArray(currentColumns)) return

    const validColumns = currentColumns.filter(isValidColumn)
    const columns = validColumns.map((col): TableColumn => ({ ...col }))

    const targetColumn = columns.find((c) => c.id === columnId)
    if (!targetColumn) return

    const updatedColumns = columns.map(
      (col): TableColumn => (col.id === columnId ? { ...col, visible } : col)
    )

    return this.lifecycle.update({ currentTableColumns: updatedColumns })
  }

  public setColumnOrder = (columnId: string, newIndex: number) => {
    const currentColumns = this.internalState.value.currentTableColumns
    if (!Array.isArray(currentColumns)) return

    const validColumns = currentColumns.filter(isValidColumn)
    const columns = validColumns.map((col): TableColumn => ({ ...col }))

    const targetColumn = columns.find((c) => c.id === columnId)
    if (!targetColumn) return

    const updatedColumns = columns.filter((c) => c.id !== columnId)
    updatedColumns.splice(newIndex, 0, targetColumn)

    return this.lifecycle.update({ currentTableColumns: updatedColumns })
  }

  // Header mutations
  public setAvailableHeaders = (headers: TableHeaders) =>
    this.lifecycle.update({ availableHeaders: { ...headers } })

  // Category mutations
  public setSelectedCategories = (categories: Set<string>) =>
    this.lifecycle.update({ selectedCategories: new Set(categories) })
  public setParentCategories = (categories: string[]) =>
    this.lifecycle.update({ selectedParentCategories: [...categories] })
  public setChildCategories = (categories: string[]) =>
    this.lifecycle.update({ selectedChildCategories: [...categories] })

  // Table mutations
  public setTablesArray = (tables: TableInfo[]) =>
    this.lifecycle.update({ tablesArray: [...tables] })
  public setTableInfo = (info: TableInfoUpdatePayload) => {
    const update: Partial<StoreState> = {}
    if (info.selectedTableId) update.selectedTableId = String(info.selectedTableId)
    if (info.tableName) update.tableName = String(info.tableName)
    if (info.currentTableId) update.currentTableId = String(info.currentTableId)
    if (info.tableKey) update.tableKey = String(info.tableKey)
    return this.lifecycle.update(update)
  }

  // Element mutations
  public setElementVisibility = (elementId: string, visible: boolean) => {
    const currentData = this.internalState.value.scheduleData
    if (!Array.isArray(currentData)) return

    const validData = currentData.filter(isValidElement)
    const data = validData.map((el): ElementData => ({ ...el }))

    const targetElement = data.find((e) => e.id === elementId)
    if (!targetElement) return

    const updatedData = data.map(
      (el): ElementData => (el.id === elementId ? { ...el, visible } : el)
    )

    return this.lifecycle.update({ scheduleData: updatedData })
  }

  // Status mutations
  public setInitialized = (value: boolean) =>
    this.lifecycle.update({ initialized: value })
  public setLoading = (value: boolean) => this.lifecycle.update({ loading: value })
  public setError = (error: Error | null) => this.lifecycle.update({ error })

  // UI mutations
  public setShowCategoryOptions = (show: boolean) => {
    debug.log(DebugCategories.UI, 'Setting category options visibility', { show })
    return this.lifecycle.update({ showCategoryOptions: show })
  }

  // UI state
  public readonly showCategoryOptions = computed(
    () => this.internalState.value.showCategoryOptions
  )

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
