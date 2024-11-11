import type { Ref } from 'vue'
import type { TableConfig, TreeItemComponentModel, ElementData } from '../types'
import { debug } from '../utils/debug'

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
  if (!table) return false

  const hasValidCategories =
    Array.isArray(table.categoryFilters?.selectedParentCategories) &&
    Array.isArray(table.categoryFilters?.selectedChildCategories)

  if (!hasValidCategories) {
    debug.warn('Invalid category state:', {
      timestamp: new Date().toISOString(),
      categoryFilters: table.categoryFilters
    })
    return false
  }

  return true
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
      debug.log('🚀 Starting initialization sequence:', {
        timestamp: new Date().toISOString(),
        initialState: {
          isInitialized: isInitialized.value,
          hasCurrentTable: !!currentTable.value,
          selectedTableId: selectedTableId.value,
          currentTableId: currentTableId.value,
          dataCount: scheduleData.value?.length || 0,
          currentTableCategories: currentTable.value?.categoryFilters
        }
      })

      // First load settings
      debug.startState('settings')
      await loadSettings()
      debug.log('📚 Settings loaded:', {
        timestamp: new Date().toISOString(),
        currentTable: {
          id: currentTable.value?.id,
          name: currentTable.value?.name,
          parentColumnsCount: currentTable.value?.parentColumns?.length,
          childColumnsCount: currentTable.value?.childColumns?.length,
          hasCustomParameters: !!currentTable.value?.customParameters?.length,
          categoryFilters: currentTable.value?.categoryFilters
        },
        selectedTableId: selectedTableId.value
      })
      debug.completeState('settings')

      // Initialize data from viewer
      debug.startState('viewerData')
      await initializeData()
      debug.log('🔄 Viewer data initialized')

      // Wait for and validate schedule data
      await waitForData(
        () => scheduleData.value,
        (data): data is ElementData[] => {
          if (!Array.isArray(data)) {
            debug.warn('Schedule data is not an array')
            return false
          }
          return data.length > 0
        }
      )
      debug.log('✅ Schedule data validated:', {
        count: scheduleData.value.length,
        firstItem: scheduleData.value[0]
      })
      debug.completeState('viewerData')

      // Handle table selection if needed
      if (!selectedTableId.value && currentTableId.value) {
        debug.startState('tableSelection')
        debug.log('🎯 Handling table selection:', {
          timestamp: new Date().toISOString(),
          currentId: currentTableId.value,
          currentTableCategories: currentTable.value?.categoryFilters
        })

        await handleTableSelection(currentTableId.value)

        // Wait for and validate table state
        await waitForData(() => currentTable.value, isValidTableState)

        debug.log('✅ Table selection complete:', {
          timestamp: new Date().toISOString(),
          selectedId: selectedTableId.value,
          currentId: currentTableId.value,
          tableName: currentTable.value?.name,
          categoryFilters: currentTable.value?.categoryFilters
        })
        debug.completeState('tableSelection')
      }

      // Core initialization is complete
      debug.startState('coreInitialization')
      debug.log('🏁 Core initialization complete:', {
        timestamp: new Date().toISOString(),
        finalState: {
          hasCurrentTable: !!currentTable.value,
          selectedTableId: selectedTableId.value,
          dataCount: scheduleData.value.length,
          tableConfig: {
            name: currentTable.value?.name,
            parentColumns: currentTable.value?.parentColumns?.length,
            childColumns: currentTable.value?.childColumns?.length,
            customParameters: currentTable.value?.customParameters?.length,
            categoryFilters: currentTable.value?.categoryFilters
          }
        }
      })

      // Set initialization flag to true only if we have data and valid table state
      if (scheduleData.value.length > 0 && isValidTableState(currentTable.value)) {
        isInitialized.value = true
        debug.log('✅ Initialization flag set:', {
          timestamp: new Date().toISOString(),
          isInitialized: isInitialized.value,
          dataCount: scheduleData.value.length,
          currentTableCategories: currentTable.value?.categoryFilters
        })
      } else {
        throw new Error('Invalid state after initialization')
      }

      debug.completeState('coreInitialization')
      debug.completeState('initialization')
    } catch (err) {
      loadingError.value =
        err instanceof Error ? err : new Error('Failed to initialize')
      debug.error('❌ Initialization error:', {
        timestamp: new Date().toISOString(),
        error: err,
        state: {
          isInitialized: isInitialized.value,
          hasCurrentTable: !!currentTable.value,
          selectedTableId: selectedTableId.value,
          dataCount: scheduleData.value.length,
          errorMessage: loadingError.value.message,
          errorStack: loadingError.value.stack,
          currentTableCategories: currentTable.value?.categoryFilters
        }
      })
      throw loadingError.value // Re-throw to allow caller to handle
    }
  }

  return {
    initialize
  }
}
