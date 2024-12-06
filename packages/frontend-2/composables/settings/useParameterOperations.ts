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

  function generateParameterKey(parameter: Omit<CustomParameter, 'id'>): string {
    // Create a stable key based on name and group
    const group = parameter.group || 'default'
    const sanitizedName = parameter.name.toLowerCase().replace(/[^a-z0-9]/g, '_')
    const sanitizedGroup = group.toLowerCase().replace(/[^a-z0-9]/g, '_')
    return `${sanitizedGroup}-${sanitizedName}`
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

      // Generate a stable key for the parameter
      const parameterKey = generateParameterKey(parameter)

      // Get current parameters
      const currentParams = parameters.value || {}

      // Check if parameter with this key already exists
      if (currentParams[parameterKey]) {
        throw new Error('A parameter with this name already exists in this group')
      }

      const newParameter: CustomParameter = {
        ...parameter,
        id: parameterKey,
        field: parameter.name,
        header: parameter.name,
        visible: true,
        removable: true,
        order: 0,
        category: 'Custom Parameters'
      }

      // Merge with current parameters
      const updatedParameters = {
        ...currentParams,
        [parameterKey]: newParameter
      }

      debug.log(DebugCategories.PARAMETERS, 'Saving parameter', {
        parameterId: parameterKey,
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

      // If name or group is being updated, we need to generate a new key
      if (updates.name || updates.group) {
        const newKey = generateParameterKey({
          ...existingParameter,
          ...updates
        })

        // Check if new key would conflict with existing parameter (except self)
        if (newKey !== parameterId && currentParams[newKey]) {
          throw new Error('A parameter with this name already exists in this group')
        }

        // Create updated parameter with new key
        const updatedParameter = {
          ...existingParameter,
          ...updates,
          id: newKey
        }

        // Remove old key and add new key
        const { [parameterId]: _, ...remainingParams } = currentParams
        const updatedParameters = {
          ...remainingParams,
          [newKey]: updatedParameter
        }

        await saveParameters(updatedParameters)

        if (onUpdate) onUpdate()

        debug.completeState(
          DebugCategories.PARAMETERS,
          'Parameter updated successfully'
        )
        return updatedParameter
      }

      // If not changing name/group, just update the existing parameter
      const updatedParameter = {
        ...existingParameter,
        ...updates,
        id: parameterId
      }

      const updatedParameters = {
        ...currentParams,
        [parameterId]: updatedParameter
      }

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
