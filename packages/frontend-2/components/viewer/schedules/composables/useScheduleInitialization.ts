import { ref, computed } from 'vue'
import { debug, DebugCategories } from '../utils/debug'
import type { ElementData } from '../types'
import store from './useScheduleStore'
import { useInjectedViewerState } from '~~/lib/viewer/composables/setup'
import { defaultTable } from '../config/defaultColumns'

/**
 * Handles core data initialization for the schedule system.
 * This composable is responsible for initializing the store with data,
 * while useScheduleInitializationFlow handles the high-level initialization flow.
 */
export function useScheduleInitialization() {
  const initialized = ref(false)
  const loading = ref(false)
  const error = ref<Error | null>(null)
  const viewerState = useInjectedViewerState()

  async function initializeData() {
    debug.log(DebugCategories.INITIALIZATION, 'Starting core data initialization')
    loading.value = true
    error.value = null

    try {
      // Step 1: Set initial categories from defaults
      store.setParentCategories(defaultTable.categoryFilters.selectedParentCategories)
      store.setChildCategories(defaultTable.categoryFilters.selectedChildCategories)

      debug.log(DebugCategories.INITIALIZATION, 'Initial categories set', {
        parent: defaultTable.categoryFilters.selectedParentCategories,
        child: defaultTable.categoryFilters.selectedChildCategories
      })

      // Step 2: Initialize store data
      await store.lifecycle.init()
      debug.log(DebugCategories.INITIALIZATION, 'Store lifecycle initialized')

      // Step 3: Process data into table format
      await store.processData()
      debug.log(DebugCategories.INITIALIZATION, 'Data processed', {
        dataCount: store.scheduleData.value.length,
        tableDataCount: store.tableData.value.length
      })

      // Step 4: Set project ID if available
      const projectId = viewerState.projectId.value
      if (projectId) {
        store.setProjectId(projectId)
        debug.log(DebugCategories.INITIALIZATION, 'Project ID set:', projectId)
      }

      // Step 5: Mark initialization complete
      store.setInitialized(true)
      initialized.value = true

      debug.log(DebugCategories.INITIALIZATION, 'Core initialization complete', {
        projectId: store.projectId.value,
        dataCount: store.scheduleData.value.length,
        parameterCount: store.parameterColumns.value.length,
        tableDataCount: store.tableData.value.length,
        storeInitialized: store.initialized.value
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      error.value = new Error(`Core initialization failed: ${errorMessage}`)

      debug.error(DebugCategories.ERROR, 'Core initialization failed:', {
        error: err,
        storeState: {
          projectId: store.projectId.value,
          scheduleData: store.scheduleData.value.length,
          tableData: store.tableData.value.length,
          mergedTableColumns: store.mergedTableColumns.value.length,
          initialized: store.initialized.value
        }
      })
      throw error.value
    } finally {
      loading.value = false
    }
  }

  async function waitForData(): Promise<ElementData[]> {
    debug.log(DebugCategories.INITIALIZATION, 'Waiting for core data')

    try {
      // Check initialization state
      if (!initialized.value) {
        throw new Error('Core data not initialized')
      }

      // Wait for any pending store updates
      await new Promise((resolve) => setTimeout(resolve, 0))

      debug.log(DebugCategories.INITIALIZATION, 'Core data ready', {
        dataCount: store.scheduleData.value.length,
        tableDataCount: store.tableData.value.length,
        storeInitialized: store.initialized.value
      })

      return store.scheduleData.value
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      error.value = new Error(`Failed to get core data: ${errorMessage}`)

      debug.error(DebugCategories.ERROR, 'Failed to get core data:', {
        error: err,
        storeState: {
          projectId: store.projectId.value,
          scheduleData: store.scheduleData.value.length,
          tableData: store.tableData.value.length,
          initialized: store.initialized.value
        }
      })
      throw error.value
    }
  }

  return {
    initialized: computed(() => initialized.value && store.initialized.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    initializeData,
    waitForData
  }
}
