import { ref, computed } from 'vue'
import { debug, DebugCategories } from '../utils/debug'
import type { ElementData } from '../types'
import store from './useScheduleStore'
import { useInjectedViewer } from '~~/lib/viewer/composables/setup'

export function useScheduleInitialization() {
  const initialized = ref(false)
  const loading = ref(false)
  const error = ref<Error | null>(null)
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

  async function initializeData(projectId?: string) {
    debug.log(DebugCategories.INITIALIZATION, 'Initializing schedule data')
    loading.value = true
    error.value = null

    try {
      // Wait for viewer initialization first
      await waitForViewer()

      // Validate project ID
      if (!projectId) {
        throw new Error('Project ID is required but not provided')
      }

      // Set project ID in store first
      store.setProjectId(projectId)

      // Initialize store
      await store.lifecycle.init()

      initialized.value = true
      debug.log(DebugCategories.INITIALIZATION, 'Schedule data initialized', {
        projectId,
        hasViewer: !!viewer?.init.ref.value
      })
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
      debug.error(DebugCategories.ERROR, 'Failed to initialize schedule data:', {
        error: err,
        hasViewer: !!viewer?.init.ref.value
      })
      throw error.value
    } finally {
      loading.value = false
    }
  }

  async function waitForData(projectId?: string): Promise<ElementData[]> {
    debug.log(DebugCategories.INITIALIZATION, 'Waiting for schedule data')
    try {
      // Wait for viewer initialization first
      await waitForViewer()

      // Validate project ID
      if (!projectId) {
        throw new Error('Project ID is required but not provided')
      }

      // Ensure project ID matches store
      if (store.projectId.value !== projectId) {
        throw new Error('Project ID mismatch')
      }

      // Wait for initialization
      if (!initialized.value) {
        throw new Error('Schedule data not initialized')
      }

      // Wait for any pending store updates
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Ensure data is available
      if (!store.scheduleData.value.length) {
        await new Promise((resolve) => setTimeout(resolve, 200))
      }

      debug.log(DebugCategories.INITIALIZATION, 'Schedule data ready', {
        dataCount: store.scheduleData.value.length,
        projectId,
        hasViewer: !!viewer?.init.ref.value
      })

      // Return current data
      return store.scheduleData.value
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
      debug.error(DebugCategories.ERROR, 'Failed to wait for schedule data:', {
        error: err,
        hasViewer: !!viewer?.init.ref.value
      })
      throw error.value
    }
  }

  return {
    initialized: computed(() => initialized.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    initializeData,
    waitForData
  }
}
