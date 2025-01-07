import type { ParameterValue, BimValueType, UserValueType } from '../parameters'

/**
 * Parameter metadata interface
 */
export interface ParameterMetadata extends Record<string, unknown> {
  category?: string
  fullKey?: string
  isSystem?: boolean
  group?: string
  elementId?: string
  isNested?: boolean
  parentKey?: string
  isJsonString?: boolean
}

/**
 * Raw parameter from BIM before any processing
 */
export interface RawParameter {
  id: string
  name: string
  value: unknown
  fetchedGroup: string
  metadata: ParameterMetadata
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
  fetchedGroup: string
  currentGroup: string
  visible?: boolean
  isSystem: boolean
  category?: string
  description?: string
  metadata?: ParameterMetadata
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
  visible: boolean
  equation?: string
  category?: string
  description?: string
  metadata?: ParameterMetadata
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
  metadata?: ParameterMetadata
}

/**
 * Base parameter collections without selected parameters
 * (used by parameter store)
 */
export interface BaseParameterCollections {
  parent: {
    raw: RawParameter[]
    available: {
      bim: AvailableBimParameter[]
      user: AvailableUserParameter[]
    }
  }
  child: {
    raw: RawParameter[]
    available: {
      bim: AvailableBimParameter[]
      user: AvailableUserParameter[]
    }
  }
}

/**
 * Parameter collections with selected parameters
 * (used by table store)
 */
export interface ParameterCollections extends BaseParameterCollections {
  parent: {
    raw: RawParameter[]
    available: {
      bim: AvailableBimParameter[]
      user: AvailableUserParameter[]
    }
    selected: SelectedParameter[]
  }
  child: {
    raw: RawParameter[]
    available: {
      bim: AvailableBimParameter[]
      user: AvailableUserParameter[]
    }
    selected: SelectedParameter[]
  }
}

// Type guards
export const isRawParameter = (param: unknown): param is RawParameter => {
  if (!param || typeof param !== 'object') return false
  const p = param as Partial<RawParameter>
  return (
    typeof p.id === 'string' &&
    typeof p.name === 'string' &&
    typeof p.fetchedGroup === 'string' &&
    'value' in p &&
    typeof p.metadata === 'object'
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
    typeof p.fetchedGroup === 'string' &&
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

// Creation utilities
export const createAvailableBimParameter = (
  raw: RawParameter,
  type: BimValueType,
  processedValue: ParameterValue,
  isSystem = false
): AvailableBimParameter => {
  // Handle Parameters.* format
  const fetchedGroup = raw.id.startsWith('Parameters.')
    ? 'Parameters'
    : raw.fetchedGroup
  const name = raw.id.startsWith('Parameters.')
    ? raw.id.split('.').slice(1).join('.')
    : raw.name

  return {
    kind: 'bim',
    id: raw.id,
    name,
    type,
    value: processedValue,
    fetchedGroup,
    currentGroup: fetchedGroup,
    visible: true,
    isSystem: isSystem || raw.name.startsWith('__') || fetchedGroup.startsWith('__'),
    metadata: raw.metadata
  }
}

export const createAvailableUserParameter = (
  id: string,
  name: string,
  type: UserValueType,
  value: ParameterValue,
  group: string,
  equation?: string,
  metadata?: ParameterMetadata
): AvailableUserParameter => ({
  kind: 'user',
  id,
  name,
  type,
  value,
  group,
  visible: true,
  equation,
  metadata
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
    'fetchedGroup' in available && available.kind === 'bim'
      ? available.currentGroup
      : available.group,
  visible,
  order,
  category: available.category,
  description: available.description,
  metadata: available.metadata
})
