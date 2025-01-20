import type {
  ParameterValue,
  PrimitiveValue,
  BimValueType
} from '~/composables/core/types/parameters'
import type {
  AvailableParameter,
  AvailableBimParameter,
  AvailableUserParameter
} from '~/composables/core/types/parameters/parameter-states'

// This file has been refactored to focus on store-specific utilities.
// Parameter processing has been moved to:
// - parameter-processing.ts for value transformation and validation
// - useElementsData for parameter extraction and processing

/**
 * Type guard for primitive values
 */
export function isPrimitiveValue(value: unknown): value is PrimitiveValue {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  )
}

/**
 * Type guard for equation values
 */
export function isEquationValue(value: unknown): value is {
  kind: 'equation'
  expression: string
  references: string[]
  resultType: BimValueType
  computed?: unknown
} {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('kind' in value) ||
    value.kind !== 'equation'
  ) {
    return false
  }

  const equation = value as Partial<{
    kind: 'equation'
    expression: string
    references: string[]
    resultType: BimValueType
  }>
  return (
    typeof equation.expression === 'string' &&
    Array.isArray(equation.references) &&
    equation.references.every((ref) => typeof ref === 'string') &&
    typeof equation.resultType === 'string'
  )
}

/**
 * Type guard for BIM parameters
 */
function isBimParameter(param: AvailableParameter): param is AvailableBimParameter {
  return param.kind === 'bim'
}

/**
 * Type guard for user parameters
 */
function isUserParameter(param: AvailableParameter): param is AvailableUserParameter {
  return param.kind === 'user'
}

/**
 * Parameter value validation with detailed type checking
 */
export function validateParameterValue(value: unknown): value is ParameterValue {
  // Handle null/undefined
  if (value === null || value === undefined) return true

  // Handle primitive values with type coercion
  if (typeof value === 'string') {
    // Try to convert numeric strings
    const num = Number(value)
    if (!isNaN(num)) return true
    // Keep non-empty strings
    return value.trim().length > 0
  }
  if (typeof value === 'number') return !isNaN(value)
  if (typeof value === 'boolean') return true

  // Handle equation values
  if (isEquationValue(value)) return true

  // Handle objects
  if (typeof value === 'object') {
    // Arrays should be converted to strings
    if (Array.isArray(value)) {
      return value.length > 0
    }
    // Objects should have at least one property
    if (value !== null && Object.keys(value).length > 0) {
      return true
    }
  }

  return false
}

/**
 * Convert value to parameter value with type safety
 */
export function convertToParameterValue(value: unknown): ParameterValue {
  // Handle null/undefined
  if (value === null || value === undefined) return null

  // Handle primitive values
  if (typeof value === 'string') {
    const num = Number(value)
    if (!isNaN(num)) return num
    return value.trim() || null
  }
  if (typeof value === 'number') return isNaN(value) ? null : value
  if (typeof value === 'boolean') return value

  // Handle equation values
  if (isEquationValue(value)) return value

  // Handle objects
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return value.length > 0 ? JSON.stringify(value) : null
    }
    if (value !== null && Object.keys(value).length > 0) {
      return JSON.stringify(value)
    }
  }

  return null
}

/**
 * Parameter group extraction with validation
 */
export function extractParameterGroup(param: AvailableParameter): string {
  if (isBimParameter(param)) {
    // Use currentGroup if available, fallback to fetchedGroup
    return param.group.currentGroup || param.group.fetchedGroup || 'Parameters'
  }
  if (isUserParameter(param)) {
    // Use group if available, fallback to default
    return param.group.fetchedGroup || 'Parameters'
  }
  return 'Parameters'
}

/**
 * Validate parameter metadata
 */
export function validateParameterMetadata(param: AvailableParameter): boolean {
  // Check required fields
  if (!param.id || !param.name || !param.type) {
    return false
  }

  // Validate value
  if (!validateParameterValue(param.value)) {
    return false
  }

  // Check group
  const group = extractParameterGroup(param)
  if (!group) {
    return false
  }

  return true
}

/**
 * Parameter value comparison with type safety
 */
export function areParameterValuesEqual(a: ParameterValue, b: ParameterValue): boolean {
  // Handle primitive values
  if (isPrimitiveValue(a) && isPrimitiveValue(b)) {
    return a === b
  }

  // Handle equation values
  if (isEquationValue(a) && isEquationValue(b)) {
    return (
      a.expression === b.expression &&
      a.resultType === b.resultType &&
      a.references.length === b.references.length &&
      a.references.every((ref, i) => ref === b.references[i])
    )
  }

  return false
}

export const parameterUtils = {
  isPrimitiveValue,
  isEquationValue,
  validateParameterValue,
  extractParameterGroup,
  areParameterValuesEqual,
  isBimParameter,
  isUserParameter
}
