import type {
  RawParameter,
  AvailableBimParameter,
  AvailableUserParameter,
  SelectedParameter,
  ParameterCollections
} from '~/composables/core/types/parameters'

// Re-export types from centralized location
export type {
  RawParameter,
  AvailableBimParameter,
  AvailableUserParameter,
  SelectedParameter,
  ParameterCollections
}

// Export creation utilities
export {
  createAvailableBimParameter,
  createAvailableUserParameter,
  createSelectedParameter
} from '~/composables/core/types/parameters'
