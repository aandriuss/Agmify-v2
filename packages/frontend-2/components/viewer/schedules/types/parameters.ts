export type ParameterValueType = 'string' | 'number' | 'boolean'
export type ParameterValue = string | number | boolean | null
export type ParameterType = 'fixed' | 'equation' | ParameterValueType

export interface ParameterValueState {
  fetchedValue: ParameterValue
  currentValue: ParameterValue
  previousValue: ParameterValue
  userValue: ParameterValue
}

export interface UnifiedParameter {
  // Metadata
  id: string
  name: string
  field: string
  header: string
  type: ParameterType
  category: string
  description: string
  source: string
  isFetched: boolean
  fetchedGroup?: string
  currentGroup?: string
  // Values
  value?: string
  equation?: string
  valueState?: ParameterValueState
  // UI state
  visible?: boolean
  removable?: boolean
  order?: number
}

// Helper function to create parameter value state
export function createParameterValueState(value: ParameterValue): ParameterValueState {
  return {
    fetchedValue: value,
    currentValue: value,
    previousValue: value,
    userValue: null
  }
}

// ProcessedHeader interface
export interface ProcessedHeader
  extends Pick<
    UnifiedParameter,
    | 'field'
    | 'header'
    | 'type'
    | 'category'
    | 'description'
    | 'source'
    | 'isFetched'
    | 'fetchedGroup'
    | 'currentGroup'
  > {}

export interface AvailableHeaders {
  parent: UnifiedParameter[]
  child: UnifiedParameter[]
}
