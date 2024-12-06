import { debug, DebugCategories } from '~/components/viewer/schedules/debug/useDebug'
import { useParametersState } from '../parameters/useParametersState'
import type { CustomParameter } from '~/composables/core/types'

interface UseParameterOperationsOptions {
  onError?: (error: string) => void
  onUpdate?: () => void
}

export function useParameterOperations(options: UseParameterOperationsOptions) {
  const { onError, onUpdate } = options
  const { parameters, saveParameters } = useParametersState()

  const handleError = (err: unknown) => {
    const message = err instanceof Error ? err.message : 'An unknown error occurred'
    if (onError) onError(message)
  }

  async function createParameter(
    parameter: Omit<CustomParameter, 'id'>
  ): Promise<CustomParameter> {
    try {
      debug.startState(DebugCategories.PARAMETERS, 'Creating new parameter')

      // Validate parameter data
      if (!parameter.name || !parameter.type) {
        throw new Error('Parameter name and type are required')
      }

      const newId = `param-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const newParameter: CustomParameter = {
        ...parameter,
        id: newId,
        field: parameter.name,
        header: parameter.name,
        visible: true,
        removable: true,
        order: 0,
        category: 'Custom Parameters'
      }

      // Get current parameters and merge with new one
      const currentParams = parameters.value || {}
      const updatedParameters = {
        ...currentParams,
        [newId]: newParameter
      }

      debug.log(DebugCategories.PARAMETERS, 'Saving parameter', {
        parameterId: newId,
        totalParameters: Object.keys(updatedParameters).length
      })

      await saveParameters(updatedParameters)

      if (onUpdate) onUpdate()

      debug.completeState(DebugCategories.PARAMETERS, 'Parameter created successfully')
      return newParameter
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to create parameter:', err)
      handleError(err)
      throw err
    }
  }

  async function updateParameter(
    parameterId: string,
    updates: Partial<CustomParameter>
  ): Promise<CustomParameter> {
    try {
      debug.startState(DebugCategories.PARAMETERS, 'Updating parameter', {
        parameterId
      })

      const currentParams = parameters.value || {}
      const existingParameter = currentParams[parameterId]

      if (!existingParameter) {
        throw new Error('Parameter not found')
      }

      const updatedParameter = {
        ...existingParameter,
        ...updates,
        id: parameterId // Ensure ID doesn't get overwritten
      }

      const updatedParameters = {
        ...currentParams,
        [parameterId]: updatedParameter
      }

      debug.log(DebugCategories.PARAMETERS, 'Saving updated parameter', {
        parameterId,
        updates: Object.keys(updates)
      })

      await saveParameters(updatedParameters)

      if (onUpdate) onUpdate()

      debug.completeState(DebugCategories.PARAMETERS, 'Parameter updated successfully')
      return updatedParameter
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to update parameter:', err)
      handleError(err)
      throw err
    }
  }

  async function deleteParameter(parameterId: string): Promise<void> {
    try {
      debug.startState(DebugCategories.PARAMETERS, 'Deleting parameter', {
        parameterId
      })

      const currentParams = parameters.value || {}

      if (!currentParams[parameterId]) {
        throw new Error('Parameter not found')
      }

      // Create new object without the deleted parameter
      const { [parameterId]: deleted, ...remainingParameters } = currentParams

      debug.log(DebugCategories.PARAMETERS, 'Deleting parameter', {
        parameterId,
        remainingCount: Object.keys(remainingParameters).length
      })

      await saveParameters(remainingParameters)

      if (onUpdate) onUpdate()

      debug.completeState(DebugCategories.PARAMETERS, 'Parameter deleted successfully')
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to delete parameter:', err)
      handleError(err)
      throw err
    }
  }

  return {
    createParameter,
    updateParameter,
    deleteParameter
  }
}
