import { ref, watch } from 'vue'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import { useUserSettingsGraphQL } from './useUserSettingsGraphQL'
import { useUpdateQueue } from '../useUpdateQueue'
import { DEFAULT_SETTINGS } from '~/composables/core/types'

interface UserSettingsState {
  controlWidth: number
  loading: boolean
  error: Error | null
}

export function useUserSettingsState() {
  // Initialize with default control width
  const state = ref<UserSettingsState>({
    controlWidth: DEFAULT_SETTINGS.controlWidth,
    loading: false,
    error: null
  })

  const isUpdating = ref(false)
  const lastUpdateTime = ref(0)

  // Initialize GraphQL operations
  const { result, queryLoading, fetchControlWidth, updateControlWidth } =
    useUserSettingsGraphQL()
  const { queueUpdate } = useUpdateQueue()

  // Watch for control width changes
  watch(
    () => result.value?.activeUser?.userSettings?.controlWidth,
    (newWidth) => {
      // Skip if we're updating or if this is a response to our own update
      const timeSinceLastUpdate = Date.now() - lastUpdateTime.value
      if (isUpdating.value || timeSinceLastUpdate < 500) {
        debug.log(
          DebugCategories.INITIALIZATION,
          'Skipping control width update during local change',
          { isUpdating: isUpdating.value, timeSinceLastUpdate }
        )
        return
      }

      debug.log(DebugCategories.INITIALIZATION, 'Control width received', {
        hasWidth: newWidth !== undefined
      })

      // Update control width in state
      state.value = {
        ...state.value,
        controlWidth: newWidth ?? DEFAULT_SETTINGS.controlWidth
      }
    }
  )

  async function loadControlWidth(): Promise<void> {
    try {
      debug.startState(DebugCategories.INITIALIZATION, 'Loading control width')
      state.value.loading = true
      state.value.error = null

      const width = await fetchControlWidth()
      state.value.controlWidth = width ?? DEFAULT_SETTINGS.controlWidth

      debug.log(DebugCategories.INITIALIZATION, 'Control width loaded', {
        width: state.value.controlWidth
      })

      debug.completeState(
        DebugCategories.INITIALIZATION,
        'Control width loaded successfully'
      )
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to load control width', err)
      state.value.error =
        err instanceof Error ? err : new Error('Failed to load control width')
      // Use default width on error
      state.value.controlWidth = DEFAULT_SETTINGS.controlWidth
    } finally {
      state.value.loading = false
    }
  }

  async function saveControlWidth(width: number): Promise<boolean> {
    return queueUpdate(async () => {
      try {
        debug.startState(DebugCategories.STATE, 'Saving control width')
        state.value.loading = true
        state.value.error = null
        isUpdating.value = true
        lastUpdateTime.value = Date.now()

        const success = await updateControlWidth(width)
        if (success) {
          state.value.controlWidth = width
        }

        debug.completeState(DebugCategories.STATE, 'Control width saved')
        return success
      } catch (err) {
        debug.error(DebugCategories.ERROR, 'Failed to save control width', err)
        state.value.error =
          err instanceof Error ? err : new Error('Failed to save control width')
        throw state.value.error
      } finally {
        state.value.loading = false
        isUpdating.value = false
      }
    })
  }

  return {
    state,
    loading: state.value.loading || queryLoading.value,
    error: state.value.error,
    isUpdating,
    lastUpdateTime,
    loadControlWidth,
    saveControlWidth
  }
}
