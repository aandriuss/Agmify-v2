import { v4 as uuidv4 } from 'uuid'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import { useParametersState } from './useParametersState'
import type {
  UserParameter,
  UserValueType,
  ParameterValue,
  Parameter
} from '~/composables/core/types'

interface UseParameterOperationsOptions {
  onError?: (error: string) => void
  onUpdate?: () => void
}

export class ParameterOperationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ParameterOperationError'
  }
}

export interface CreateParameterInput {
  name: string
  type: UserValueType
  value?: ParameterValue
  equation?: string
  group?: string
  description?: string
  source?: string
}

/**
 * Core parameter operations hook
 * Handles parameter CRUD operations with validation and error handling
 */
export function useParameterOperations(options: UseParameterOperationsOptions = {}) {
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
    throw new ParameterOperationError(message)
  }

  function createParameter(input: CreateParameterInput): UserParameter {
    try {
      debug.startState(DebugCategories.PARAMETERS, 'Creating new parameter')

      // Validate parameter data
      if (!input.name || !input.type) {
        throw new ParameterOperationError('Parameter name and type are required')
      }

      // Generate UUID
      const parameterId = `param_${uuidv4()}`

      // Prepare parameter data
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

      const createdParameter = createParameterState(parameterData)
      if (onUpdate) onUpdate()

      return createdParameter
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to create parameter:', err)
      throw handleError(err)
    }
  }

  function updateParameter(
    parameterId: string,
    updates: Partial<Omit<UserParameter, 'id' | 'kind'>>
  ): UserParameter {
    try {
      debug.startState(DebugCategories.PARAMETERS, 'Updating parameter', {
        parameterId
      })

      const currentParams = parameters.value
      const existingParameter = currentParams[parameterId] as Parameter | undefined

      if (!existingParameter || existingParameter.kind !== 'user') {
        throw new ParameterOperationError('User parameter not found')
      }

      // Check for name conflicts
      if (updates.name || updates.group) {
        const nameConflictExists = Object.values(currentParams).some(
          (param): param is UserParameter =>
            param.kind === 'user' &&
            param.id !== parameterId &&
            param.name === (updates.name || existingParameter.name) &&
            param.group === (updates.group || existingParameter.group)
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

      const updatedParameter = updateParameterState(parameterId, updateData)
      if (onUpdate) onUpdate()

      return updatedParameter
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to update parameter:', err)
      throw handleError(err)
    }
  }

  function deleteParameter(parameterId: string): void {
    try {
      debug.startState(DebugCategories.PARAMETERS, 'Deleting parameter', {
        parameterId
      })

      const currentParams = parameters.value
      const parameter = currentParams[parameterId] as Parameter | undefined

      if (!parameter || parameter.kind !== 'user') {
        throw new ParameterOperationError('User parameter not found')
      }

      deleteParameterState(parameterId)
      if (onUpdate) onUpdate()
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
