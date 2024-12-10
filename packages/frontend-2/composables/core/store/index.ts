import { ref, computed } from 'vue'
import type {
  ElementData,
  ColumnDef,
  StoreState,
  StoreMutations,
  StoreLifecycle,
  Store,
  UserParameter,
  StoreParameterValue,
  StoreParameterDefinition,
  TableInfo,
  TableInfoUpdatePayload,
  AvailableHeaders,
  TableRow
} from '~/composables/core/types'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import {
  StoreError,
  StoreInitializationError,
  StoreUpdateError,
  StoreProcessingError
} from '../types/errors/store-errors'

/**
 * Type guard for ElementData
 */
function isElementData(value: unknown): value is ElementData {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'visible' in value &&
    typeof (value as ElementData).id === 'string' &&
    typeof (value as ElementData).visible === 'boolean'
  )
}

/**
 * Type guard for ElementData array
 */
function isElementDataArray(value: unknown): value is ElementData[] {
  return Array.isArray(value) && value.every(isElementData)
}

/**
 * Type guard for TableRow
 */
function isTableRow(value: unknown): value is TableRow {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof (value as TableRow).id === 'string'
  )
}

/**
 * Type guard for TableRow array
 */
function isTableRowArray(value: unknown): value is TableRow[] {
  return Array.isArray(value) && value.every(isTableRow)
}

/**
 * Convert ElementData to TableRow
 */
function toTableRow(element: ElementData): TableRow {
  return {
    ...element,
    visible: true,
    selected: false
  }
}

/**
 * Core store singleton
 */
class CoreStore implements Store {
  private stateRef = ref<StoreState>({
    // Core data
    projectId: null,
    scheduleData: [],
    evaluatedData: [],
    tableData: [],

    // Parameters
    userParameters: [], // Changed from customParameters
    parameterColumns: [],
    parentParameterColumns: [],
    childParameterColumns: [],
    mergedParentParameters: [],
    mergedChildParameters: [],
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
    availableHeaders: {
      parent: [],
      child: []
    },

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

    // Status
    initialized: false,
    loading: false,
    error: null
  })

  // State
  public readonly state = computed<StoreState>(() => this.stateRef.value)

  // Computed state with explicit return types
  public readonly projectId = computed<string | null>(() => this.state.value.projectId)
  public readonly scheduleData = computed<ElementData[]>(
    () => this.state.value.scheduleData
  )
  public readonly evaluatedData = computed<ElementData[]>(
    () => this.state.value.evaluatedData
  )
  public readonly tableData = computed<TableRow[]>(() => this.state.value.tableData)
  public readonly userParameters = computed<UserParameter[]>(
    () => this.state.value.userParameters
  )
  public readonly parameterColumns = computed<ColumnDef[]>(
    () => this.state.value.parameterColumns
  )
  public readonly parentParameterColumns = computed<ColumnDef[]>(
    () => this.state.value.parentParameterColumns
  )
  public readonly childParameterColumns = computed<ColumnDef[]>(
    () => this.state.value.childParameterColumns
  )
  public readonly mergedParentParameters = computed<UserParameter[]>(
    () => this.state.value.mergedParentParameters
  )
  public readonly mergedChildParameters = computed<UserParameter[]>(
    () => this.state.value.mergedChildParameters
  )
  public readonly processedParameters = computed<Record<string, StoreParameterValue>>(
    () => this.state.value.processedParameters
  )
  public readonly currentTableColumns = computed<ColumnDef[]>(
    () => this.state.value.currentTableColumns
  )
  public readonly currentDetailColumns = computed<ColumnDef[]>(
    () => this.state.value.currentDetailColumns
  )
  public readonly mergedTableColumns = computed<ColumnDef[]>(
    () => this.state.value.mergedTableColumns
  )
  public readonly mergedDetailColumns = computed<ColumnDef[]>(
    () => this.state.value.mergedDetailColumns
  )
  public readonly parameterDefinitions = computed<
    Record<string, StoreParameterDefinition>
  >(() => this.state.value.parameterDefinitions)
  public readonly availableHeaders = computed<AvailableHeaders>(
    () => this.state.value.availableHeaders
  )
  public readonly selectedCategories = computed<Set<string>>(
    () => this.state.value.selectedCategories
  )
  public readonly selectedParentCategories = computed<string[]>(
    () => this.state.value.selectedParentCategories
  )
  public readonly selectedChildCategories = computed<string[]>(
    () => this.state.value.selectedChildCategories
  )
  public readonly tablesArray = computed<TableInfo[]>(
    () => this.state.value.tablesArray
  )
  public readonly tableName = computed<string>(() => this.state.value.tableName)
  public readonly selectedTableId = computed<string>(
    () => this.state.value.selectedTableId
  )
  public readonly currentTableId = computed<string>(
    () => this.state.value.currentTableId
  )
  public readonly tableKey = computed<string>(() => this.state.value.tableKey)
  public readonly initialized = computed<boolean>(() => this.state.value.initialized)
  public readonly loading = computed<boolean>(() => this.state.value.loading)
  public readonly error = computed<Error | null>(() => this.state.value.error)
  public readonly parentBaseColumns = computed<ColumnDef[]>(
    () => this.state.value.parentBaseColumns
  )
  public readonly parentAvailableColumns = computed<ColumnDef[]>(
    () => this.state.value.parentAvailableColumns
  )
  public readonly parentVisibleColumns = computed<ColumnDef[]>(
    () => this.state.value.parentVisibleColumns
  )
  public readonly childBaseColumns = computed<ColumnDef[]>(
    () => this.state.value.childBaseColumns
  )
  public readonly childAvailableColumns = computed<ColumnDef[]>(
    () => this.state.value.childAvailableColumns
  )
  public readonly childVisibleColumns = computed<ColumnDef[]>(
    () => this.state.value.childVisibleColumns
  )

  // Mutations
  public readonly setProjectId = (id: string | null) => {
    this.stateRef.value.projectId = id
  }

  public readonly setScheduleData = (data: ElementData[]) => {
    if (isElementDataArray(data)) {
      this.stateRef.value.scheduleData = [...data]
    }
  }

  public readonly setEvaluatedData = (data: ElementData[]) => {
    if (isElementDataArray(data)) {
      this.stateRef.value.evaluatedData = [...data]
    }
  }

  public readonly setTableData = (data: TableRow[]) => {
    if (isTableRowArray(data)) {
      this.stateRef.value.tableData = [...data]
    }
  }

  public readonly setUserParameters = (params: UserParameter[]) => {
    this.stateRef.value.userParameters = [...params]
  }

  public readonly setParameterColumns = (columns: ColumnDef[]) => {
    this.stateRef.value.parameterColumns = [...columns]
  }

  public readonly setParentParameterColumns = (columns: ColumnDef[]) => {
    this.stateRef.value.parentParameterColumns = [...columns]
  }

  public readonly setChildParameterColumns = (columns: ColumnDef[]) => {
    this.stateRef.value.childParameterColumns = [...columns]
  }

  public readonly setMergedParameters = (
    parent: UserParameter[],
    child: UserParameter[]
  ) => {
    this.stateRef.value.mergedParentParameters = [...parent]
    this.stateRef.value.mergedChildParameters = [...child]
  }

  public readonly setProcessedParameters = (
    params: Record<string, StoreParameterValue>
  ) => {
    this.stateRef.value.processedParameters = { ...params }
  }

  public readonly setParameterDefinitions = (
    defs: Record<string, StoreParameterDefinition>
  ) => {
    this.stateRef.value.parameterDefinitions = { ...defs }
  }

  public readonly setParameterVisibility = (parameterId: string, visible: boolean) => {
    const params = [...this.stateRef.value.userParameters]
    const param = params.find((p) => p.id === parameterId)
    if (param) {
      param.visible = visible
      this.stateRef.value.userParameters = params
    }
  }

  public readonly setParameterOrder = (parameterId: string, newIndex: number) => {
    const params = [...this.stateRef.value.userParameters]
    const oldIndex = params.findIndex((p) => p.id === parameterId)
    if (oldIndex !== -1) {
      const [param] = params.splice(oldIndex, 1)
      params.splice(newIndex, 0, param)
      this.stateRef.value.userParameters = params
    }
  }

  public readonly setCurrentColumns = (table: ColumnDef[], detail: ColumnDef[]) => {
    this.stateRef.value.currentTableColumns = [...table]
    this.stateRef.value.currentDetailColumns = [...detail]
  }

  public readonly setMergedColumns = (table: ColumnDef[], detail: ColumnDef[]) => {
    this.stateRef.value.mergedTableColumns = [...table]
    this.stateRef.value.mergedDetailColumns = [...detail]
  }

  public readonly setColumnVisibility = (columnId: string, visible: boolean) => {
    const updateColumns = (columns: ColumnDef[]) => {
      const updatedColumns = [...columns]
      const col = updatedColumns.find((c) => c.id === columnId)
      if (col) {
        col.visible = visible
      }
      return updatedColumns
    }

    this.stateRef.value.parentVisibleColumns = updateColumns(
      this.stateRef.value.parentVisibleColumns
    )
    this.stateRef.value.childVisibleColumns = updateColumns(
      this.stateRef.value.childVisibleColumns
    )
  }

  public readonly setColumnOrder = (columnId: string, newIndex: number) => {
    const reorderColumns = (columns: ColumnDef[]) => {
      const updatedColumns = [...columns]
      const oldIndex = updatedColumns.findIndex((c) => c.id === columnId)
      if (oldIndex !== -1) {
        const [col] = updatedColumns.splice(oldIndex, 1)
        updatedColumns.splice(newIndex, 0, col)
      }
      return updatedColumns
    }

    this.stateRef.value.parentVisibleColumns = reorderColumns(
      this.stateRef.value.parentVisibleColumns
    )
    this.stateRef.value.childVisibleColumns = reorderColumns(
      this.stateRef.value.childVisibleColumns
    )
  }

  public readonly setSelectedCategories = (categories: Set<string>) => {
    this.stateRef.value.selectedCategories = new Set(categories)
  }

  public readonly setParentCategories = (categories: string[]) => {
    this.stateRef.value.selectedParentCategories = [...categories]
  }

  public readonly setChildCategories = (categories: string[]) => {
    this.stateRef.value.selectedChildCategories = [...categories]
  }

  public readonly setTableInfo = (info: TableInfoUpdatePayload) => {
    if (info.selectedTableId !== undefined) {
      this.stateRef.value.selectedTableId = info.selectedTableId
    }
    if (info.tableName !== undefined) {
      this.stateRef.value.tableName = info.tableName
    }
    if (info.currentTableId !== undefined) {
      this.stateRef.value.currentTableId = info.currentTableId
    }
    if (info.tableKey !== undefined) {
      this.stateRef.value.tableKey = info.tableKey
    }
  }

  public readonly setTablesArray = (tables: TableInfo[]) => {
    this.stateRef.value.tablesArray = [...tables]
  }

  public readonly setElementVisibility = (elementId: string, visible: boolean) => {
    const updateElements = (elements: ElementData[]) => {
      if (isElementDataArray(elements)) {
        const updatedElements = [...elements]
        const element = updatedElements.find((e) => e.id === elementId)
        if (element) {
          element.visible = visible
        }
        return updatedElements
      }
      return elements
    }

    this.stateRef.value.scheduleData = updateElements(this.stateRef.value.scheduleData)
    this.stateRef.value.evaluatedData = updateElements(
      this.stateRef.value.evaluatedData
    )
  }

  public readonly setAvailableHeaders = (headers: AvailableHeaders) => {
    this.stateRef.value.availableHeaders = {
      parent: [...headers.parent],
      child: [...headers.child]
    }
  }

  public readonly setInitialized = (value: boolean) => {
    this.stateRef.value.initialized = value
  }

  public readonly setLoading = (value: boolean) => {
    this.stateRef.value.loading = value
  }

  public readonly setError = (err: Error | null) => {
    this.stateRef.value.error =
      err instanceof StoreError ? err : err ? new StoreError(err.message) : null
  }

  public readonly reset = () => {
    this.stateRef.value = {
      projectId: null,
      scheduleData: [],
      evaluatedData: [],
      tableData: [],
      userParameters: [], // Changed from customParameters
      parameterColumns: [],
      parentParameterColumns: [],
      childParameterColumns: [],
      mergedParentParameters: [],
      mergedChildParameters: [],
      processedParameters: {},
      parameterDefinitions: {},
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
      availableHeaders: {
        parent: [],
        child: []
      },
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
  }

  public readonly processData = async (): Promise<void> => {
    try {
      debug.startState(DebugCategories.DATA_TRANSFORM, 'Processing data')
      this.stateRef.value.loading = true

      // Convert schedule data to table data
      const scheduleData = this.stateRef.value.scheduleData
      if (isElementDataArray(scheduleData)) {
        const tableData = scheduleData.map(toTableRow)
        await Promise.resolve() // Simulate async operation
        this.setTableData(tableData)
      }

      debug.completeState(DebugCategories.DATA_TRANSFORM, 'Data processed')
    } catch (err) {
      const error =
        err instanceof Error
          ? new StoreProcessingError(err.message)
          : new StoreProcessingError('Failed to process data')
      debug.error(DebugCategories.ERROR, 'Failed to process data:', error)
      throw error
    } finally {
      this.stateRef.value.loading = false
    }
  }

  // Lifecycle
  public readonly lifecycle: StoreLifecycle = {
    init: async () => {
      try {
        debug.startState(DebugCategories.STATE, 'Initializing store')
        this.stateRef.value.loading = true
        this.stateRef.value.error = null

        // Initialize state
        await this.reset()
        await Promise.resolve() // Simulate async operation
        this.stateRef.value.initialized = true

        debug.completeState(DebugCategories.STATE, 'Store initialized')
      } catch (err) {
        const error =
          err instanceof Error
            ? new StoreInitializationError(err.message)
            : new StoreInitializationError('Failed to initialize store')
        debug.error(DebugCategories.ERROR, 'Failed to initialize store:', error)
        this.stateRef.value.error = error
        throw error
      } finally {
        this.stateRef.value.loading = false
      }
    },

    update: async (updates: Partial<StoreState>) => {
      try {
        debug.startState(DebugCategories.STATE, 'Updating store')

        // Apply updates
        await Promise.all(
          Object.entries(updates).map(async ([key, value]) => {
            const mutationKey = `set${key.charAt(0).toUpperCase()}${key.slice(
              1
            )}` as keyof StoreMutations
            const mutation = this[mutationKey] as ((value: unknown) => void) | undefined
            if (mutation && value !== undefined) {
              await Promise.resolve() // Simulate async operation
              mutation(value)
            }
          })
        )

        debug.completeState(DebugCategories.STATE, 'Store updated', updates)
      } catch (err) {
        const error =
          err instanceof Error
            ? new StoreUpdateError(err.message)
            : new StoreUpdateError('Failed to update store')
        debug.error(DebugCategories.ERROR, 'Failed to update store:', error)
        throw error
      }
    },

    cleanup: () => {
      debug.startState(DebugCategories.STATE, 'Cleaning up store')
      this.reset()
      debug.completeState(DebugCategories.STATE, 'Store cleaned up')
    }
  }
}

// Initialize singleton instance
const storeInstance = new CoreStore()

/**
 * Access the core store
 */
export function useStore(): Store {
  return storeInstance
}
