import type { Ref } from 'vue'
import type { ScheduleInitializationInstance, ElementData } from '../types'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import type { UserSettings } from '~/composables/useUserSettings'
import { useElementsData } from './useElementsData'
import { useNamedTableOperations } from './useNamedTableOperations'
import { useScheduleTable } from './useScheduleTable'
import { computed, ref } from 'vue'
import { debug, DebugCategories } from '../utils/debug'

interface ScheduleState {
  currentTableColumns: ColumnDef[]
  currentDetailColumns: ColumnDef[]
  scheduleData: ElementData[]
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

  // Initialize elements data with category refs
  const {
    scheduleData: elementsDataRaw,
    availableHeaders: availableHeadersRaw,
    rawElements: debugRawElementsRaw,
    parentElements: debugParentElementsRaw,
    childElements: debugChildElementsRaw,
    matchedElements: debugMatchedElementsRaw,
    orphanedElements: debugOrphanedElementsRaw,
    initializeData: initializeElementsData,
    stopWorldTreeWatch
  } = useElementsData({
    _currentTableColumns: computed(() => state.currentTableColumns),
    _currentDetailColumns: computed(() => state.currentDetailColumns),
    selectedParentCategories,
    selectedChildCategories
  })

  // Wrap raw values in refs
  const elementsData = ref(elementsDataRaw)
  const availableHeaders = ref(availableHeadersRaw)
  const debugRawElements = ref(debugRawElementsRaw)
  const debugParentElements = ref(debugParentElementsRaw)
  const debugChildElements = ref(debugChildElementsRaw)
  const debugMatchedElements = ref(debugMatchedElementsRaw)
  const debugOrphanedElements = ref(debugOrphanedElementsRaw)

  return {
    // Elements data
    elementsData,
    availableHeaders,
    debugRawElements,
    debugParentElements,
    debugChildElements,
    debugMatchedElements,
    debugOrphanedElements,
    initializeElementsData,
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
    tablesArray
  }
}
