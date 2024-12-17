import { ref, computed } from 'vue'
import type {
  Store,
  StoreState,
  ElementData,
  TableRow,
  Parameter,
  ColumnDef,
  UserParameter,
  StoreParameterValue,
  StoreParameterDefinition
} from '~/composables/core/types'
import { debug, DebugCategories } from '~/composables/core/utils/debug'

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

export class CoreStore implements Store {
  private internalState = ref<StoreState>(initialState)
  public readonly state = computed<StoreState>(() => this.internalState.value)
  public readonly projectId = computed(() => this.internalState.value.projectId)
  public readonly scheduleData = computed(() => this.internalState.value.scheduleData)
  public readonly evaluatedData = computed(() => this.internalState.value.evaluatedData)
  public readonly tableData = computed(() => this.internalState.value.tableData)
  public readonly userParameters = computed(
    () => this.internalState.value.userParameters
  )
  // Parameters
  public readonly parameterColumns = computed(
    () => this.internalState.value.parameterColumns
  )
  public readonly parentParameterColumns = computed(
    () => this.internalState.value.parentParameterColumns
  )
  public readonly childParameterColumns = computed(
    () => this.internalState.value.childParameterColumns
  )
  public readonly parentParameters = computed(
    () => this.internalState.value.parentParameters
  )
  public readonly childParameters = computed(
    () => this.internalState.value.childParameters
  )
  public readonly processedParameters = computed(
    () => this.internalState.value.processedParameters
  )
  public readonly parameterDefinitions = computed(
    () => this.internalState.value.parameterDefinitions
  )
  // Columns
  public readonly currentTableColumns = computed(
    () => this.internalState.value.currentTableColumns
  )
  public readonly currentDetailColumns = computed(
    () => this.internalState.value.currentDetailColumns
  )
  public readonly mergedTableColumns = computed(
    () => this.internalState.value.mergedTableColumns
  )
  public readonly mergedDetailColumns = computed(
    () => this.internalState.value.mergedDetailColumns
  )
  public readonly parentBaseColumns = computed(
    () => this.internalState.value.parentBaseColumns
  )
  public readonly parentAvailableColumns = computed(
    () => this.internalState.value.parentAvailableColumns
  )
  public readonly parentVisibleColumns = computed(
    () => this.internalState.value.parentVisibleColumns
  )
  public readonly childBaseColumns = computed(
    () => this.internalState.value.childBaseColumns
  )
  public readonly childAvailableColumns = computed(
    () => this.internalState.value.childAvailableColumns
  )
  public readonly childVisibleColumns = computed(
    () => this.internalState.value.childVisibleColumns
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
      debug.startState(DebugCategories.STATE, 'Updating core store state')
      try {
        this.internalState.value.loading = true
        await Promise.resolve() // Make async
        this.internalState.value = {
          ...this.internalState.value,
          ...state
        }
        debug.completeState(DebugCategories.STATE, 'Core store state updated')
      } finally {
        this.internalState.value.loading = false
      }
    },
    cleanup: () => {
      debug.log(DebugCategories.STATE, 'Cleaning up core store')
      this.internalState.value = { ...initialState }
    }
  }

  // Mutations
  public setProjectId = (id: string | null) => this.lifecycle.update({ projectId: id })
  public setScheduleData = (data: ElementData[]) =>
    this.lifecycle.update({ scheduleData: data })
  public setEvaluatedData = (data: ElementData[]) =>
    this.lifecycle.update({ evaluatedData: data })
  public setTableData = (data: TableRow[]) => this.lifecycle.update({ tableData: data })
  public setUserParameters = (params: UserParameter[]) =>
    this.lifecycle.update({ userParameters: params })
  public setParameterColumns = (columns: ColumnDef[]) =>
    this.lifecycle.update({ parameterColumns: columns })
  public setParentParameterColumns = (columns: ColumnDef[]) =>
    this.lifecycle.update({ parentParameterColumns: columns })
  public setChildParameterColumns = (columns: ColumnDef[]) =>
    this.lifecycle.update({ childParameterColumns: columns })
  public setParameters = (params: { parent: Parameter[]; child: Parameter[] }) => {
    debug.log(DebugCategories.PARAMETERS, 'Setting parameters', {
      parentCount: params.parent.length,
      childCount: params.child.length,
      parentSample: params.parent.slice(0, 3),
      childSample: params.child.slice(0, 3)
    })
    return this.lifecycle.update({
      parentParameters: params.parent,
      childParameters: params.child
    })
  }
  public setProcessedParameters = (params: Record<string, StoreParameterValue>) =>
    this.lifecycle.update({ processedParameters: params })
  public setParameterDefinitions = (defs: Record<string, StoreParameterDefinition>) =>
    this.lifecycle.update({ parameterDefinitions: defs })
  public setParameterVisibility = (parameterId: string, visible: boolean) => {
    const params = [...this.internalState.value.parameterColumns]
    const param = params.find((p) => p.id === parameterId)
    if (param) {
      param.visible = visible
      return this.lifecycle.update({ parameterColumns: params })
    }
  }
  public setParameterOrder = (parameterId: string, newIndex: number) => {
    const params = [...this.internalState.value.parameterColumns]
    const oldIndex = params.findIndex((p) => p.id === parameterId)
    if (oldIndex !== -1) {
      const [param] = params.splice(oldIndex, 1)
      params.splice(newIndex, 0, param)
      return this.lifecycle.update({ parameterColumns: params })
    }
  }
  public setCurrentColumns = (table: ColumnDef[], detail: ColumnDef[]) =>
    this.lifecycle.update({
      currentTableColumns: table,
      currentDetailColumns: detail
    })
  public setMergedColumns = (table: ColumnDef[], detail: ColumnDef[]) =>
    this.lifecycle.update({
      mergedTableColumns: table,
      mergedDetailColumns: detail
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
  public setSelectedCategories = (categories: Set<string>) =>
    this.lifecycle.update({ selectedCategories: categories })
  public setParentCategories = (categories: string[]) =>
    this.lifecycle.update({ selectedParentCategories: categories })
  public setChildCategories = (categories: string[]) =>
    this.lifecycle.update({ selectedChildCategories: categories })
  public setTablesArray = (tables: { id: string; name: string }[]) =>
    this.lifecycle.update({ tablesArray: tables })
  public setTableInfo = (info: { selectedTableId?: string; tableName?: string }) =>
    this.lifecycle.update(info)
  public setColumns = (
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

    return this.lifecycle.update(updates)
  }
  public setInitialized = (value: boolean) =>
    this.lifecycle.update({ initialized: value })
  public setLoading = (value: boolean) => this.lifecycle.update({ loading: value })
  public setError = (error: Error | null) => this.lifecycle.update({ error })

  public setElementVisibility = (elementId: string, visible: boolean) => {
    const data = [...this.internalState.value.scheduleData]
    const element = data.find((e) => e.id === elementId)
    if (element) {
      element.visible = visible
      return this.lifecycle.update({ scheduleData: data })
    }
  }

  public setAvailableHeaders = (headers: {
    parent: Parameter[]
    child: Parameter[]
  }) => {
    debug.log(DebugCategories.PARAMETERS, 'Setting available headers', {
      parentCount: headers.parent.length,
      childCount: headers.child.length,
      parentSample: headers.parent.slice(0, 3),
      childSample: headers.child.slice(0, 3)
    })
    return this.lifecycle.update({ availableHeaders: headers })
  }

  public reset = () => {
    debug.log(DebugCategories.STATE, 'Resetting store')
    this.internalState.value = { ...initialState }
  }
}

// Store instance
let storeInstance: Store | null = null

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
  storeInstance = null
}
