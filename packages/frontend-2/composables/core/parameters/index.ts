// Parameter operations
export { useParameters } from './next/useParameters'
export {
  useParameterOperations,
  ParameterOperationError
} from './useParameterOperations'
export {
  useParameterEvaluation,
  ParameterEvaluationError
} from './useParameterEvaluation'
export { useParametersState } from './useParametersState'
export { useParameterColumns, ParameterColumnError } from './useParameterColumns'

// Parameter conversion
export {
  toPrimitiveValue,
  parameterToColumnDef,
  columnDefToParameter,
  // Backward compatibility exports
  parameterToColumnDef as createColumnDef
} from './conversion'

// Column conversion (from types)
export { createBaseColumnDef as cloneColumnDefs } from '../types/tables/column-types'

// Error types
export class ParameterConversionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ParameterConversionError'
  }
}

// Constants
export * from './constants'

// Re-export parameter types
export type { ParameterValue, PrimitiveValue, EquationValue } from '../types'

// Re-export type guards
export {
  isBimParameter,
  isUserParameter,
  isEquationValue,
  isPrimitiveValue
} from '../types'

// Re-export viewer types
export type { BIMNodeRaw, BIMNode, ProcessedHeader } from '../types/viewer/viewer-base'
