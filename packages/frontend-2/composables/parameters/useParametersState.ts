import { ref, watch } from 'vue'
import { useNuxtApp } from '#app'
import { debug, DebugCategories } from '~/components/viewer/schedules/debug/useDebug'
import { useParametersGraphQL, type Parameter } from './useParametersGraphQL'
import { useUpdateQueue } from '../settings/useUpdateQueue'
import type { UnifiedParameter } from '~/composables/core/types'
import { ParameterError } from './errors'

export function useParametersState() {
  const nuxtApp = useNuxtApp()

  // State
  const parameters = ref<Record<string, UnifiedParameter>>({})
  const loading = ref(false)
  const error = ref<Error | null>(null)
  const isUpdating = ref(false)

  // Initialize GraphQL
  const graphql = nuxtApp.runWithContext(() => useParametersGraphQL())
  if (!graphql || graphql instanceof Promise) {
    throw new ParameterError('Failed to initialize parameters GraphQL')
  }

  const {
    result: parametersResult,
    fetchParameters,
    createParameter: createParameterGQL,
    updateParameter: updateParameterGQL,
    deleteParameter: deleteParameterGQL
  } = graphql

  const { queueUpdate } = useUpdateQueue()

  // Convert GraphQL parameter to UnifiedParameter
  function convertToUnifiedParameter(param: Parameter): UnifiedParameter {
    return {
      id: param.id,
      name: param.name,
      type: param.type,
      value: param.value || '',
      field: param.field,
      visible: param.visible,
      header: param.header || param.name,
      category: param.category,
      description: param.description,
      source: param.source,
      isFetched: param.isFetched ?? false,
      currentGroup: param.group || 'Custom',
      computed: {
        value: param.value || '',
        isValid: true
      }
    }
  }

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

      if (!newParameters) {
        debug.warn(DebugCategories.INITIALIZATION, 'No parameters received')
        return
      }

      debug.log(DebugCategories.INITIALIZATION, 'Raw parameters received', {
        parameterCount: Object.keys(newParameters).length
      })

      try {
        // Convert each parameter to UnifiedParameter
        const convertedParameters = Object.entries(newParameters).reduce<
          Record<string, UnifiedParameter>
        >((acc, [key, param]) => {
          if (param) {
            acc[key] = convertToUnifiedParameter(param)
          }
          return acc
        }, {})

        // Merge with existing parameters
        parameters.value = {
          ...parameters.value,
          ...convertedParameters
        }

        debug.log(DebugCategories.INITIALIZATION, 'Parameters updated', {
          count: Object.keys(parameters.value).length
        })
      } catch (err) {
        debug.error(DebugCategories.ERROR, 'Failed to process parameters update', err)
        if (err instanceof Error) {
          error.value = err
        }
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

      if (parametersData && Object.keys(parametersData).length > 0) {
        // Convert each parameter to UnifiedParameter
        const convertedParameters = Object.entries(parametersData).reduce<
          Record<string, UnifiedParameter>
        >((acc, [key, param]) => {
          if (param) {
            acc[key] = convertToUnifiedParameter(param)
          }
          return acc
        }, {})

        parameters.value = convertedParameters

        debug.log(DebugCategories.INITIALIZATION, 'Parameters loaded', {
          count: Object.keys(parameters.value).length
        })
      }

      debug.completeState(
        DebugCategories.INITIALIZATION,
        'Parameters loaded successfully'
      )
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to load parameters', err)
      if (err instanceof Error) {
        error.value = err
        throw err
      }
      throw new Error('Failed to load parameters')
    } finally {
      loading.value = false
    }
  }

  async function createParameter(
    parameterData: UnifiedParameter
  ): Promise<UnifiedParameter> {
    return queueUpdate(async () => {
      try {
        debug.startState(DebugCategories.STATE, 'Creating parameter')
        loading.value = true
        error.value = null
        isUpdating.value = true

        // Pass through the existing ID
        const createdParameter = await createParameterGQL(parameterData)

        // Update local state
        parameters.value = {
          ...parameters.value,
          [parameterData.id]: createdParameter
        }

        return createdParameter
      } catch (err) {
        debug.error(DebugCategories.ERROR, 'Failed to create parameter', err)
        if (err instanceof Error) {
          throw err
        }
        throw new Error('Failed to create parameter')
      } finally {
        loading.value = false
        isUpdating.value = false
      }
    })
  }

  async function updateParameter(
    id: string,
    updates: Partial<Omit<UnifiedParameter, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<UnifiedParameter> {
    return queueUpdate(async () => {
      try {
        debug.startState(DebugCategories.STATE, 'Updating parameter')
        loading.value = true
        error.value = null
        isUpdating.value = true

        const updatedParameter = await updateParameterGQL(id, updates)
        const unifiedParameter = convertToUnifiedParameter(updatedParameter)

        // Update local state
        parameters.value = {
          ...parameters.value,
          [id]: unifiedParameter
        }

        debug.completeState(DebugCategories.STATE, 'Parameter updated successfully')
        return unifiedParameter
      } catch (err) {
        debug.error(DebugCategories.ERROR, 'Failed to update parameter', err)
        if (err instanceof Error) {
          throw err
        }
        throw new Error('Failed to update parameter')
      } finally {
        loading.value = false
        isUpdating.value = false
      }
    })
  }

  async function deleteParameter(id: string): Promise<void> {
    return queueUpdate(async () => {
      try {
        debug.startState(DebugCategories.STATE, 'Deleting parameter')
        loading.value = true
        error.value = null
        isUpdating.value = true

        await deleteParameterGQL(id)

        // Update local state
        const { [id]: removed, ...rest } = parameters.value
        parameters.value = rest

        debug.completeState(DebugCategories.STATE, 'Parameter deleted successfully')
      } catch (err) {
        debug.error(DebugCategories.ERROR, 'Failed to delete parameter', err)
        if (err instanceof Error) {
          throw err
        }
        throw new Error('Failed to delete parameter')
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
    createParameter,
    updateParameter,
    deleteParameter
  }
}
