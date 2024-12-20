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
// See composables/core/parameters/next/MIGRATION.md for details

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
 * Parameter value validation
 */
export function validateParameterValue(value: unknown): value is ParameterValue {
  if (isPrimitiveValue(value)) return true
  if (isEquationValue(value)) return true
  return false
}

/**
 * Parameter group extraction
 */
export function extractParameterGroup(param: AvailableParameter): string {
  if (isBimParameter(param)) {
    return param.currentGroup
  }
  if (isUserParameter(param)) {
    return param.group
  }
  return 'Parameters'
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
