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
      if (isUpdating.value) {
        debug.log(
          DebugCategories.INITIALIZATION,
          'Skipping parameters update during local change'
        )
        return
      }

      debug.log(DebugCategories.INITIALIZATION, 'Raw parameters received', {
        hasParameters: !!newParameters,
        parameterCount: newParameters ? Object.keys(newParameters).length : 0
      })

      try {
        if (newParameters) {
          parameters.value = newParameters as Record<string, UnifiedParameter>
          debug.log(DebugCategories.INITIALIZATION, 'Parameters updated', {
            count: Object.keys(parameters.value).length
          })
        } else {
          parameters.value = {}
          debug.warn(
            DebugCategories.INITIALIZATION,
            'No parameters found, using empty object'
          )
        }
      } catch (err) {
        debug.error(DebugCategories.ERROR, 'Failed to process parameters update', err)
        error.value =
          err instanceof Error ? err : new Error('Failed to process parameters')
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
        parameters.value = parametersData
        debug.log(DebugCategories.INITIALIZATION, 'Parameters loaded', {
          count: Object.keys(parameters.value).length
        })
      } else {
        parameters.value = {}
        debug.warn(
          DebugCategories.INITIALIZATION,
          'No parameters found, using empty object'
        )
      }

      debug.completeState(
        DebugCategories.INITIALIZATION,
        'Parameters loaded successfully'
      )
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to load parameters', err)
      error.value = err instanceof Error ? err : new Error('Failed to load parameters')
      throw error.value
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

        // Create a new object to store merged parameters
        const mergedParameters: Record<string, UnifiedParameter> = {
          ...parameters.value
        }

        // Merge new parameters one by one
        Object.entries(newParameters).forEach(([key, parameter]) => {
          // If parameter already exists, preserve its ID and merge other properties
          if (mergedParameters[key]) {
            mergedParameters[key] = {
              ...mergedParameters[key],
              ...parameter,
              id: mergedParameters[key].id // Ensure we keep the original ID
            }
          } else {
            // If it's a new parameter, add it as is
            mergedParameters[key] = parameter
          }
        })

        // Update backend first
        const success = await updateParametersGQL(mergedParameters)

        if (!success) {
          throw new Error('Failed to update parameters on server')
        }

        // Update local state after successful backend update
        parameters.value = mergedParameters

        debug.completeState(DebugCategories.STATE, 'Parameters saved successfully')
        return true
      } catch (err) {
        debug.error(DebugCategories.ERROR, 'Failed to save parameters', err)
        error.value =
          err instanceof Error ? err : new Error('Failed to save parameters')
        throw error.value
      } finally {
        loading.value = false
        isUpdating.value = false
      }
    })
  }

  return {
    parameters,
    loading,
    error,
    isUpdating,
    loadParameters,
    saveParameters
  }
}
