import type {
  PrimitiveValue,
  BimValueType,
  UserValueType,
  ParameterValue,
  EquationValue,
  ValidationRules,
  ValidationResult
} from './value-types'

import type {
  BaseParameter,
  BimParameter,
  UserParameter,
  Parameter,
  ParameterCollection,
  ParameterTableMapping,
  ParameterState
} from './parameter-types'

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
}

/**
 * Re-export parameter types
 */
export type {
  BaseParameter,
  BimParameter,
  UserParameter,
  Parameter,
  ParameterCollection,
  ParameterTableMapping,
  ParameterState
}

/**
 * Re-export type guards and utilities
 */
export { isEquationValue, isPrimitiveValue } from './value-types'

export {
  isBimParameter,
  isUserParameter,
  createBimParameter,
  createUserParameter,
  getParameterGroup,
  createParameterValueState
} from './parameter-types'
