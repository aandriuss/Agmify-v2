import { ref, computed } from 'vue'
import { debug, DebugCategories } from '../../utils/debug'
import type { UserParameter } from '../../types'
import {
  createUserParameter,
  isUserParameter
} from '../../types/parameters/parameter-types'

export interface TableParametersState {
  parameters: UserParameter[]
  selectedParameterIds: string[]
}

export interface TableParametersOptions {
  initialState?: Partial<TableParametersState>
  onUpdate?: (state: TableParametersState) => Promise<void>
  onError?: (error: Error) => void
}

const defaultState: TableParametersState = {
  parameters: [],
  selectedParameterIds: []
}

/**
 * Core table parameters composable
 * Handles parameter management for tables
 */
export function useTableParameters(options: TableParametersOptions = {}) {
  const { initialState, onUpdate, onError } = options

  // Initialize state
  const internalState = ref<TableParametersState>({
    ...defaultState,
    ...initialState
  })

  // Computed properties
  const parameters = computed(() => internalState.value.parameters)
  const selectedParameterIds = computed(() => internalState.value.selectedParameterIds)

  /**
   * Helper function to safely get parameter ID
   */
  function getParameterId(param: unknown): string | null {
    if (
      param &&
      typeof param === 'object' &&
      'id' in param &&
      typeof param.id === 'string'
    ) {
      return param.id
    }
    return null
  }

  /**
   * Update parameters with new values
   */
  async function updateParameters(newParameters: UserParameter[]) {
    try {
      debug.startState(DebugCategories.PARAMETERS, 'Updating parameters', {
        count: newParameters.length
      })

      // Get existing parameters to preserve their types and values
      const existingParamMap = new Map(
        internalState.value.parameters
          .map((param) => {
            const id = getParameterId(param)
            return id ? [id, param] : null
          })
          .filter((entry): entry is [string, UserParameter] => entry !== null)
      )

      // Convert parameter IDs to UserParameter objects
      const updatedParameters = newParameters.map((param): UserParameter => {
        const id = getParameterId(param)
        if (!id) throw new Error('Invalid parameter: missing ID')

        const existing = existingParamMap.get(id)

        // If parameter exists and is valid, preserve it
        if (existing && isUserParameter(existing)) {
          return existing
        }

        // Create new parameter with default values
        return createUserParameter({
          id,
          name: param.name || id,
          field: param.field || id,
          type: 'fixed',
          group: 'Custom',
          visible: true,
          header: param.header || id,
          removable: true,
          value: null
        })
      })

      internalState.value.parameters = updatedParameters

      if (onUpdate) {
        await onUpdate(internalState.value)
      }

      debug.completeState(DebugCategories.PARAMETERS, 'Parameters updated')
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error('Failed to update parameters')
      debug.error(DebugCategories.ERROR, 'Error updating parameters:', error)
      onError?.(error)
      throw error
    }
  }

  /**
   * Update parameter visibility
   */
  async function updateParameterVisibility(parameterId: string, visible: boolean) {
    try {
      debug.startState(DebugCategories.PARAMETERS, 'Updating parameter visibility', {
        parameterId,
        visible
      })

      const parameter = internalState.value.parameters.find((p) => p.id === parameterId)
      if (parameter) {
        parameter.visible = visible

        if (onUpdate) {
          await onUpdate(internalState.value)
        }
      }

      debug.completeState(DebugCategories.PARAMETERS, 'Parameter visibility updated')
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error('Failed to update parameter visibility')
      debug.error(DebugCategories.ERROR, 'Error updating parameter visibility:', error)
      onError?.(error)
      throw error
    }
  }

  /**
   * Update parameter order
   */
  async function updateParameterOrder(parameterId: string, newIndex: number) {
    try {
      debug.startState(DebugCategories.PARAMETERS, 'Updating parameter order', {
        parameterId,
        newIndex
      })

      const parameters = [...internalState.value.parameters]
      const oldIndex = parameters.findIndex((p) => p.id === parameterId)
      if (oldIndex !== -1) {
        const [param] = parameters.splice(oldIndex, 1)
        parameters.splice(newIndex, 0, param)
        internalState.value.parameters = parameters

        if (onUpdate) {
          await onUpdate(internalState.value)
        }
      }

      debug.completeState(DebugCategories.PARAMETERS, 'Parameter order updated')
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error('Failed to update parameter order')
      debug.error(DebugCategories.ERROR, 'Error updating parameter order:', error)
      onError?.(error)
      throw error
    }
  }

  /**
   * Reset parameters to initial state
   */
  async function reset() {
    try {
      debug.startState(DebugCategories.PARAMETERS, 'Resetting parameters')

      internalState.value = { ...defaultState }

      if (onUpdate) {
        await onUpdate(internalState.value)
      }

      debug.completeState(DebugCategories.PARAMETERS, 'Parameters reset')
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to reset parameters')
      debug.error(DebugCategories.ERROR, 'Error resetting parameters:', error)
      onError?.(error)
      throw error
    }
  }

  return {
    // State
    parameters,
    selectedParameterIds,

    // Methods
    updateParameters,
    updateParameterVisibility,
    updateParameterOrder,
    reset
  }
}
