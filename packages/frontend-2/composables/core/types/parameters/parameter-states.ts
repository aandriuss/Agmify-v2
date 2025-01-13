import type { ParameterValue, BimValueType, UserValueType } from '../parameters'

/**
 * Group name type
 */
export interface Group {
  fetchedGroup: string
  currentGroup: string
}

/**
 * Create default group
 */
function createDefaultGroup(groupName?: string): Group {
  return {
    fetchedGroup: groupName || 'Ungrouped',
    currentGroup: groupName || 'Ungrouped'
  }
}

/**
 * Parameter metadata interface
 */
export interface ParameterMetadata extends Record<string, unknown> {
  category?: string
  fullKey?: string
  isSystem?: boolean
  elementId?: string
  isNested?: boolean
  parentKey?: string
  isJsonString?: boolean
  displayName?: string
}

/**
 * Raw parameter from BIM before any processing
 */
/**
 * Element parameter interface
 * Used to store parameter data with its group in ElementData
 */
export interface ElementParameter {
  value: ParameterValue
  group: Group
  metadata?: ParameterMetadata
}

/**
 * Create default element parameter
 */
export function createElementParameter(
  value: ParameterValue,
  group: Group = createDefaultGroup(),
  metadata?: ParameterMetadata
): ElementParameter {
  return {
    value,
    group,
    metadata
  }
}

/**
 * Type guard for ElementParameter
 */
export function isElementParameter(value: unknown): value is ElementParameter {
  if (!value || typeof value !== 'object') return false
  const p = value as Partial<ElementParameter>
  return (
    'value' in p &&
    typeof p.group === 'object' &&
    p.group !== null &&
    typeof (p.group as Group).fetchedGroup === 'string' &&
    typeof (p.group as Group).currentGroup === 'string'
  )
}

/**
 * Raw parameter from BIM before any processing
 */
export interface RawParameter {
  id: string
  name: string // Clean name without group prefix
  value: unknown
  group: Group
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
  group: Group
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
  field: string // Required by GraphQL schema
  header: string // Required by GraphQL schema
  removable: boolean // Required by GraphQL schema
  type: UserValueType
  value: ParameterValue
  group: Group
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

// Type guards
export const isRawParameter = (param: unknown): param is RawParameter => {
  if (!param || typeof param !== 'object') return false
  const p = param as Partial<RawParameter>
  return (
    typeof p.id === 'string' &&
    typeof p.name === 'string' &&
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
    typeof p.isSystem === 'boolean' &&
    typeof p.group === 'object' &&
    p.group !== null &&
    typeof (p.group as Group).fetchedGroup === 'string' &&
    typeof (p.group as Group).currentGroup === 'string' &&
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
    typeof p.group === 'object' &&
    p.group !== null &&
    typeof (p.group as Group).fetchedGroup === 'string' &&
    typeof (p.group as Group).currentGroup === 'string' &&
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
  return {
    kind: 'bim',
    id: raw.id,
    name: raw.name,
    type,
    value: processedValue,
    group: raw.group, // Use group directly from raw parameter
    visible: true,
    isSystem: isSystem || raw.metadata?.isSystem || false,
    metadata: raw.metadata
  }
}

export const createAvailableUserParameter = (
  id: string,
  name: string,
  type: UserValueType,
  value: ParameterValue,
  group?: Group,
  equation?: string,
  metadata?: ParameterMetadata
): AvailableUserParameter => ({
  kind: 'user',
  id,
  name,
  type,
  value,
  group: group || createDefaultGroup(),
  visible: true,
  equation,
  metadata,
  field: name.toLowerCase().replace(/\s+/g, '_'), // Generate field from name
  header: name, // Use name as header
  removable: true // User parameters are always removable
})
