/**
 * Core value types for the parameter system
 */

/**
 * Primitive value types that parameters can hold
 */
export type PrimitiveValue = string | number | boolean | null

/**
 * Value types from BIM models
 */
export type BimValueType = 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array'

/**
 * Value types for user parameters
 */
export type UserValueType = 'fixed' | 'equation'

/**
 * Equation value with references
 */
export interface EquationValue {
  kind: 'equation'
  expression: string
  references: string[] // Parameter IDs referenced in the equation
  resultType: BimValueType
  computed?: unknown
}

/**
 * Combined parameter value type
 */
export type ParameterValue = PrimitiveValue | EquationValue

/**
 * Validation rules for parameters
 */
export interface ValidationRules {
  required?: boolean
  min?: number
  max?: number
  pattern?: string
  custom?: (value: unknown) => ValidationResult
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean
  error?: string
}

/**
 * Type guards
 */
export function isEquationValue(value: unknown): value is EquationValue {
  return (
    typeof value === 'object' &&
    value !== null &&
    'kind' in value &&
    value.kind === 'equation' &&
    'expression' in value &&
    'references' in value &&
    'resultType' in value &&
    Array.isArray((value as EquationValue).references)
  )
}

export function isPrimitiveValue(value: unknown): value is PrimitiveValue {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  )
}

/**
 * Convert BIM value type to user value type
 */
export function convertBimToUserType(type: BimValueType): UserValueType {
  return type === 'number' ? 'equation' : 'fixed'
}
