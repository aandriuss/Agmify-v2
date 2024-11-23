import { ref, computed, type ComputedRef } from 'vue'
import { debug, DebugCategories } from '../debug/useDebug'
import { useInjectedViewer } from '~~/lib/viewer/composables/setup'
import type { ElementData, TreeItemComponentModel } from '../types'
import type { NamedTableConfig } from '~/composables/useUserSettings'

interface InitializationFlowOptions {
  // Core data initialization
  initializeData: () => Promise<void>
  waitForData: () => Promise<ElementData[]>
  // Tree node handling
  updateRootNodes: (nodes: TreeItemComponentModel[]) => Promise<void>
  // Settings and table management
  loadSettings: () => Promise<void>
  handleTableSelection: (id: string) => Promise<void>
  // State refs
  currentTable: ComputedRef<NamedTableConfig | null>
  selectedTableId: ComputedRef<string>
  currentTableId: ComputedRef<string>
  loadingError: { value: Error | null }
  scheduleData: ComputedRef<ElementData[]>
  rootNodes: ComputedRef<TreeItemComponentModel[]>
  isInitialized: ComputedRef<boolean>
  selectedParentCategories: { value: string[] }
  selectedChildCategories: { value: string[] }
  projectId: ComputedRef<string>
}

/**
 * Coordinates high-level initialization flow between viewer, parameters, and table selection.
 * This composable orchestrates the initialization sequence while useScheduleInitialization
 * handles the core data initialization.
 */
export function useScheduleInitializationFlow(options: InitializationFlowOptions) {
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
    selectedChildCategories,
    projectId
  } = options

  const isInitializing = ref(false)
  const viewer = useInjectedViewer()

  async function waitForViewer(maxAttempts = 10, interval = 500): Promise<void> {
    if (!viewer) {
      throw new Error('Viewer not available')
    }

    let attempts = 0
    while (attempts < maxAttempts) {
      if (viewer.init.ref.value) {
        return
      }
      await new Promise((resolve) => setTimeout(resolve, interval))
      attempts++
    }
    throw new Error('Timeout waiting for viewer initialization')
  }

  async function initialize() {
    if (isInitializing.value) {
      debug.log(DebugCategories.INITIALIZATION, 'Initialization already in progress')
      return
    }

    isInitializing.value = true
    try {
      debug.log(DebugCategories.INITIALIZATION, 'Starting initialization flow')

      // Step 1: Wait for viewer initialization
      await waitForViewer()

      // Step 2: Load user settings
      await loadSettings()

      // Step 3: Initialize core data
      await initializeData()
      debug.log(DebugCategories.INITIALIZATION, 'Core data initialized')

      // Step 4: Wait for data and update nodes
      const data = await waitForData()
      if (data.length > 0) {
        await updateRootNodes(rootNodes.value)
      }

      // Step 5: Handle table selection
      if (selectedTableId.value) {
        await handleTableSelection(selectedTableId.value)
      }

      debug.log(DebugCategories.INITIALIZATION, 'Core initialization complete', {
        projectId: projectId.value,
        currentTable: currentTable.value,
        selectedTableId: selectedTableId.value,
        currentTableId: currentTableId.value,
        scheduleData: scheduleData.value,
        rootNodes: rootNodes.value,
        isInitialized: isInitialized.value,
        selectedParentCategories: selectedParentCategories.value,
        selectedChildCategories: selectedChildCategories.value,
        hasViewer: !!viewer?.init.ref.value
      })
    } catch (error) {
      debug.error(DebugCategories.ERROR, 'Initialization flow failed:', {
        error,
        hasViewer: !!viewer?.init.ref.value
      })
      loadingError.value = error instanceof Error ? error : new Error(String(error))
      throw error
    } finally {
      isInitializing.value = false
    }
  }

  return {
    initialize,
    isInitializing: computed(() => isInitializing.value)
  }
}
