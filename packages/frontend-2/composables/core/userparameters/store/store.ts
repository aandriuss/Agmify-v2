/**
 * User Parameter Store
 *
 * Responsibilities:
 * 1. Parameter Management
 * - Load/save user parameters from/to PostgreSQL
 * - Manage current parameter state
 * - Handle parameter validation
 *
 * 2. Parameter Operations
 * - Create/update/delete parameters
 * - Parameter type safety
 * - Error handling
 */

import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import type { UserParameterStore, UserParameterStoreState } from './types'
import type { AvailableUserParameter } from '~/composables/core/types'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import { isEquationValue } from '~/composables/core/types'

class ParameterError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ParameterError'
  }
}

/**
 * Create initial store state
 */
function createInitialState(): UserParameterStoreState {
  return {
    parameters: {},
    loading: false,
    error: null,
    lastUpdated: Date.now()
  }
}

/**
 * Create user parameter store
 */
interface ParameterOperations {
  fetchParameters: () => Promise<Record<string, AvailableUserParameter>>
  updateParameters: (
    parameters: Record<string, AvailableUserParameter>
  ) => Promise<boolean>
}

function createUserParameterStore(operations: ParameterOperations): UserParameterStore {
  const state = ref<UserParameterStoreState>(createInitialState())
  const { fetchParameters, updateParameters } = operations

  // Basic state refs
  const isLoading = computed(() => state.value.loading)
  const error = computed(() => state.value.error)
  const hasError = computed(() => state.value.error !== null)
  const lastUpdated = computed(() => state.value.lastUpdated)

  async function loadParameters(): Promise<Record<string, AvailableUserParameter>> {
    try {
      state.value.loading = true
      const parameters = await fetchParameters()
      state.value.parameters = parameters
      state.value.lastUpdated = Date.now()
      state.value.error = null
      return parameters
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      debug.error(DebugCategories.ERROR, 'Failed to load parameters:', error)
      state.value.error = error
      throw error
    } finally {
      state.value.loading = false
    }
  }

  /**
   * Create new parameter
   */
  async function createParameter(
    parameter: Omit<AvailableUserParameter, 'id'>
  ): Promise<AvailableUserParameter> {
    debug.startState(DebugCategories.STATE, 'Creating parameter')
    state.value.loading = true

    try {
      // Validate parameter
      if (!parameter.name || !parameter.type || !parameter.group) {
        throw new ParameterError('Name, type, and group are required')
      }

      // For equation type, ensure equation is provided
      if (parameter.type === 'equation' && !parameter.equation) {
        throw new ParameterError('Equation is required for equation type parameters')
      }

      // For fixed type, ensure value is primitive
      if (parameter.type === 'fixed' && isEquationValue(parameter.value)) {
        throw new ParameterError('Fixed type parameters cannot have equation values')
      }

      // Generate ID
      const id = `param_${uuidv4()}`

      // Create parameter with all required fields
      const newParameter: AvailableUserParameter = {
        ...parameter,
        id,
        kind: 'user',
        visible: true,
        field: parameter.name.toLowerCase().replace(/\s+/g, '_'), // Generate field from name
        header: parameter.name, // Use name as header
        removable: true, // User parameters are always removable
        value: parameter.type === 'fixed' ? parameter.value?.toString() || '' : '', // Ensure value is string
        metadata: {} // Initialize empty metadata
      }

      // Merge with existing parameters
      const updatedParameters = {
        ...state.value.parameters,
        [id]: newParameter
      }

      // Save to PostgreSQL
      await updateParameters(updatedParameters)

      // Update local state
      state.value.parameters = updatedParameters
      state.value.lastUpdated = Date.now()

      return newParameter
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      debug.error(DebugCategories.ERROR, 'Failed to create parameter:', error)
      state.value.error = error
      throw error
    } finally {
      state.value.loading = false
    }
  }

  /**
   * Update parameter
   */
  async function updateParameter(
    id: string,
    updates: Partial<Omit<AvailableUserParameter, 'id' | 'kind'>>
  ): Promise<AvailableUserParameter> {
    debug.startState(DebugCategories.STATE, 'Updating parameter', { id })
    state.value.loading = true

    try {
      const existingParameter = state.value.parameters[id]
      if (!existingParameter) {
        throw new ParameterError('Parameter not found')
      }

      // Validate updates
      if (
        updates.type === 'equation' &&
        !updates.equation &&
        !existingParameter.equation
      ) {
        throw new ParameterError('Equation is required for equation type parameters')
      }

      if (updates.type === 'fixed' && updates.value && isEquationValue(updates.value)) {
        throw new ParameterError('Fixed type parameters cannot have equation values')
      }

      // Create updated parameter
      const updatedParameter: AvailableUserParameter = {
        ...existingParameter,
        ...updates
      }

      // Update parameters map
      const updatedParameters = {
        ...state.value.parameters,
        [id]: updatedParameter
      }

      // Save to PostgreSQL
      await updateParameters(updatedParameters)

      // Update local state
      state.value.parameters = updatedParameters
      state.value.lastUpdated = Date.now()

      return updatedParameter
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      debug.error(DebugCategories.ERROR, 'Failed to update parameter:', error)
      state.value.error = error
      throw error
    } finally {
      state.value.loading = false
    }
  }

  /**
   * Delete parameter
   */
  async function deleteParameter(id: string): Promise<void> {
    debug.startState(DebugCategories.STATE, 'Deleting parameter', { id })
    state.value.loading = true

    try {
      if (!state.value.parameters[id]) {
        throw new ParameterError('Parameter not found')
      }

      // Create new parameters map without the deleted parameter
      const { [id]: removed, ...remainingParameters } = state.value.parameters

      // Save to PostgreSQL
      await updateParameters(remainingParameters)

      // Update local state
      state.value.parameters = remainingParameters
      state.value.lastUpdated = Date.now()
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      debug.error(DebugCategories.ERROR, 'Failed to delete parameter:', error)
      state.value.error = error
      throw error
    } finally {
      state.value.loading = false
    }
  }

  return {
    // State
    state: computed(() => state.value),
    isLoading,
    error,
    hasError,
    lastUpdated,

    // Core operations
    createParameter,
    updateParameter,
    deleteParameter,
    loadParameters,

    // Store management
    reset: () => {
      state.value = createInitialState()
      debug.log(DebugCategories.STATE, 'Store reset')
    }
  }
}

let store: UserParameterStore | null = null

/**
 * User parameter store composable
 * Provides access to the global user parameter store instance
 */
export function useUserParameterStore(operations?: ParameterOperations) {
  if (!store && operations) {
    store = createUserParameterStore(operations)
  }
  if (!store) {
    throw new Error('Parameter store not initialized')
  }
  return store
}
