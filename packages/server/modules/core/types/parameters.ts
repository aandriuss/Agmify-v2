/**
 * Value types
 */
export type PrimitiveValue = string | number | boolean | null

export type BimValueType = 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array'
export type UserValueType = 'fixed' | 'equation'

export interface EquationValue {
  expression: string
  references: string[]
  resultType: BimValueType
}

export type ParameterValue = PrimitiveValue | EquationValue

/**
 * Base parameter interface
 */
interface BaseParameter {
  id: string
  name: string
  field: string
  visible: boolean
  header: string
  description?: string
  category?: string
  order?: number
  computed?: unknown
  source?: string
  removable: boolean
  metadata?: Record<string, unknown>
}

/**
 * BIM parameter type
 */
export interface BimParameter extends BaseParameter {
  kind: 'bim'
  type: BimValueType
  sourceValue: PrimitiveValue
  value: PrimitiveValue
  fetchedGroup: string
  currentGroup: string
}

/**
 * User parameter type
 */
export interface UserParameter extends BaseParameter {
  kind: 'user'
  type: UserValueType
  value: ParameterValue
  group: string
  equation?: string
  isCustom?: boolean
  validationRules?: ValidationRules
}

/**
 * Union type for all parameters
 */
export type Parameter = BimParameter | UserParameter

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

export interface ValidationResult {
  isValid: boolean
  error?: string
}

/**
 * Type guards
 */
export function isBimParameter(param: Parameter): param is BimParameter {
  return param.kind === 'bim'
}

export function isUserParameter(param: Parameter): param is UserParameter {
  return param.kind === 'user'
}

/**
 * Storage types
 */
export interface ParameterStorage {
  [key: string]: Parameter
}

export interface TableParameterMapping {
  [tableId: string]: string[] // Array of parameter IDs
}
