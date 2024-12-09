import { ref, watch, computed } from 'vue'
import { useNuxtApp } from '#app'
import { debug, DebugCategories } from '~/components/viewer/schedules/debug/useDebug'
import { useParametersGraphQL } from './useParametersGraphQL'
import { useUpdateQueue } from '../settings/useUpdateQueue'
import type { Parameter, ParameterTableMapping } from '~/composables/core/types'
import { ParameterError } from './errors'
import { getParameterGroup } from '~/composables/core/types'

export function useParametersState() {
  const nuxtApp = useNuxtApp()

  // State
  const parameters = ref<Record<string, Parameter>>({})
  const tableMappings = ref<Record<string, ParameterTableMapping[]>>({})
  const loading = ref(false)
  const error = ref<Error | null>(null)
  const isUpdating = ref(false)

  // Initialize GraphQL
  const graphqlClient = nuxtApp.runWithContext(() => useParametersGraphQL())
  if (!graphqlClient || graphqlClient instanceof Promise) {
    throw new ParameterError('Failed to initialize parameters GraphQL')
  }

  const {
    result: parametersResult,
    fetchParameters,
    createParameter: createParameterGQL,
    updateParameter: updateParameterGQL,
    deleteParameter: deleteParameterGQL,
    addParameterToTable: addParameterToTableGQL,
    removeParameterFromTable: removeParameterFromTableGQL
  } = graphqlClient

  const { queueUpdate } = useUpdateQueue()

  // Computed properties for parameter organization
  const parameterGroups = computed(() => {
    const groups = new Set<string>()
    Object.values(parameters.value).forEach((param) => {
      const group = getParameterGroup(param)
      if (group) groups.add(group)
    })
    return Array.from(groups).sort()
  })

  const parametersByGroup = computed(() => {
    const grouped: Record<string, Parameter[]> = {}
    Object.values(parameters.value).forEach((param) => {
      const group = getParameterGroup(param)
      if (group) {
        if (!grouped[group]) grouped[group] = []
        grouped[group].push(param)
      }
    })
    return grouped
  })

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
        // Convert each parameter
        parameters.value = newParameters

        debug.log(DebugCategories.INITIALIZATION, 'Parameters updated', {
          count: Object.keys(parameters.value).length,
          groups: parameterGroups.value
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
        parameters.value = parametersData

        debug.log(DebugCategories.INITIALIZATION, 'Parameters loaded', {
          count: Object.keys(parameters.value).length,
          groups: parameterGroups.value
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

  async function createParameter(parameterData: Parameter): Promise<Parameter> {
    return queueUpdate(async () => {
      try {
        debug.startState(DebugCategories.STATE, 'Creating parameter')
        loading.value = true
        error.value = null
        isUpdating.value = true

        const createdParam = await createParameterGQL(parameterData)

        // Update local state
        parameters.value = {
          ...parameters.value,
          [parameterData.id]: createdParam
        }

        debug.log(DebugCategories.STATE, 'Parameter created', {
          id: createdParam.id,
          group: getParameterGroup(createdParam)
        })

        return createdParam
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
    updates: Partial<Omit<Parameter, 'id' | 'kind'>>
  ): Promise<Parameter> {
    return queueUpdate(async () => {
      try {
        debug.startState(DebugCategories.STATE, 'Updating parameter')
        loading.value = true
        error.value = null
        isUpdating.value = true

        const updatedParam = await updateParameterGQL(id, updates)

        // Update local state
        parameters.value = {
          ...parameters.value,
          [id]: updatedParam
        }

        debug.log(DebugCategories.STATE, 'Parameter updated', {
          id: updatedParam.id,
          group: getParameterGroup(updatedParam)
        })

        debug.completeState(DebugCategories.STATE, 'Parameter updated successfully')
        return updatedParam
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

        // Remove from table mappings
        Object.keys(tableMappings.value).forEach((tableId) => {
          tableMappings.value[tableId] = tableMappings.value[tableId].filter(
            (mapping) => mapping.parameterId !== id
          )
        })

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

  async function addParameterToTable(
    parameterId: string,
    tableId: string
  ): Promise<void> {
    return queueUpdate(async () => {
      try {
        debug.startState(DebugCategories.STATE, 'Adding parameter to table')
        loading.value = true
        error.value = null
        isUpdating.value = true

        if (!parameters.value[parameterId]) {
          throw new Error('Parameter not found')
        }

        // Add mapping to GraphQL
        await addParameterToTableGQL(parameterId, tableId)

        // Update local state
        if (!tableMappings.value[tableId]) {
          tableMappings.value[tableId] = []
        }

        if (!tableMappings.value[tableId].some((m) => m.parameterId === parameterId)) {
          tableMappings.value[tableId].push({
            parameterId,
            tableId
          })
        }

        debug.completeState(DebugCategories.STATE, 'Parameter added to table')
      } catch (err) {
        debug.error(DebugCategories.ERROR, 'Failed to add parameter to table', err)
        throw err instanceof Error ? err : new Error('Failed to add parameter to table')
      } finally {
        loading.value = false
        isUpdating.value = false
      }
    })
  }

  async function removeParameterFromTable(
    parameterId: string,
    tableId: string
  ): Promise<void> {
    return queueUpdate(async () => {
      try {
        debug.startState(DebugCategories.STATE, 'Removing parameter from table')
        loading.value = true
        error.value = null
        isUpdating.value = true

        // Remove mapping from GraphQL
        await removeParameterFromTableGQL(parameterId, tableId)

        // Update local state
        if (tableMappings.value[tableId]) {
          tableMappings.value[tableId] = tableMappings.value[tableId].filter(
            (mapping) => mapping.parameterId !== parameterId
          )
        }

        debug.completeState(DebugCategories.STATE, 'Parameter removed from table')
      } catch (err) {
        debug.error(DebugCategories.ERROR, 'Failed to remove parameter from table', err)
        throw err instanceof Error
          ? err
          : new Error('Failed to remove parameter from table')
      } finally {
        loading.value = false
        isUpdating.value = false
      }
    })
  }

  return {
    // State
    parameters,
    tableMappings,
    parameterGroups,
    parametersByGroup,
    loading,
    error,
    isUpdating,

    // Operations
    loadParameters,
    createParameter,
    updateParameter,
    deleteParameter,
    addParameterToTable,
    removeParameterFromTable
  }
}
