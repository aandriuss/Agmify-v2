import type { ProcessedHeader } from '~/composables/core/types/viewer/viewer-base'
import type {
  Parameter,
  BimParameter,
  UserParameter,
  ParameterValue,
  BimValueType,
  UserValueType,
  ValidationRules
} from '~/composables/core/types'
import { createBimParameter, createUserParameter } from '~/composables/core/types'
import { debug, DebugCategories } from '../debug'

/**
 * Type guard for ValidationRules
 */
function isValidationRules(value: unknown): value is ValidationRules {
  if (!value || typeof value !== 'object') return false
  const rules = value as ValidationRules
  return (
    (typeof rules.required === 'undefined' || typeof rules.required === 'boolean') &&
    (typeof rules.min === 'undefined' || typeof rules.min === 'number') &&
    (typeof rules.max === 'undefined' || typeof rules.max === 'number') &&
    (typeof rules.pattern === 'undefined' || typeof rules.pattern === 'string') &&
    (typeof rules.custom === 'undefined' || typeof rules.custom === 'function')
  )
}

/**
 * Type guard for equation string
 */
function isEquationString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

/**
 * Convert a ProcessedHeader to a Parameter
 */
export function processedHeaderToParameter(header: ProcessedHeader): Parameter {
  try {
    debug.startState(DebugCategories.DATA_TRANSFORM, 'Converting header to parameter', {
      id: header.id,
      type: header.type
    })

    // Common properties
    const baseProps = {
      id: header.id,
      name: header.name,
      field: header.field,
      header: header.header,
      visible: header.visible,
      removable: header.removable,
      order: header.order,
      category: header.category,
      description: header.description,
      value: header.value as ParameterValue
    }

    // Convert to BIM parameter if it has BIM-specific properties
    if (
      'sourceValue' in header &&
      'fetchedGroup' in header &&
      'currentGroup' in header
    ) {
      const bimParam = createBimParameter({
        ...baseProps,
        type: header.type as BimValueType,
        sourceValue: header.sourceValue as string,
        fetchedGroup: header.fetchedGroup,
        currentGroup: header.currentGroup,
        source: header.source
      })

      debug.completeState(DebugCategories.DATA_TRANSFORM, 'Created BIM parameter', {
        id: bimParam.id,
        type: bimParam.type
      })

      return bimParam
    }

    // Otherwise, convert to user parameter
    const userParam = createUserParameter({
      ...baseProps,
      type: header.type as UserValueType,
      group: header.currentGroup,
      isCustom: header.isCustom,
      equation: isEquationString(header.equation) ? header.equation : undefined,
      validationRules: isValidationRules(header.validationRules)
        ? header.validationRules
        : undefined
    })

    debug.completeState(DebugCategories.DATA_TRANSFORM, 'Created user parameter', {
      id: userParam.id,
      type: userParam.type
    })

    return userParam
  } catch (err) {
    debug.error(
      DebugCategories.DATA_TRANSFORM,
      'Failed to convert header to parameter:',
      err
    )
    throw err
  }
}

/**
 * Convert a Parameter to a ProcessedHeader
 */
export function parameterToProcessedHeader(param: Parameter): ProcessedHeader {
  try {
    debug.startState(DebugCategories.DATA_TRANSFORM, 'Converting parameter to header', {
      id: param.id,
      type: param.type
    })

    // Common properties
    const baseHeader: ProcessedHeader = {
      id: param.id,
      name: param.name,
      field: param.field,
      header: param.header,
      visible: param.visible,
      removable: param.removable,
      order: param.order,
      category: param.category,
      description: param.description,
      type: param.type,
      value: param.value,
      source: param.source || 'Parameters',
      fetchedGroup: 'Default',
      currentGroup: 'Default',
      isFetched: true
    }

    // Add BIM-specific properties
    if ('sourceValue' in param) {
      const bimParam = param as BimParameter
      const header = {
        ...baseHeader,
        sourceValue: bimParam.sourceValue,
        fetchedGroup: bimParam.fetchedGroup,
        currentGroup: bimParam.currentGroup,
        source: bimParam.source || 'BIM'
      }

      debug.completeState(DebugCategories.DATA_TRANSFORM, 'Created BIM header', {
        id: header.id,
        type: header.type
      })

      return header
    }

    // Add user-specific properties
    if ('group' in param) {
      const userParam = param as UserParameter
      const header = {
        ...baseHeader,
        currentGroup: userParam.group,
        isCustom: userParam.isCustom,
        equation: userParam.equation,
        validationRules: userParam.validationRules
      }

      debug.completeState(DebugCategories.DATA_TRANSFORM, 'Created user header', {
        id: header.id,
        type: header.type
      })

      return header
    }

    debug.completeState(DebugCategories.DATA_TRANSFORM, 'Created base header', {
      id: baseHeader.id,
      type: baseHeader.type
    })

    return baseHeader
  } catch (err) {
    debug.error(
      DebugCategories.DATA_TRANSFORM,
      'Failed to convert parameter to header:',
      err
    )
    throw err
  }
}

/**
 * Convert an array of ProcessedHeaders to Parameters
 */
export function processedHeadersToParameters(headers: ProcessedHeader[]): Parameter[] {
  return headers.map(processedHeaderToParameter)
}

/**
 * Convert an array of Parameters to ProcessedHeaders
 */
export function parametersToProcessedHeaders(params: Parameter[]): ProcessedHeader[] {
  return params.map(parameterToProcessedHeader)
}
