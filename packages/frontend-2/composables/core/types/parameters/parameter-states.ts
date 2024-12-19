import type { ParameterValue, BimValueType, UserValueType } from '../parameters'

/**
 * Raw parameter from BIM before any processing
 */
export interface RawParameter {
  id: string
  name: string
  value: unknown
  sourceGroup: string
  metadata?: Record<string, unknown>
}

/**
 * Available BIM parameter after filtering and initial processing
 */
export interface AvailableBimParameter {
  kind: 'bim'
  id: string
  name: string
  type: BimValueType
  value: ParameterValue
  sourceGroup: string
  currentGroup: string
  isSystem: boolean
  category?: string
  description?: string
}

/**
 * User-defined parameter
 */
export interface AvailableUserParameter {
  kind: 'user'
  id: string
  name: string
  type: UserValueType
  value: ParameterValue
  group: string
  equation?: string
  category?: string
  description?: string
}

/**
 * Union type for all available parameters
 */
export type AvailableParameter = AvailableBimParameter | AvailableUserParameter

/**
 * Selected parameter with display properties
 */
export interface SelectedParameter {
  id: string
  name: string
  kind: 'bim' | 'user'
  type: BimValueType | UserValueType
  value: ParameterValue
  group: string
  visible: boolean
  order: number
  category?: string
  description?: string
}

/**
 * Column definition for display
 */
export interface ColumnDefinition extends SelectedParameter {
  field: string
  header: string
  width?: number
  sortable?: boolean
  filterable?: boolean
}

/**
 * Parameter collections with parent/child separation
 */
export interface ParameterCollections {
  parent: {
    raw: RawParameter[]
    available: {
      bim: AvailableBimParameter[]
      user: AvailableUserParameter[]
    }
    selected: SelectedParameter[]
    columns: ColumnDefinition[]
  }
  child: {
    raw: RawParameter[]
    available: {
      bim: AvailableBimParameter[]
      user: AvailableUserParameter[]
    }
    selected: SelectedParameter[]
    columns: ColumnDefinition[]
  }
}

// Type guards
export const isRawParameter = (param: unknown): param is RawParameter => {
  if (!param || typeof param !== 'object') return false
  const p = param as Partial<RawParameter>
  return (
    typeof p.id === 'string' &&
    typeof p.name === 'string' &&
    typeof p.sourceGroup === 'string' &&
    'value' in p
  )
}

export const isAvailableBimParameter = (
  param: unknown
): param is AvailableBimParameter => {
  if (!param || typeof param !== 'object') return false
  const p = param as Partial<AvailableBimParameter>
  return (
    p.kind === 'bim' &&
    typeof p.id === 'string' &&
    typeof p.name === 'string' &&
    typeof p.sourceGroup === 'string' &&
    typeof p.currentGroup === 'string' &&
    typeof p.isSystem === 'boolean' &&
    'value' in p &&
    'type' in p
  )
}

export const isAvailableUserParameter = (
  param: unknown
): param is AvailableUserParameter => {
  if (!param || typeof param !== 'object') return false
  const p = param as Partial<AvailableUserParameter>
  return (
    p.kind === 'user' &&
    typeof p.id === 'string' &&
    typeof p.name === 'string' &&
    typeof p.group === 'string' &&
    'value' in p &&
    'type' in p
  )
}

export const isSelectedParameter = (param: unknown): param is SelectedParameter => {
  if (!param || typeof param !== 'object') return false
  const p = param as Partial<SelectedParameter>
  return (
    typeof p.id === 'string' &&
    typeof p.name === 'string' &&
    (p.kind === 'bim' || p.kind === 'user') &&
    typeof p.group === 'string' &&
    typeof p.visible === 'boolean' &&
    typeof p.order === 'number' &&
    'value' in p &&
    'type' in p
  )
}

export const isColumnDefinition = (param: unknown): param is ColumnDefinition => {
  if (!isSelectedParameter(param)) return false
  const p = param as Partial<ColumnDefinition>
  return typeof p.field === 'string' && typeof p.header === 'string'
}

// Creation utilities
export const createAvailableBimParameter = (
  raw: RawParameter,
  type: BimValueType,
  processedValue: ParameterValue,
  isSystem = false
): AvailableBimParameter => ({
  kind: 'bim',
  id: raw.id,
  name: raw.name,
  type,
  value: processedValue,
  sourceGroup: raw.sourceGroup,
  currentGroup: raw.sourceGroup,
  isSystem: isSystem || raw.name.startsWith('__') || raw.sourceGroup.startsWith('__')
})

export const createAvailableUserParameter = (
  id: string,
  name: string,
  type: UserValueType,
  value: ParameterValue,
  group: string,
  equation?: string
): AvailableUserParameter => ({
  kind: 'user',
  id,
  name,
  type,
  value,
  group,
  equation
})

export const createSelectedParameter = (
  available: AvailableParameter,
  order: number,
  visible = true
): SelectedParameter => ({
  id: available.id,
  name: available.name,
  kind: available.kind,
  type: available.type,
  value: available.value,
  group:
    'sourceGroup' in available && available.kind === 'bim'
      ? available.currentGroup
      : available.group,
  visible,
  order,
  category: available.category,
  description: available.description
})

export const createColumnDefinition = (
  selected: SelectedParameter,
  width?: number
): ColumnDefinition => ({
  ...selected,
  field: selected.id,
  header: selected.name,
  width,
  sortable: true,
  filterable: true
})
