import { computed, watch, ref, type Ref } from 'vue'
import type { Viewer } from '@speckle/viewer'
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
import {
  useViewerInitialization,
  ViewerInitializationError
} from '../core/composables/useViewerInitialization'
import store from './useScheduleStore'
import { debug, DebugCategories } from '../utils/debug'

export interface ViewerState {
  viewer: {
    instance: Viewer | null
    init: {
      ref: Ref<boolean>
      promise: Promise<void>
    }
    metadata: {
      worldTree: Ref<unknown>
    }
  }
}

interface ScheduleState {
  currentTableColumns: ColumnDef[]
  currentDetailColumns: ColumnDef[]
  scheduleData: ElementData[]
  tableData: TableRowData[]
}

interface UseScheduleSetupOptions {
  initComponent: Ref<ScheduleInitializationInstance | null>
  handleError: (err: Error | unknown) => void
  state: ScheduleState
  settings?: Ref<UserSettings>
  updateCurrentColumns: (tableColumns: ColumnDef[], detailColumns: ColumnDef[]) => void
  waitForInitialization: () => Promise<void>
  viewerState: ViewerState
}

/**
 * Coordinates between different parts of the schedule system.
 * Acts as the main orchestrator for component communication and state management.
 */
export function useScheduleSetup({
  initComponent,
  handleError,
  state,
  settings,
  updateCurrentColumns,
  waitForInitialization,
  viewerState
}: UseScheduleSetupOptions) {
  // Initialize viewer state management
  const { isInitialized: isViewerInitialized } = useViewerInitialization()

  // Initialize BIM elements handling
  const {
    allElements,
    rawWorldTree,
    rawTreeNodes,
    isLoading: isLoadingElements,
    hasError: hasElementError,
    initializeElements,
    stopWorldTreeWatch
  } = useBIMElements(viewerState)

  // Initialize named table operations
  const { updateNamedTable, createNamedTable } = useNamedTableOperations({
    initComponent,
    handleError
  })

  // Initialize table management
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
    settings: settings || ref({ namedTables: {} }),
    updateCategories: async (parent: string[], child: string[]) => {
      try {
        debug.log(DebugCategories.CATEGORIES, 'Loading categories from table:', {
          parent,
          child
        })

        if (initComponent.value) {
          await initComponent.value.updateElementsDataCategories(parent, child)
          tableKey.value = Date.now().toString()
        }
      } catch (err) {
        handleError(err)
      }
    },
    updateNamedTable,
    createNamedTable,
    handleError,
    updateCurrentColumns: (columns: ColumnDef[]) => {
      updateCurrentColumns(columns, [])
      store.setCurrentColumns(columns, [])
    }
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
    selectedChildCategories,
    viewerState
  })

  // Watch for project ID changes with improved error handling
  watch(
    () => store.projectId.value,
    async (projectId) => {
      if (projectId) {
        debug.log(DebugCategories.STATE, 'Project ID set, initializing state watchers')
        try {
          // Ensure viewer is available
          if (!viewerState?.viewer?.instance) {
            throw new ViewerInitializationError('Viewer not available')
          }

          // Wait for viewer initialization
          await waitForInitialization()

          // Initialize store
          await store.lifecycle.init()

          // Set up state watchers only after project ID is available
          watch(
            () => scheduleState,
            (newState) => {
              try {
                state.scheduleData = [...newState.scheduleData]
                state.tableData = [...newState.tableData]
                state.currentTableColumns = [...newState.currentTableColumns]
                state.currentDetailColumns = [...newState.currentDetailColumns]

                // Update store
                store.setScheduleData([...newState.scheduleData])
                store.setTableData([...newState.tableData])
                store.setCurrentColumns(
                  [...newState.currentTableColumns],
                  [...newState.currentDetailColumns]
                )

                debug.log(DebugCategories.STATE, 'Schedule state updated', {
                  scheduleDataCount: state.scheduleData.length,
                  tableDataCount: state.tableData.length,
                  tableColumns: state.currentTableColumns.length,
                  detailColumns: state.currentDetailColumns.length
                })
              } catch (err) {
                handleError(err)
              }
            },
            { deep: true }
          )
        } catch (err) {
          handleError(err)
        }
      }
    },
    { immediate: true }
  )

  // Initialize elements data with improved error handling
  async function initializeElementsData() {
    try {
      debug.log(DebugCategories.INITIALIZATION, 'Starting elements initialization')

      // Ensure project ID is set
      if (!store.projectId.value) {
        throw new Error('Project ID is required but not provided')
      }

      // Ensure viewer is available
      if (!viewerState?.viewer?.instance) {
        throw new ViewerInitializationError('Viewer not available')
      }

      // Wait for viewer initialization
      await waitForInitialization()

      // Initialize elements
      await initializeElements()

      // Initialize categories
      if (initComponent.value) {
        await initComponent.value.updateElementsDataCategories(
          selectedParentCategories.value,
          selectedChildCategories.value
        )
      }

      debug.log(DebugCategories.INITIALIZATION, 'Elements initialization complete')
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Elements initialization failed:', err)
      handleError(err)
      throw err
    }
  }

  return {
    // Elements data
    elementsData: computed(() => state.scheduleData),
    tableData: computed(() => state.tableData),
    availableHeaders: computed(() => scheduleState.availableHeaders),
    availableCategories: computed(() => ({
      parent: new Set(selectedParentCategories.value),
      child: new Set(selectedChildCategories.value)
    })),
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
    tablesArray,

    // Loading states
    isLoading: computed(
      () =>
        isLoadingElements.value ||
        isUpdating.value ||
        isProcessing.value ||
        store.loading.value ||
        !isViewerInitialized.value // Use the full initialization state
    ),
    hasError: computed(
      () => hasElementError.value || hasError.value || store.error.value !== null
    ),

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

// Export the type for use in Schedules.vue
export type ScheduleSetup = ReturnType<typeof useScheduleSetup>

// Create a function to initialize the setup instance with improved error handling
export function createScheduleSetup(
  waitForInitialization: () => Promise<void>,
  viewerState: ViewerState
) {
  return useScheduleSetup({
    initComponent: ref(null),
    handleError: (err) => {
      debug.error(DebugCategories.ERROR, 'Schedule setup error:', err)
      store.setError(err instanceof Error ? err : new Error(String(err)))
    },
    state: {
      currentTableColumns: [],
      currentDetailColumns: [],
      scheduleData: [],
      tableData: []
    },
    updateCurrentColumns: (tableColumns: ColumnDef[], detailColumns: ColumnDef[]) => {
      store.setCurrentColumns(tableColumns, detailColumns)
    },
    waitForInitialization,
    viewerState
  })
}

// Export a function to get the setup instance
export function useScheduleSetupInstance(
  _viewer: Viewer,
  _isInitialized: Ref<boolean>,
  waitForInitialization: () => Promise<void>,
  viewerState: ViewerState
) {
  // Create new instance each time to avoid hooks outside setup
  return createScheduleSetup(waitForInitialization, viewerState)
}
