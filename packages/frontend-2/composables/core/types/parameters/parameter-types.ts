// This file has been migrated to parameter-states.ts
// Re-export types from parameter-states.ts for backward compatibility

import type { AvailableBimParameter, AvailableUserParameter } from './parameter-states'

// Type aliases for backward compatibility
export type BimParameter = AvailableBimParameter
export type UserParameter = AvailableUserParameter
export type Parameter = AvailableBimParameter | AvailableUserParameter

// Re-export type guards
export {
  isAvailableBimParameter as isBimParameter,
  isAvailableUserParameter as isUserParameter,
  isSelectedParameter,
  isColumnDefinition
} from './parameter-states'

// Re-export creation utilities
export {
  createAvailableBimParameter as createBimParameter,
  createAvailableUserParameter as createUserParameter,
  createSelectedParameter,
  createColumnDefinition
} from './parameter-states'

// Export empty interfaces for backward compatibility
export interface ParameterValueState {
  fetchedValue: unknown
  currentValue: unknown
  previousValue: unknown
  userValue: unknown
}

export interface Parameters {
  [key: string]: ParameterValueState
}

// Note: This file is maintained for backward compatibility.
// New code should use types from parameter-states.ts directly.
