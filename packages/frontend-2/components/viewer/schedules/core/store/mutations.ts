import type { Ref } from 'vue'
import type {
  StoreState,
  ElementData,
  TableRow,
  ProcessedHeader,
  ColumnDef,
  CustomParameter
} from '~/composables/core/types'
import { useDebug, DebugCategories } from '../../debug/useDebug'

// Initialize debug
const debug = useDebug()

export function createMutations(state: Ref<StoreState>) {
  return {
    setProjectId(id: string | null) {
      state.value.projectId = id
    },

    setScheduleData(data: ElementData[]) {
      state.value.scheduleData = [...data]
    },

    setEvaluatedData(data: ElementData[]) {
      state.value.evaluatedData = [...data]
    },

    setTableData(data: TableRow[]) {
      state.value.tableData = [...data]
    },

    setCustomParameters(params: CustomParameter[]) {
      state.value.customParameters = [...params]
    },

    setParameterColumns(columns: ColumnDef[]) {
      state.value.parameterColumns = [...columns]
    },

    setParentParameterColumns(columns: ColumnDef[]) {
      state.value.parentParameterColumns = [...columns]
    },

    setChildParameterColumns(columns: ColumnDef[]) {
      state.value.childParameterColumns = [...columns]
    },

    setMergedParameters(
      parentParams: CustomParameter[],
      childParams: CustomParameter[]
    ) {
      state.value.mergedParentParameters = [...parentParams]
      state.value.mergedChildParameters = [...childParams]
    },

    setProcessedParameters(params: Record<string, ProcessedHeader>) {
      state.value.processedParameters = { ...params }
    },

    setParameterDefinitions(definitions: Record<string, ProcessedHeader>) {
      state.value.parameterDefinitions = { ...definitions }
    },

    setParameterVisibility(field: string, visible: boolean) {
      const column = state.value.currentTableColumns.find(
        (col: ColumnDef) => col.field === field
      )
      if (column) {
        column.visible = visible
      }
    },

    setParameterOrder(field: string, order: number) {
      const column = state.value.currentTableColumns.find(
        (col: ColumnDef) => col.field === field
      )
      if (column) {
        column.order = order
      }
    },

    setCurrentColumns(tableColumns: ColumnDef[], detailColumns: ColumnDef[]) {
      state.value.currentTableColumns = [...tableColumns]
      state.value.currentDetailColumns = [...detailColumns]
    },

    setMergedColumns(tableColumns: ColumnDef[], detailColumns: ColumnDef[]) {
      state.value.mergedTableColumns = [...tableColumns]
      state.value.mergedDetailColumns = [...detailColumns]
    },

    setColumnVisibility(field: string, visible: boolean) {
      const column = state.value.currentTableColumns.find(
        (col: ColumnDef) => col.field === field
      )
      if (column) {
        column.visible = visible
      }
    },

    setColumnOrder(field: string, order: number) {
      const column = state.value.currentTableColumns.find(
        (col: ColumnDef) => col.field === field
      )
      if (column) {
        column.order = order
      }
    },

    setSelectedCategories(categories: Set<string>) {
      state.value.selectedCategories = new Set(categories)
    },

    setParentCategories(categories: string[]) {
      state.value.selectedParentCategories = [...categories]
      // Category changes affect data processing, so we log them
      debug.completeState(DebugCategories.CATEGORIES, 'Parent categories updated', {
        count: categories.length
      })
    },

    setChildCategories(categories: string[]) {
      state.value.selectedChildCategories = [...categories]
      // Category changes affect data processing, so we log them
      debug.completeState(DebugCategories.CATEGORIES, 'Child categories updated', {
        count: categories.length
      })
    },

    setTableInfo(info: {
      selectedTableId?: string
      currentTableId?: string
      tableName?: string
      tableKey?: string
    }) {
      if (info.selectedTableId !== undefined) {
        state.value.selectedTableId = info.selectedTableId
      }
      if (info.currentTableId !== undefined) {
        state.value.currentTableId = info.currentTableId
      }
      if (info.tableName !== undefined) {
        state.value.tableName = info.tableName
      }
      if (info.tableKey !== undefined) {
        state.value.tableKey = info.tableKey
      }
    },

    setTablesArray(tables: { id: string; name: string }[]) {
      state.value.tablesArray = [...tables]
    },

    setElementVisibility(id: string, visible: boolean) {
      const element = state.value.tableData.find((el: TableRow) => el.id === id)
      if (element) {
        element._visible = visible
      }
    },

    setAvailableHeaders(headers: {
      parent: ProcessedHeader[]
      child: ProcessedHeader[]
    }) {
      state.value.availableHeaders = {
        parent: [...headers.parent],
        child: [...headers.child]
      }
    },

    setInitialized(value: boolean) {
      state.value.initialized = value
      if (value) {
        debug.completeState(DebugCategories.INITIALIZATION, 'Store initialized', {
          scheduleDataCount: state.value.scheduleData.length,
          evaluatedDataCount: state.value.evaluatedData.length,
          tableDataCount: state.value.tableData.length
        })
      }
    },

    setLoading(value: boolean) {
      state.value.loading = value
    },

    setError(error: Error | null) {
      if (error) {
        debug.error(DebugCategories.ERROR, 'Store error:', error)
      }
      state.value.error = error
    },

    reset() {
      debug.startState(DebugCategories.INITIALIZATION, 'Resetting store')
      state.value = {
        ...state.value,
        initialized: false,
        loading: false,
        error: null
      }
      debug.completeState(DebugCategories.INITIALIZATION, 'Store reset complete')
    }
  }
}
