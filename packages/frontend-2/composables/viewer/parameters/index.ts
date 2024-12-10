/**
 * Viewer-specific parameter functionality
 * Handles BIM parameter discovery, mapping, and integration with core parameter system
 */

// BIM parameter handling
export { useBIMParameters } from './useBIMParameters'
export { useParameterMapping, ParameterMappingError } from './useParameterMapping'

// Re-export core parameter functionality for convenience
export {
  useParametersState,
  useParameterOperations,
  useParameterEvaluation,
  parameterToColumnDef,
  columnDefToParameter,
  cloneColumnDefs,
  createColumnDef,
  ParameterOperationError,
  ParameterEvaluationError,
  ParameterConversionError
} from '~/composables/core/parameters'

// Re-export parameter types
export type {
  Parameter,
  BimParameter,
  UserParameter,
  ParameterValue,
  ParameterState,
  EvaluatedParameter,
  CreateParameterInput
} from '~/composables/core/types'

// Re-export viewer types
export type {
  BIMNodeRaw,
  BIMNode,
  ProcessedHeader
} from '~/composables/core/types/viewer'
