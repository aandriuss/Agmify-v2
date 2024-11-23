import { ref, computed } from 'vue'
import { debug, DebugCategories } from '../debug/useDebug'
import { useStore } from '../core/store'

/**
 * Handles initial setup of the schedule system.
 * Since we're inside the viewer component, data is already loaded.
 */
export function useScheduleInitialization() {
  const initialized = ref(false)
  const loading = ref(false)
  const error = ref<Error | null>(null)
  const store = useStore()

  async function initializeData() {
    debug.startState('Schedule initialization')
    loading.value = true
    error.value = null

    try {
      // Only initialize if not already initialized
      if (!store.initialized.value) {
        // Initialize store
        await store.lifecycle.update({})
        initialized.value = true

        debug.log(DebugCategories.INITIALIZATION, 'Schedule initialization complete', {
          storeInitialized: store.initialized.value,
          scheduleInitialized: initialized.value,
          dataLength: store.scheduleData.value?.length || 0,
          columnsLength: store.mergedTableColumns.value?.length || 0
        })
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      error.value = new Error(`Initialization failed: ${errorMessage}`)

      debug.error(DebugCategories.ERROR, 'Initialization failed:', {
        error: err,
        storeState: {
          initialized: store.initialized.value,
          scheduleInitialized: initialized.value,
          dataLength: store.scheduleData.value?.length || 0
        }
      })
      throw error.value
    } finally {
      loading.value = false
      debug.completeState('Schedule initialization')
    }
  }

  // Initialize immediately since data is already loaded
  initializeData()

  return {
    initialized: computed(() => initialized.value && store.initialized.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    initializeData
  }
}
