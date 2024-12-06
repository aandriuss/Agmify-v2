import { ref, watch } from 'vue'
import { useNuxtApp } from '#app'
import { debug, DebugCategories } from '~/components/viewer/schedules/debug/useDebug'
import { useParametersGraphQL } from './useParametersGraphQL'
import { useUpdateQueue } from '../settings/useUpdateQueue'
import type { UnifiedParameter } from '../core/types'

export function useParametersState() {
  const nuxtApp = useNuxtApp()

  const parameters = ref<Record<string, UnifiedParameter>>({})
  const loading = ref(false)
  const error = ref<Error | null>(null)
  const isUpdating = ref(false)
  const lastUpdateTime = ref(0)

  const parametersGraphQL = nuxtApp.runWithContext(() => useParametersGraphQL())

  if (!parametersGraphQL || parametersGraphQL instanceof Promise) {
    throw new Error('Failed to initialize parameters GraphQL')
  }

  const {
    result: parametersResult,
    fetchParameters,
    updateParameters: updateParametersGQL
  } = parametersGraphQL

  const { queueUpdate } = useUpdateQueue()

  // Watch for remote parameters changes
  watch(
    () => parametersResult.value?.activeUser?.parameters,
    (newParameters) => {
      const timeSinceLastUpdate = Date.now() - lastUpdateTime.value
      if (isUpdating.value || timeSinceLastUpdate < 500) {
        debug.log(
          DebugCategories.INITIALIZATION,
          'Skipping parameters update during local change',
          { isUpdating: isUpdating.value, timeSinceLastUpdate }
        )
        return
      }

      debug.log(DebugCategories.INITIALIZATION, 'Raw parameters received', {
        hasParameters: !!newParameters
      })

      if (!newParameters) {
        parameters.value = {}
        return
      }

      try {
        parameters.value = newParameters as Record<string, UnifiedParameter>
        debug.log(DebugCategories.INITIALIZATION, 'Parameters updated')
      } catch (err) {
        debug.error(DebugCategories.ERROR, 'Failed to process parameters update', err)
      }
    },
    { deep: true }
  )

  async function loadParameters(): Promise<void> {
    try {
      debug.startState(DebugCategories.INITIALIZATION, 'Loading parameters')
      loading.value = true
      error.value = null

      const parametersData = await fetchParameters()

      if (parametersData) {
        parameters.value = parametersData as Record<string, UnifiedParameter>
      } else {
        parameters.value = {}
      }

      debug.completeState(
        DebugCategories.INITIALIZATION,
        'Parameters loaded successfully'
      )
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to load parameters', err)
      error.value = err instanceof Error ? err : new Error('Failed to load parameters')
    } finally {
      loading.value = false
    }
  }

  async function saveParameters(
    newParameters: Record<string, UnifiedParameter>
  ): Promise<boolean> {
    return queueUpdate(async () => {
      try {
        debug.startState(DebugCategories.STATE, 'Saving parameters')
        loading.value = true
        error.value = null
        isUpdating.value = true
        lastUpdateTime.value = Date.now()

        // Update local state first
        parameters.value = newParameters

        // Then save to backend
        await updateParametersGQL(newParameters)

        debug.completeState(DebugCategories.STATE, 'Parameters saved successfully')
        return true
      } catch (err) {
        debug.error(DebugCategories.ERROR, 'Failed to save parameters', err)
        error.value =
          err instanceof Error ? err : new Error('Failed to save parameters')
        throw error.value
      } finally {
        loading.value = false
        // Add a small delay before allowing next update
        setTimeout(() => {
          isUpdating.value = false
        }, 500)
      }
    })
  }

  return {
    parameters,
    loading,
    error,
    isUpdating,
    lastUpdateTime,
    loadParameters,
    saveParameters
  }
}
