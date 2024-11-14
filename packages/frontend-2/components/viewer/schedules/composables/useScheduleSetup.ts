import { computed, ref, watch, type Ref } from 'vue'
import type { ScheduleInitializationInstance, ElementData } from '../types'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import type { UserSettings } from '~/composables/useUserSettings'
import { useNamedTableOperations } from './useNamedTableOperations'
import { useScheduleTable } from './useScheduleTable'
import { useBIMElements } from './useBIMElements'
import { useElementCategories } from './useElementCategories'
import { useElementParameters } from './useElementParameters'
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

  // Initialize category filtering
  const { filteredElements, availableParentCategories, availableChildCategories } =
    useElementCategories({
      allElements: allElements.value
    })

  // Initialize parameter processing
  const { availableHeaders, processedElements } = useElementParameters({
    filteredElements
  })

  // Update state with processed data
  state.scheduleData = processedElements

  // Debug elements as refs
  const debugRawElements = ref<ElementData[]>([])
  const debugParentElements = ref<ElementData[]>([])
  const debugChildElements = ref<ElementData[]>([])
  const debugMatchedElements = ref<ElementData[]>([])
  const debugOrphanedElements = ref<ElementData[]>([])

  // Update debug refs when filtered elements change
  watch(
    [allElements, filteredElements],
    ([newAllElements, newFilteredElements]) => {
      debugRawElements.value = newAllElements
      debugParentElements.value = newFilteredElements.filter((el) => !el.host)
      debugChildElements.value = newFilteredElements.filter((el) => el.host)
      debugMatchedElements.value = newFilteredElements.filter(
        (el) => el.details?.length
      )
      debugOrphanedElements.value = newFilteredElements.filter(
        (el) => el.host && !el.details?.length
      )

      debug.log(DebugCategories.DATA, 'Debug elements updated', {
        rawCount: debugRawElements.value.length,
        parentCount: debugParentElements.value.length,
        childCount: debugChildElements.value.length,
        matchedCount: debugMatchedElements.value.length,
        orphanedCount: debugOrphanedElements.value.length
      })
    },
    { immediate: true }
  )

  return {
    // Elements data
    elementsData: computed(() => processedElements),
    availableHeaders,
    availableCategories: computed(() => ({
      parent: new Set(Array.from(availableParentCategories)),
      child: new Set(Array.from(availableChildCategories))
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
    isLoading: computed(() => isLoadingElements.value || isUpdating.value),
    hasError: computed(() => hasElementError.value),

    // Debug data
    rawWorldTree,
    rawTreeNodes,
    debugRawElements,
    debugParentElements,
    debugChildElements,
    debugMatchedElements,
    debugOrphanedElements
  }
}
