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
import type {
  UserParameterStore,
  UserParameterStoreState,
  UserParameterStoreOptions
} from './types'
import type { AvailableUserParameter } from '~/composables/core/types'
import { useParametersGraphQL } from '../useParametersGraphQL'
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
    lastUpdated: Date.now(),
    initialized: false
  }
}

/**
 * Create user parameter store
 */
function createUserParameterStore(
  options: UserParameterStoreOptions = {}
): UserParameterStore {
  // Initialize state
  const state = ref<UserParameterStoreState>(createInitialState())
  let graphqlOps: Awaited<ReturnType<typeof useParametersGraphQL>> | null = null

  // Initialize state with available parameters
  if (options.initialParameters) {
    state.value.parameters = options.initialParameters
  }

  debug.log(DebugCategories.STATE, 'Store initialized', {
    parameterCount: Object.keys(state.value.parameters).length
  })

  // Basic state refs
  const isLoading = computed(() => state.value.loading)
  const error = computed(() => state.value.error)
  const hasError = computed(() => state.value.error !== null)
  const lastUpdated = computed(() => state.value.lastUpdated)

  /**
   * Initialize GraphQL operations
   */
  async function initGraphQL() {
    try {
      debug.startState(
        DebugCategories.INITIALIZATION,
        'Initializing GraphQL operations'
      )
      graphqlOps = await useParametersGraphQL()
      debug.completeState(
        DebugCategories.INITIALIZATION,
        'GraphQL operations initialized'
      )
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to initialize GraphQL', err)
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to initialize GraphQL'
      const error = new Error(errorMessage)
      state.value.error = error
      throw error
    }
  }

  /**
   * Load parameters from PostgreSQL
   */
  async function loadParameters(): Promise<Record<string, AvailableUserParameter>> {
    debug.startState(DebugCategories.STATE, 'Loading parameters')
    state.value.loading = true

    try {
      // Initialize GraphQL if not already done
      if (!graphqlOps) {
        await initGraphQL()
      }

      if (!graphqlOps) {
        throw new Error('GraphQL operations not initialized')
      }

      // Fetch parameters from PostgreSQL
      const parameters = await graphqlOps.fetchParameters()

      // Filter to only user parameters
      const userParameters: Record<string, AvailableUserParameter> = {}
      Object.entries(parameters).forEach(([id, param]) => {
        if (param.kind === 'user') {
          userParameters[id] = param
        }
      })

      // Update store with parameters
      state.value.parameters = userParameters
      state.value.lastUpdated = Date.now()

      debug.log(DebugCategories.STATE, 'Parameters loaded', {
        count: Object.keys(userParameters).length
      })

      return userParameters
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

      // Create parameter
      const newParameter: AvailableUserParameter = {
        ...parameter,
        id,
        kind: 'user',
        visible: true
      }

      // Initialize GraphQL if not already done
      if (!graphqlOps) {
        await initGraphQL()
      }

      if (!graphqlOps) {
        throw new Error('GraphQL operations not initialized')
      }

      // Save to PostgreSQL
      await graphqlOps.createParameter(newParameter)

      // Update local state
      state.value.parameters[id] = newParameter
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

      // Initialize GraphQL if not already done
      if (!graphqlOps) {
        await initGraphQL()
      }

      if (!graphqlOps) {
        throw new Error('GraphQL operations not initialized')
      }

      // Save to PostgreSQL
      await graphqlOps.updateParameter(id, updatedParameter)

      // Update local state
      state.value.parameters[id] = updatedParameter
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

      // Initialize GraphQL if not already done
      if (!graphqlOps) {
        await initGraphQL()
      }

      if (!graphqlOps) {
        throw new Error('GraphQL operations not initialized')
      }

      // Delete from PostgreSQL
      await graphqlOps.deleteParameter(id)

      // Update local state
      delete state.value.parameters[id]
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

  /**
   * Reset store state
   */
  function reset(): void {
    state.value = createInitialState()
    debug.log(DebugCategories.STATE, 'Store reset')
  }

  /**
   * Initialize store
   */
  async function initialize(): Promise<void> {
    debug.startState(DebugCategories.STATE, 'Initializing store')
    try {
      await initGraphQL()
      await loadParameters()
      state.value.initialized = true
      debug.completeState(DebugCategories.STATE, 'Store initialized')
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      debug.error(DebugCategories.ERROR, 'Failed to initialize store:', error)
      state.value.error = error
      throw error
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
    initialize,
    reset
  }
}

// Global store instance
const store = createUserParameterStore()

/**
 * User parameter store composable
 * Provides access to the global user parameter store instance
 */
export function useUserParameterStore() {
  return store
}
