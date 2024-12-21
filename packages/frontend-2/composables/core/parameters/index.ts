// Parameter operations
export { useParameters } from './useParameters'
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
export { toPrimitiveValue } from './conversion'

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
