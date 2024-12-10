import { debug, DebugCategories } from '~/composables/core/utils/debug'
import type {
  BIMNodeRaw,
  ProcessedHeader,
  BIMNode
} from '~/composables/core/types/viewer'
import type { Parameter, BimParameter, UserParameter } from '~/composables/core/types'
import { useBIMParameters } from './useBIMParameters'

interface UseParameterMappingOptions {
  onError?: (error: string) => void
}

export class ParameterMappingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ParameterMappingError'
  }
}

/**
 * Map BIM node to core parameters
 */
function mapBIMNodeToParameters(
  node: BIMNodeRaw,
  activeParameters: string[]
): Parameter[] {
  try {
    debug.startState(DebugCategories.PARAMETERS, 'Mapping BIM node to parameters', {
      nodeId: node.id
    })

    const { extractBIMParameter } = useBIMParameters()
    const parameters: Parameter[] = []

    for (const paramName of activeParameters) {
      const parameter = extractBIMParameter(node, paramName)
      if (parameter) {
        parameters.push(parameter)
      }
    }

    debug.completeState(DebugCategories.PARAMETERS, 'BIM node mapped to parameters', {
      parameterCount: parameters.length
    })

    return parameters
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Failed to map BIM node to parameters:', err)
    return []
  }
}

/**
 * Map BIM node to processed header
 */
function mapBIMNodeToHeader(node: BIMNode): ProcessedHeader {
  try {
    debug.startState(DebugCategories.PARAMETERS, 'Mapping BIM node to header', {
      nodeId: node.id
    })

    const header: ProcessedHeader = {
      id: node.id,
      name: node.type || 'Unknown',
      type:
        typeof node.value === 'number'
          ? 'number'
          : typeof node.value === 'boolean'
          ? 'boolean'
          : 'string',
      value: node.value
    }

    debug.completeState(DebugCategories.PARAMETERS, 'BIM node mapped to header')
    return header
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Failed to map BIM node to header:', err)
    throw new ParameterMappingError(
      `Failed to map BIM node ${node.id} to header: ${
        err instanceof Error ? err.message : 'Unknown error'
      }`
    )
  }
}

/**
 * Convert BIM parameter to user parameter
 */
function convertBIMToUserParameter(bimParam: BimParameter): UserParameter {
  try {
    debug.startState(DebugCategories.PARAMETERS, 'Converting BIM to user parameter', {
      parameterId: bimParam.id
    })

    const userParam: UserParameter = {
      kind: 'user',
      id: `user_${bimParam.id}`,
      name: bimParam.name,
      field: bimParam.field,
      header: bimParam.header,
      type: 'fixed',
      value: bimParam.value,
      visible: bimParam.visible,
      removable: true,
      group: bimParam.currentGroup,
      category: 'Converted BIM Parameters',
      metadata: {
        ...bimParam.metadata,
        originalBimParameter: bimParam.id
      }
    }

    debug.completeState(
      DebugCategories.PARAMETERS,
      'BIM parameter converted to user parameter'
    )
    return userParam
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Failed to convert BIM to user parameter:', err)
    throw new ParameterMappingError(
      `Failed to convert BIM parameter ${bimParam.id} to user parameter: ${
        err instanceof Error ? err.message : 'Unknown error'
      }`
    )
  }
}

/**
 * Hook for parameter mapping functionality
 */
export function useParameterMapping(options: UseParameterMappingOptions = {}) {
  const { onError } = options

  const handleError = (err: unknown) => {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (onError) onError(message)
    throw new ParameterMappingError(message)
  }

  return {
    mapBIMNodeToParameters,
    mapBIMNodeToHeader,
    convertBIMToUserParameter,
    handleError
  }
}
