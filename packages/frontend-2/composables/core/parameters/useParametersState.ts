import { ref } from 'vue'
import type { Ref } from 'vue'
import type { Parameter, UserParameter } from '~/composables/core/types'

interface ParametersStateReturn {
  parameters: Ref<Record<string, Parameter>>
  createParameter: (parameter: UserParameter) => UserParameter
  updateParameter: (
    id: string,
    updates: Partial<Omit<UserParameter, 'id' | 'kind'>>
  ) => UserParameter
  deleteParameter: (id: string) => void
}

/**
 * Core parameter state management
 * Handles the global state of parameters and their mutations
 */
export function useParametersState(): ParametersStateReturn {
  const parameters = ref<Record<string, Parameter>>({})

  function createParameter(parameter: UserParameter): UserParameter {
    parameters.value = {
      ...parameters.value,
      [parameter.id]: parameter
    }
    return parameter
  }

  function updateParameter(
    id: string,
    updates: Partial<Omit<UserParameter, 'id' | 'kind'>>
  ): UserParameter {
    const currentParameter = parameters.value[id]
    if (!currentParameter || currentParameter.kind !== 'user') {
      throw new Error('Parameter not found or not a user parameter')
    }

    const updatedParameter: UserParameter = {
      ...currentParameter,
      ...updates
    }

    parameters.value = {
      ...parameters.value,
      [id]: updatedParameter
    }

    return updatedParameter
  }

  function deleteParameter(id: string): void {
    const { [id]: removed, ...rest } = parameters.value
    if (!removed) {
      throw new Error('Parameter not found')
    }
    parameters.value = rest
  }

  return {
    parameters,
    createParameter,
    updateParameter,
    deleteParameter
  }
}
