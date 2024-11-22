import { ref, computed, watch, type Ref } from 'vue'
import type { ElementData, AvailableHeaders, ProcessingState, TableRow } from '../types'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import type { CustomParameter } from '~/composables/useUserSettings'
import { debug, DebugCategories } from '../utils/debug'
import { processDebugElements } from '../utils/dataPipeline'
import { useBIMElements } from './useBIMElements'
import { defaultColumns, defaultDetailColumns } from '../config/defaultColumns'
import store from './useScheduleStore'

interface ScheduleStateOptions {
  currentTable?: Ref<{ parentColumns?: ColumnDef[]; childColumns?: ColumnDef[] } | null>
}

interface ScheduleStateReturn {
  // Core state
  state: {
    scheduleData: ElementData[]
    evaluatedData: ElementData[]
    tableData: TableRow[]
    availableHeaders: AvailableHeaders
    parameterColumns: ColumnDef[]
    customParameters: CustomParameter[]
    mergedTableColumns: ColumnDef[]
    mergedDetailColumns: ColumnDef[]
    mergedParentParameters: CustomParameter[]
    mergedChildParameters: CustomParameter[]
    currentTableColumns: ColumnDef[]
    currentDetailColumns: ColumnDef[]
  }
  initialized: Ref<boolean>

  // State updates
  updateTableData: (data: TableRow[]) => void
  updateEvaluatedData: (data: ElementData[]) => void
  updateParameterColumns: (columns: ColumnDef[]) => void
  updateMergedParameters: (
    parentParams: CustomParameter[],
    childParams: CustomParameter[]
  ) => void
  updateMergedColumns: (tableColumns: ColumnDef[], detailColumns: ColumnDef[]) => void
  updateCurrentColumns: (tableColumns: ColumnDef[], detailColumns: ColumnDef[]) => void

  // Processing state
  processingState: Ref<ProcessingState>
  isProcessing: Ref<boolean>
  hasError: Ref<boolean>

  // Debug state
  parentElements: Ref<ElementData[]>
  childElements: Ref<ElementData[]>
  matchedElements: Ref<ElementData[]>
  orphanedElements: Ref<ElementData[]>
}

/**
 * Manages UI state for schedule data
 */
export function useScheduleState(options: ScheduleStateOptions): ScheduleStateReturn {
  const { isLoading: bimLoading, hasError: bimError } = useBIMElements()

  const currentTable = options.currentTable || ref(null)

  // Initialize core state
  const state = {
    scheduleData: [] as ElementData[],
    evaluatedData: [] as ElementData[],
    tableData: [] as TableRow[],
    availableHeaders: { parent: [], child: [] } as AvailableHeaders,
    parameterColumns: [] as ColumnDef[],
    customParameters: [] as CustomParameter[],
    mergedTableColumns: defaultColumns as ColumnDef[],
    mergedDetailColumns: defaultDetailColumns as ColumnDef[],
    mergedParentParameters: [] as CustomParameter[],
    mergedChildParameters: [] as CustomParameter[],
    currentTableColumns: defaultColumns as ColumnDef[],
    currentDetailColumns: defaultDetailColumns as ColumnDef[]
  }

  const initialized = ref(false)

  // Initialize processing state
  const processingState = ref<ProcessingState>({
    isInitializing: false,
    isProcessingElements: false,
    isUpdatingCategories: false,
    isProcessingFullData: false,
    error: null
  })

  // Initialize debug state
  const parentElements = ref<ElementData[]>([])
  const childElements = ref<ElementData[]>([])
  const matchedElements = ref<ElementData[]>([])
  const orphanedElements = ref<ElementData[]>([])

  // Watch for table changes to update columns
  watch(
    () => currentTable?.value,
    (newTable) => {
      if (newTable) {
        // Use table columns if available, otherwise use defaults
        state.mergedTableColumns = newTable.parentColumns || defaultColumns
        state.mergedDetailColumns = newTable.childColumns || defaultDetailColumns
        state.currentTableColumns = newTable.parentColumns || defaultColumns
        state.currentDetailColumns = newTable.childColumns || defaultDetailColumns

        // Update store with new columns
        store.setMergedColumns(state.mergedTableColumns, state.mergedDetailColumns)
        store.setCurrentColumns(state.currentTableColumns, state.currentDetailColumns)

        debug.log(DebugCategories.COLUMNS, 'Updated columns from table', {
          parentColumns: state.mergedTableColumns.length,
          childColumns: state.mergedDetailColumns.length
        })
      } else {
        // Reset to defaults if no table
        state.mergedTableColumns = defaultColumns
        state.mergedDetailColumns = defaultDetailColumns
        state.currentTableColumns = defaultColumns
        state.currentDetailColumns = defaultDetailColumns

        // Update store with default columns
        store.setMergedColumns(defaultColumns, defaultDetailColumns)
        store.setCurrentColumns(defaultColumns, defaultDetailColumns)

        debug.log(DebugCategories.COLUMNS, 'Reset to default columns')
      }
    },
    { immediate: true }
  )

  // Computed states
  const isProcessing = computed(() => {
    const pState = processingState.value
    return (
      pState.isInitializing ||
      pState.isProcessingElements ||
      pState.isUpdatingCategories ||
      pState.isProcessingFullData ||
      bimLoading.value
    )
  })

  const hasError = computed(
    () => processingState.value.error !== null || bimError.value
  )

  // State update methods
  function updateTableData(data: TableRow[]) {
    state.tableData = data
    // Update debug elements
    const debugResult = processDebugElements(data)
    parentElements.value = debugResult.parentElements
    childElements.value = debugResult.childElements
    matchedElements.value = debugResult.matchedElements
    orphanedElements.value = debugResult.orphanedElements
  }

  function updateEvaluatedData(data: ElementData[]) {
    state.evaluatedData = data
  }

  function updateParameterColumns(columns: ColumnDef[]) {
    state.parameterColumns = columns
  }

  function updateMergedParameters(
    parentParams: CustomParameter[],
    childParams: CustomParameter[]
  ) {
    state.mergedParentParameters = parentParams
    state.mergedChildParameters = childParams
  }

  function updateMergedColumns(tableColumns: ColumnDef[], detailColumns: ColumnDef[]) {
    state.mergedTableColumns = tableColumns
    state.mergedDetailColumns = detailColumns
  }

  function updateCurrentColumns(tableColumns: ColumnDef[], detailColumns: ColumnDef[]) {
    state.currentTableColumns = tableColumns
    state.currentDetailColumns = detailColumns
  }

  // Add watch for initialization state
  watch(
    [
      () => state.scheduleData,
      () => state.mergedTableColumns,
      () => state.mergedDetailColumns
    ],
    ([data, tableColumns, detailColumns]) => {
      const hasData = data.length > 0
      const hasColumns = tableColumns.length > 0 && detailColumns.length > 0
      const isReady = hasData && hasColumns && !isProcessing.value

      if (isReady && !initialized.value) {
        debug.log(DebugCategories.INITIALIZATION, 'Schedule state initialized', {
          dataCount: data.length,
          tableColumns: tableColumns.length,
          detailColumns: detailColumns.length
        })
        initialized.value = true
      }
    },
    { immediate: true }
  )

  return {
    // Core state
    state,
    initialized,

    // State updates
    updateTableData,
    updateEvaluatedData,
    updateParameterColumns,
    updateMergedParameters,
    updateMergedColumns,
    updateCurrentColumns,

    // Processing state
    processingState,
    isProcessing,
    hasError,

    // Debug state
    parentElements,
    childElements,
    matchedElements,
    orphanedElements
  }
}

// Export a function to create an instance
export function createScheduleState(
  currentTable: Ref<{ parentColumns?: ColumnDef[]; childColumns?: ColumnDef[] } | null>
) {
  return useScheduleState({ currentTable })
}
