import { ref, computed } from 'vue'
import { useNuxtApp } from '#app'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import { useParametersGraphQL } from './useParametersGraphQL'
import { useUpdateQueue } from '../settings/useUpdateQueue'
import { useParameterStore } from '~/composables/core/parameters/store/store'
import { ParameterError } from './errors'

interface ParameterTableMapping {
  parameterId: string
  tableIds: string[]
}

export function useParametersState() {
  const nuxtApp = useNuxtApp()

  // State
  const tableMappings = ref<Record<string, ParameterTableMapping>>({})
  const loading = ref(false)
  const error = ref<Error | null>(null)
  const isUpdating = ref(false)

  // Initialize stores
  const parameterStore = useParameterStore()
  if (!parameterStore) {
    throw new ParameterError('Failed to initialize parameter store')
  }

  // Initialize GraphQL
  const graphqlClient = nuxtApp.runWithContext(() => useParametersGraphQL())
  if (!graphqlClient || graphqlClient instanceof Promise) {
    throw new ParameterError('Failed to initialize parameters GraphQL')
  }

  const {
    addParameterToTable: addParameterToTableGQL,
    removeParameterFromTable: removeParameterFromTableGQL
  } = graphqlClient

  const { queueUpdate } = useUpdateQueue()

  // Computed properties for parameter state
  const parameters = computed(() => {
    if (!parameterStore) return null

    return {
      parent: {
        raw: parameterStore.parentRawParameters.value || [],
        available: {
          bim: parameterStore.parentAvailableBimParameters.value || [],
          user: parameterStore.parentAvailableUserParameters.value || []
        },
        selected: parameterStore.parentSelectedParameters.value || []
      },
      child: {
        raw: parameterStore.childRawParameters.value || [],
        available: {
          bim: parameterStore.childAvailableBimParameters.value || [],
          user: parameterStore.childAvailableUserParameters.value || []
        },
        selected: parameterStore.childSelectedParameters.value || []
      }
    }
  })

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

        // Add mapping to GraphQL
        await addParameterToTableGQL(parameterId, tableId)

        // Update local state
        if (!tableMappings.value[parameterId]) {
          tableMappings.value[parameterId] = {
            parameterId,
            tableIds: []
          }
        }

        if (!tableMappings.value[parameterId].tableIds.includes(tableId)) {
          tableMappings.value[parameterId].tableIds.push(tableId)
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
        if (tableMappings.value[parameterId]) {
          tableMappings.value[parameterId].tableIds = tableMappings.value[
            parameterId
          ].tableIds.filter((id) => id !== tableId)
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
    loading,
    error,
    isUpdating,

    // Operations
    addParameterToTable,
    removeParameterFromTable
  }
}
