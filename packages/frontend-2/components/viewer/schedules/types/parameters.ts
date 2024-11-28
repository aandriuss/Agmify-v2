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

export interface BaseParameter {
  field: string
  header: string
  category?: string
  visible?: boolean
  removable?: boolean
  order?: number
}

export interface ParameterFormData {
  id?: string
  name: string
  type: 'fixed' | 'equation'
  value?: string
  equation?: string
  group: string
  errors: {
    name?: string
    value?: string
    equation?: string
  }
}

export interface CustomParameter extends BaseParameter {
  id: string
  name: string
  type: 'fixed' | 'equation'
  value?: string
  equation?: string
  group: string // Group name for organization (default: 'Custom')
  field: string // Used as identifier in evaluations
  header: string // Display name in tables
  category: string // Usually 'Custom Parameters'
  visible: boolean // Whether parameter is visible in tables
  removable: boolean // Whether parameter can be removed
  order: number // Display order in tables
}

// Type guard for custom parameters
export function isCustomParameter(value: unknown): value is CustomParameter {
  if (!value || typeof value !== 'object') return false

  const param = value as Record<string, unknown>
  return (
    typeof param.id === 'string' &&
    typeof param.name === 'string' &&
    (param.type === 'fixed' || param.type === 'equation') &&
    typeof param.field === 'string' &&
    typeof param.header === 'string' &&
    typeof param.category === 'string'
  )
}

// Utility type for creating a new parameter
export type NewCustomParameter = Omit<CustomParameter, 'id'>

export interface ParameterGroup {
  id: string // Normalized name used as identifier (e.g., 'custom', 'dimensions')
  name: string // Display name (e.g., 'Custom', 'Dimensions')
  parameters: CustomParameter[] // Parameters in this group
}

// Type for available groups in dropdowns/selection
export interface GroupOption {
  id: string
  name: string
  isCustom?: boolean
}
