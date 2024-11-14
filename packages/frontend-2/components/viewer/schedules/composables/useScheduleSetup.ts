import { computed, watch, type Ref } from 'vue'
import type {
  ScheduleInitializationInstance,
  ElementData,
  TableRowData
} from '../types'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import type { UserSettings } from '~/composables/useUserSettings'
import { useNamedTableOperations } from './useNamedTableOperations'
import { useScheduleTable } from './useScheduleTable'
import { useBIMElements } from './useBIMElements'
import { useScheduleState } from './useScheduleState'
import { debug, DebugCategories } from '../utils/debug'

interface ScheduleState {
  currentTableColumns: ColumnDef[]
  currentDetailColumns: ColumnDef[]
  scheduleData: ElementData[]
  tableData: TableRowData[] // Added this line
}

interface UseScheduleSetupOptions {
  initComponent: Ref<ScheduleInitializationInstance | null>
  handleError: (err: Error | unknown) => void
  state: ScheduleState
  settings: Ref<UserSettings>
  updateCurrentColumns: (tableColumns: ColumnDef[], detailColumns: ColumnDef[]) => void
}

export function useScheduleSetup({
  initComponent,
  handleError,
  state,
  settings,
  updateCurrentColumns
}: UseScheduleSetupOptions) {
  // Initialize named table operations first
  const { updateNamedTable, createNamedTable } = useNamedTableOperations({
    initComponent,
    handleError
  })

  // Initialize BIM elements handling
  const {
    allElements,
    rawWorldTree,
    rawTreeNodes,
    isLoading: isLoadingElements,
    hasError: hasElementError,
    initializeElements,
    stopWorldTreeWatch
  } = useBIMElements()

  // Initialize table management with table operations
  const {
    handleTableChange: handleTableChangeInternal,
    handleSaveTable,
    handleBothColumnsUpdate,
    hasChanges,
    selectedTableId,
    tableName,
    currentTableId,
    currentTable,
    tableKey,
    tablesArray,
    selectedParentCategories,
    selectedChildCategories,
    isTableUpdatePending: isUpdating,
    toggleCategory
  } = useScheduleTable({
    settings,
    updateCategories: async (parent: string[], child: string[]) => {
      try {
        debug.log(DebugCategories.CATEGORIES, 'Loading categories from table:', {
          parent,
          child
        })

        if (initComponent.value) {
          await initComponent.value.updateElementsDataCategories(parent, child)
          // Force re-render after category update
          tableKey.value = Date.now().toString()
        }
      } catch (err) {
        handleError(err)
      }
    },
    updateNamedTable,
    createNamedTable,
    handleError,
    updateCurrentColumns: (columns: ColumnDef[]) => updateCurrentColumns(columns, [])
  })

  // Initialize schedule state management
  const {
    state: scheduleState,
    isProcessing,
    hasError,
    parentElements,
    childElements,
    matchedElements,
    orphanedElements
  } = useScheduleState({
    allElements,
    selectedParentCategories,
    selectedChildCategories
  })

  // Update parent state with schedule state
  watch(
    () => scheduleState,
    (newState) => {
      state.scheduleData = newState.scheduleData
      state.tableData = newState.tableData // Added this line
      state.currentTableColumns = newState.currentTableColumns
      state.currentDetailColumns = newState.currentDetailColumns

      debug.log(DebugCategories.STATE, 'Schedule state updated', {
        scheduleDataCount: state.scheduleData.length,
        tableDataCount: state.tableData.length,
        tableColumns: state.currentTableColumns.length,
        detailColumns: state.currentDetailColumns.length
      })
    },
    { immediate: true, deep: true }
  )

  return {
    // Elements data
    elementsData: computed(() => scheduleState.scheduleData),
    tableData: computed(() => scheduleState.tableData), // Added this line
    availableHeaders: computed(() => scheduleState.availableHeaders),
    availableCategories: computed(() => ({
      parent: new Set(selectedParentCategories.value),
      child: new Set(selectedChildCategories.value)
    })),
    initializeElementsData: initializeElements,
    stopWorldTreeWatch,

    // Categories
    selectedParentCategories,
    selectedChildCategories,
    isUpdating,
    toggleCategory,

    // Table management
    handleTableChangeInternal,
    handleSaveTable,
    handleBothColumnsUpdate,
    hasChanges,
    selectedTableId,
    tableName,
    currentTableId,
    currentTable,
    tableKey,
    tablesArray,

    // Loading states
    isLoading: computed(
      () => isLoadingElements.value || isUpdating.value || isProcessing.value
    ),
    hasError: computed(() => hasElementError.value || hasError.value),

    // Debug data
    rawWorldTree,
    rawTreeNodes,
    debugRawElements: allElements,
    debugParentElements: parentElements,
    debugChildElements: childElements,
    debugMatchedElements: matchedElements,
    debugOrphanedElements: orphanedElements
  }
}
