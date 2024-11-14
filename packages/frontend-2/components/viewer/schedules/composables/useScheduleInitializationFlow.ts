import { debug, DebugCategories } from '../utils/debug'
import type { ElementData, TableConfig, TreeItemComponentModel } from '../types'
import type { Ref, ComputedRef } from 'vue'

interface UseScheduleInitializationFlowOptions {
  initializeData: () => Promise<void>
  updateRootNodes: (nodes: TreeItemComponentModel[]) => Promise<void>
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
  loadingError: Ref<Error | null>
  scheduleData: Ref<ElementData[]>
  rootNodes: Ref<TreeItemComponentModel[]> | ComputedRef<TreeItemComponentModel[]>
  isInitialized?: Ref<boolean>
  selectedParentCategories: Ref<string[]>
  selectedChildCategories: Ref<string[]>
}

export function useScheduleInitializationFlow(
  options: UseScheduleInitializationFlowOptions
) {
  const {
    initializeData,
    updateRootNodes,
    waitForData,
    loadSettings,
    handleTableSelection,
    currentTable,
    selectedTableId,
    currentTableId,
    loadingError,
    scheduleData,
    rootNodes,
    isInitialized,
    selectedParentCategories,
    selectedChildCategories
  } = options

  function validateInitialState() {
    debug.log(DebugCategories.VALIDATION, 'Validating initial state')

    // Check settings
    if (!currentTable.value && selectedTableId.value) {
      debug.warn(DebugCategories.VALIDATION, 'Selected table ID without table data', {
        selectedId: selectedTableId.value
      })
      return false
    }

    // Check schedule data - empty data is valid when no categories are selected
    const hasCategories =
      selectedParentCategories.value.length > 0 ||
      selectedChildCategories.value.length > 0
    if (hasCategories && !Array.isArray(scheduleData.value)) {
      debug.warn(DebugCategories.VALIDATION, 'Invalid schedule data format', {
        type: typeof scheduleData.value,
        value: scheduleData.value
      })
      return false
    }

    debug.log(DebugCategories.VALIDATION, 'Initial state validation complete', {
      hasTable: !!currentTable.value,
      selectedId: selectedTableId.value,
      dataCount: scheduleData.value.length,
      hasCategories,
      parentCategories: selectedParentCategories.value,
      childCategories: selectedChildCategories.value
    })

    return true
  }

  async function initialize() {
    debug.log(DebugCategories.INITIALIZATION, 'Starting initialization flow')

    try {
      // Load settings first
      await loadSettings()
      debug.log(DebugCategories.INITIALIZATION, 'Settings loaded')

      // Initialize data
      await initializeData()
      debug.log(DebugCategories.INITIALIZATION, 'Data initialized')

      // Wait for root nodes to be available
      const nodes = await waitForData(
        () => rootNodes.value,
        (nodes) => Array.isArray(nodes) && nodes.length > 0,
        10000
      )

      // Update root nodes
      await updateRootNodes(nodes)
      debug.log(DebugCategories.INITIALIZATION, 'Root nodes updated', {
        nodeCount: nodes.length
      })

      // Only wait for schedule data if categories are selected
      const hasCategories =
        selectedParentCategories.value.length > 0 ||
        selectedChildCategories.value.length > 0
      if (hasCategories) {
        await waitForData(
          () => scheduleData.value,
          (data) => Array.isArray(data) && data.length > 0,
          10000
        )
      }

      // If we have a selected table, load it
      if (selectedTableId.value) {
        debug.log(DebugCategories.INITIALIZATION, 'Loading selected table:', {
          id: selectedTableId.value
        })

        // Handle table selection and wait for it to complete
        await handleTableSelection(selectedTableId.value)

        // Wait for table to be loaded
        const loadedTable = await waitForData(
          () => currentTable.value,
          (table) => !!table && !!table.categoryFilters,
          10000
        )

        debug.log(DebugCategories.INITIALIZATION, 'Table loaded:', {
          id: currentTableId.value,
          name: loadedTable.name,
          categories: loadedTable.categoryFilters
        })
      }

      // Validate the initialized state
      const isValid = validateInitialState()
      if (!isValid) {
        throw new Error('Invalid state after initialization')
      }

      // Mark as initialized if we have the ref
      if (isInitialized) {
        isInitialized.value = true
        debug.log(
          DebugCategories.INITIALIZATION,
          'Initialization state marked as complete'
        )
      }

      debug.log(DebugCategories.INITIALIZATION, 'Initialization flow complete', {
        hasTable: !!currentTable.value,
        selectedId: selectedTableId.value,
        dataCount: scheduleData.value.length,
        hasCategories,
        parentCategories: selectedParentCategories.value,
        childCategories: selectedChildCategories.value
      })
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Initialization flow error:', err)
      loadingError.value =
        err instanceof Error ? err : new Error('Initialization failed')

      // Reset initialization state on error
      if (isInitialized) {
        isInitialized.value = false
      }

      throw loadingError.value
    }
  }

  return {
    initialize,
    validateInitialState
  }
}
