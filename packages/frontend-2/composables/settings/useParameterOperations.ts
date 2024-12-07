import { v4 as uuidv4 } from 'uuid'
import { debug, DebugCategories } from '~/components/viewer/schedules/debug/useDebug'
import { useParametersState } from '../parameters/useParametersState'
import type {
  CustomParameter,
  UnifiedParameter,
  ParameterType
} from '~/composables/core/types'

interface UseParameterOperationsOptions {
  onError?: (error: string) => void
  onUpdate?: () => void
}

class ParameterOperationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ParameterOperationError'
  }
}

export function useParameterOperations(options: UseParameterOperationsOptions) {
  const { onError, onUpdate } = options
  const {
    parameters,
    createParameter: createParameterState,
    updateParameter: updateParameterState,
    deleteParameter: deleteParameterState
  } = useParametersState()

  const handleError = (err: unknown) => {
    const message = err instanceof Error ? err.message : 'An unknown error occurred'
    if (onError) onError(message)
    return new ParameterOperationError(message)
  }

  async function createParameter(
    parameter: Omit<CustomParameter, 'id'>
  ): Promise<CustomParameter> {
    try {
      debug.startState(DebugCategories.PARAMETERS, 'Creating new parameter')

      // Validate parameter data
      if (!parameter.name || !parameter.type) {
        throw new ParameterOperationError('Parameter name and type are required')
      }

      // Generate UUID at the start
      const parameterId = `param_${uuidv4()}`

      // Prepare parameter data for creation
      const parameterData = {
        id: parameterId, // Include ID here
        name: parameter.name,
        type: parameter.type as ParameterType,
        value: parameter.type === 'fixed' ? parameter.value : undefined,
        equation: parameter.type === 'equation' ? parameter.equation : undefined,
        field: parameter.name,
        header: parameter.name,
        category: 'Custom Parameters',
        description: parameter.description,
        removable: true,
        visible: true,
        order: 0,
        source: parameter.source,
        isFetched: false,
        currentGroup: parameter.group || 'Custom',
        computed:
          parameter.type === 'equation'
            ? {
                value: parameter.value,
                isValid: true
              }
            : undefined
      }

      debug.log(DebugCategories.PARAMETERS, 'Creating parameter', parameterData)

      const createdParameter = await createParameterState(parameterData)

      if (onUpdate) onUpdate()

      return createdParameter
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to create parameter:', err)
      throw handleError(err)
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
        throw new ParameterOperationError('Parameter not found')
      }

      // No need for key generation here since we keep the original parameterId
      // Just check for name conflicts if name is being updated
      if (updates.name || updates.group) {
        const nameConflictExists = Object.values(currentParams).some(
          (param) =>
            param.id !== parameterId && // Skip current parameter
            param.name === (updates.name || existingParameter.name) && // Check name
            param.group === (updates.group || existingParameter.group) // Check group
        )

        if (nameConflictExists) {
          throw new ParameterOperationError(
            'A parameter with this name already exists in this group'
          )
        }
      }

      // Prepare update data
      const updateData: Partial<
        Omit<UnifiedParameter, 'id' | 'createdAt' | 'updatedAt'>
      > = {
        ...updates,
        field: updates.name,
        header: updates.name,
        currentGroup: updates.group,
        computed:
          updates.type === 'equation'
            ? {
                value: updates.value,
                isValid: true
              }
            : undefined
      }

      debug.log(DebugCategories.PARAMETERS, 'Updating parameter', {
        parameterId,
        updates: updateData
      })

      const updatedParameter = await updateParameterState(parameterId, updateData)

      if (onUpdate) onUpdate()

      debug.completeState(DebugCategories.PARAMETERS, 'Parameter updated successfully')
      return updatedParameter
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to update parameter:', err)
      throw handleError(err)
    }
  }

  async function deleteParameter(parameterId: string): Promise<void> {
    try {
      debug.startState(DebugCategories.PARAMETERS, 'Deleting parameter', {
        parameterId
      })

      const currentParams = parameters.value || {}

      if (!currentParams[parameterId]) {
        throw new ParameterOperationError('Parameter not found')
      }

      await deleteParameterState(parameterId)

      if (onUpdate) onUpdate()

      debug.completeState(DebugCategories.PARAMETERS, 'Parameter deleted successfully')
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to delete parameter:', err)
      throw handleError(err)
    }
  }

  return {
    createParameter,
    updateParameter,
    deleteParameter
  }
}
