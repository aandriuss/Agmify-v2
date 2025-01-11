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
  displayName?: string
  originalGroup?: string
  groupId?: string
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
  field: string // Required by GraphQL schema
  header: string // Required by GraphQL schema
  removable: boolean // Required by GraphQL schema
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

// Creation utilities
export const createAvailableBimParameter = (
  raw: RawParameter,
  type: BimValueType,
  processedValue: ParameterValue,
  isSystem = false
): AvailableBimParameter => {
  // Extract group and name from parameter
  const nameParts = raw.name.split('.')
  const groupName = nameParts.length > 1 ? nameParts[0] : undefined
  const cleanName = nameParts.length > 1 ? nameParts.slice(1).join('.') : raw.name

  // Use original group from metadata if available
  const group = raw.metadata?.originalGroup || groupName || raw.fetchedGroup

  return {
    kind: 'bim',
    id: raw.id,
    name: cleanName,
    type,
    value: processedValue,
    fetchedGroup: group,
    currentGroup: group,
    visible: true,
    isSystem: isSystem || raw.metadata?.isSystem || false,
    metadata: {
      ...raw.metadata,
      displayName: cleanName,
      originalGroup: group,
      groupId: group ? `bim_${group}` : ''
    }
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
  metadata,
  field: name.toLowerCase().replace(/\s+/g, '_'), // Generate field from name
  header: name, // Use name as header
  removable: true // User parameters are always removable
})
