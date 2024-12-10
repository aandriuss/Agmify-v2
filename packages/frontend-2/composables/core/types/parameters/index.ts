/**
 * Re-export value types
 */
export type {
  PrimitiveValue,
  BimValueType,
  UserValueType,
  ParameterValue,
  EquationValue,
  ValidationRules,
  ValidationResult
} from './value-types'

// Export BimValueType as ParameterValueType for backward compatibility
export type { BimValueType as ParameterValueType } from './value-types'

/**
 * Re-export parameter types
 */
export type {
  BaseParameter,
  BimParameter,
  UserParameter,
  Parameter,
  ParameterCollection,
  ParameterState,
  EvaluatedParameter,
  CreateParameterInput,
  ParameterValueState,
  createBimParameterWithDefaults,
  createUserParameterWithDefaults
} from './parameter-types'

/**
 * Re-export type guards and utilities
 */
export { isEquationValue, isPrimitiveValue, convertBimToUserType } from './value-types'

export {
  isBimParameter,
  isUserParameter,
  createBimParameter,
  createUserParameter,
  getParameterGroup,
  createParameterValueState
} from './parameter-types'

export type { ProcessedHeader } from './header-types'

export { PARAMETER_SETTINGS } from './constants'
