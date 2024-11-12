import type { Ref } from 'vue'
import type { TableConfig, TreeItemComponentModel, ElementData } from '../types'
import { debug, DebugCategories } from '../utils/debug'

interface UseScheduleInitializationFlowOptions {
  initializeData: () => Promise<void>
  updateRootNodes: (data: TreeItemComponentModel[]) => void
  waitForData: <T>(
    getValue: () => T | undefined | null,
    validate: (value: T) => boolean,
    timeout?: number
  ) => Promise<T>
  loadSettings: () => Promise<void>
  handleTableSelection: (id: string) => Promise<void>
  currentTable: Ref<TableConfig | null>
  selectedTableId: Ref<string>
  currentTableId: Ref<string>
  isInitialized: Ref<boolean>
  loadingError: Ref<Error | null>
  scheduleData: Ref<ElementData[]>
}

// Runtime validation function
function isValidTableState(table: TableConfig | null): boolean {
  if (!table) return true // Allow null table state for initial load
  return true // Always valid since we have predefined categories
}

export function useScheduleInitializationFlow(
  options: UseScheduleInitializationFlowOptions
) {
  const {
    initializeData,
    waitForData,
    loadSettings,
    handleTableSelection,
    currentTable,
    selectedTableId,
    currentTableId,
    isInitialized,
    loadingError,
    scheduleData
  } = options

  async function initialize() {
    try {
      debug.startState('initialization')
      debug.log(DebugCategories.INITIALIZATION, 'Starting initialization sequence', {
        timestamp: new Date().toISOString(),
        initialState: {
          isInitialized: isInitialized.value,
          hasCurrentTable: !!currentTable.value,
          selectedTableId: selectedTableId.value,
          currentTableId: currentTableId.value,
          dataCount: scheduleData.value?.length || 0
        }
      })

      // First load settings
      debug.startState('settings')
      await loadSettings()
      debug.log(DebugCategories.INITIALIZATION, 'Settings loaded', {
        timestamp: new Date().toISOString(),
        currentTable: {
          id: currentTable.value?.id,
          name: currentTable.value?.name,
          parentColumnsCount: currentTable.value?.parentColumns?.length,
          childColumnsCount: currentTable.value?.childColumns?.length,
          hasCustomParameters: !!currentTable.value?.customParameters?.length
        },
        selectedTableId: selectedTableId.value
      })
      debug.completeState('settings')

      // Set initialization flag to true after settings load
      // Categories are predefined, so we don't need to wait for them
      isInitialized.value = true
      debug.log(
        DebugCategories.INITIALIZATION,
        'Settings loaded, component initialized'
      )

      // Initialize data from viewer
      debug.startState('viewerData')
      await initializeData()
      debug.log(DebugCategories.DATA, 'Viewer data initialized')

      // Wait for and validate schedule data
      await waitForData(
        () => scheduleData.value,
        (data): data is ElementData[] => {
          if (!Array.isArray(data)) {
            debug.warn(DebugCategories.VALIDATION, 'Schedule data is not an array')
            return false
          }
          return true // Allow empty array for initial load
        }
      )
      debug.log(DebugCategories.DATA, 'Schedule data validated', {
        count: scheduleData.value.length,
        firstItem: scheduleData.value[0]
      })
      debug.completeState('viewerData')

      // Handle table selection if needed
      if (!selectedTableId.value && currentTableId.value) {
        debug.startState('tableSelection')
        debug.log(DebugCategories.TABLE_UPDATES, 'Handling table selection', {
          timestamp: new Date().toISOString(),
          currentId: currentTableId.value
        })

        await handleTableSelection(currentTableId.value)

        // Wait for and validate table state
        await waitForData(() => currentTable.value, isValidTableState)

        debug.log(DebugCategories.TABLE_UPDATES, 'Table selection complete', {
          timestamp: new Date().toISOString(),
          selectedId: selectedTableId.value,
          currentId: currentTableId.value,
          tableName: currentTable.value?.name
        })
        debug.completeState('tableSelection')
      }

      // Core initialization is complete
      debug.startState('coreInitialization')
      debug.log(DebugCategories.INITIALIZATION, 'Core initialization complete', {
        timestamp: new Date().toISOString(),
        finalState: {
          hasCurrentTable: !!currentTable.value,
          selectedTableId: selectedTableId.value,
          dataCount: scheduleData.value.length,
          tableConfig: currentTable.value
            ? {
                name: currentTable.value.name,
                parentColumns: currentTable.value.parentColumns?.length,
                childColumns: currentTable.value.childColumns?.length,
                customParameters: currentTable.value.customParameters?.length
              }
            : null
        }
      })

      debug.completeState('coreInitialization')
      debug.completeState('initialization')
    } catch (err) {
      loadingError.value =
        err instanceof Error ? err : new Error('Failed to initialize')
      debug.error(DebugCategories.ERROR, 'Initialization error', {
        timestamp: new Date().toISOString(),
        error: err,
        state: {
          isInitialized: isInitialized.value,
          hasCurrentTable: !!currentTable.value,
          selectedTableId: selectedTableId.value,
          dataCount: scheduleData.value.length,
          errorMessage: loadingError.value.message,
          errorStack: loadingError.value.stack
        }
      })
      throw loadingError.value // Re-throw to allow caller to handle
    }
  }

  return {
    initialize
  }
}
