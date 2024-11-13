import { reactive, ref } from 'vue'
import { debug, DebugCategories } from '../utils/debug'
import type { ElementData, TableConfig, TableRowData, ProcessedHeader } from '../types'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import type { CustomParameter } from '~/composables/useUserSettings'

interface ScheduleState {
  tablesArray: { id: string; name: string }[]
  currentTable: TableConfig | null
  scheduleData: ElementData[]
  evaluatedData: ElementData[]
  tableData: TableRowData[]
  customParameters: CustomParameter[]
  parameterColumns: ColumnDef[]
  currentTableColumns: ColumnDef[]
  currentDetailColumns: ColumnDef[]
  mergedTableColumns: ColumnDef[]
  mergedDetailColumns: ColumnDef[]
  mergedParentParameters: CustomParameter[]
  mergedChildParameters: CustomParameter[]
  availableHeaders: {
    parent: ProcessedHeader[]
    child: ProcessedHeader[]
  }
}

export function useScheduleState() {
  const initialized = ref(false)
  const loadingError = ref<Error | null>(null)

  // Initialize state with empty arrays
  const state = reactive<ScheduleState>({
    tablesArray: [],
    currentTable: null,
    scheduleData: [],
    evaluatedData: [],
    tableData: [],
    customParameters: [],
    parameterColumns: [],
    currentTableColumns: [],
    currentDetailColumns: [],
    mergedTableColumns: [],
    mergedDetailColumns: [],
    mergedParentParameters: [],
    mergedChildParameters: [],
    availableHeaders: {
      parent: [],
      child: []
    }
  })

  function resetState() {
    debug.log(DebugCategories.STATE, 'Resetting schedule state')

    state.tablesArray = []
    state.currentTable = null
    state.scheduleData = []
    state.evaluatedData = []
    state.tableData = []
    state.customParameters = []
    state.parameterColumns = []
    state.currentTableColumns = []
    state.currentDetailColumns = []
    state.mergedTableColumns = []
    state.mergedDetailColumns = []
    state.mergedParentParameters = []
    state.mergedChildParameters = []
    state.availableHeaders = {
      parent: [],
      child: []
    }
  }

  function updateTableData(data: TableRowData[]) {
    debug.log(DebugCategories.DATA_TRANSFORM, 'Table data updated', {
      count: data.length
    })
    state.tableData = data
  }

  function updateEvaluatedData(data: ElementData[]) {
    debug.log(DebugCategories.DATA_TRANSFORM, 'Evaluated data updated', {
      count: data.length
    })
    state.evaluatedData = data
  }

  function updateParameterColumns(columns: ColumnDef[]) {
    debug.log(DebugCategories.PARAMETERS, 'Parameter columns updated', {
      count: columns.length
    })
    state.parameterColumns = columns
  }

  function updateMergedParameters(
    parentParams: CustomParameter[],
    childParams: CustomParameter[]
  ) {
    debug.log(DebugCategories.PARAMETERS, 'Merged parameters updated', {
      parentCount: parentParams.length,
      childCount: childParams.length
    })
    state.mergedParentParameters = parentParams
    state.mergedChildParameters = childParams
  }

  function updateMergedColumns(tableColumns: ColumnDef[], detailColumns: ColumnDef[]) {
    debug.log(DebugCategories.COLUMNS, 'Merged columns updated', {
      tableCount: tableColumns.length,
      detailCount: detailColumns.length
    })
    state.mergedTableColumns = tableColumns
    state.mergedDetailColumns = detailColumns
  }

  function updateCurrentColumns(tableColumns: ColumnDef[], detailColumns: ColumnDef[]) {
    debug.log(DebugCategories.COLUMNS, 'Current columns updated', {
      tableCount: tableColumns.length,
      detailCount: detailColumns.length
    })
    state.currentTableColumns = tableColumns
    state.currentDetailColumns = detailColumns
  }

  return {
    state,
    initialized,
    loadingError,
    resetState,
    updateTableData,
    updateEvaluatedData,
    updateParameterColumns,
    updateMergedParameters,
    updateMergedColumns,
    updateCurrentColumns
  }
}
