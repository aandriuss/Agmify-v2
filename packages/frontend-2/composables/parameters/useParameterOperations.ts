import { v4 as uuidv4 } from 'uuid'
import { debug, DebugCategories } from '~/components/viewer/schedules/debug/useDebug'
import { useParametersState } from './useParametersState'
import type {
  UserParameter,
  UserValueType,
  ParameterValue
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

interface CreateParameterInput {
  name: string
  type: UserValueType
  value?: ParameterValue
  equation?: string
  group?: string
  description?: string
  source?: string
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

  async function createParameter(input: CreateParameterInput): Promise<UserParameter> {
    try {
      debug.startState(DebugCategories.PARAMETERS, 'Creating new parameter')

      // Validate parameter data
      if (!input.name || !input.type) {
        throw new ParameterOperationError('Parameter name and type are required')
      }

      // Generate UUID at the start
      const parameterId = `param_${uuidv4()}`

      // Prepare parameter data for creation
      const parameterData: UserParameter = {
        kind: 'user',
        id: parameterId,
        name: input.name,
        type: input.type,
        value: input.type === 'fixed' ? input.value || null : null,
        equation: input.type === 'equation' ? input.equation : undefined,
        field: input.name,
        header: input.name,
        category: 'Custom Parameters',
        description: input.description,
        removable: true,
        visible: true,
        order: 0,
        source: input.source,
        group: input.group || 'Custom',
        metadata: {},
        isCustom: true
      }

      debug.log(DebugCategories.PARAMETERS, 'Creating parameter', parameterData)

      const createdParameter = await createParameterState(parameterData)

      if (onUpdate) onUpdate()

      return createdParameter as UserParameter
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to create parameter:', err)
      throw handleError(err)
    }
  }

  async function updateParameter(
    parameterId: string,
    updates: Partial<Omit<UserParameter, 'id' | 'kind'>>
  ): Promise<UserParameter> {
    try {
      debug.startState(DebugCategories.PARAMETERS, 'Updating parameter', {
        parameterId
      })

      const currentParams = parameters.value || {}
      const existingParameter = currentParams[parameterId]

      if (!existingParameter || existingParameter.kind !== 'user') {
        throw new ParameterOperationError('User parameter not found')
      }

      // Check for name conflicts if name is being updated
      if (updates.name || updates.group) {
        const nameConflictExists = Object.values(currentParams).some(
          (param) =>
            param.id !== parameterId && // Skip current parameter
            param.kind === 'user' && // Only check user parameters
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
      const updateData: Partial<Omit<UserParameter, 'id' | 'kind'>> = {
        ...updates,
        field: updates.name || existingParameter.field,
        header: updates.name || existingParameter.header
      }

      debug.log(DebugCategories.PARAMETERS, 'Updating parameter', {
        parameterId,
        updates: updateData
      })

      const updatedParameter = await updateParameterState(parameterId, updateData)

      if (onUpdate) onUpdate()

      debug.completeState(DebugCategories.PARAMETERS, 'Parameter updated successfully')
      return updatedParameter as UserParameter
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
      const parameter = currentParams[parameterId]

      if (!parameter || parameter.kind !== 'user') {
        throw new ParameterOperationError('User parameter not found')
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
