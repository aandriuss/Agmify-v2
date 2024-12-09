import type {
  PrimitiveValue,
  BimValueType,
  UserValueType,
  ValidationRules,
  ParameterValue
} from './value-types'

import type { ParameterTableMapping } from '../mappings'

/**
 * Base parameter properties
 */
export interface BaseParameter {
  readonly id: string
  name: string
  field: string
  visible: boolean
  header: string
  description?: string
  category?: string
  order?: number
  computed?: unknown
  source?: string
  removable: boolean
  value: ParameterValue
  metadata?: Record<string, unknown>
}

/**
 * BIM parameter - Created from external system data
 */
export interface BimParameter extends BaseParameter {
  kind: 'bim'
  type: BimValueType
  readonly sourceValue: PrimitiveValue // Original value from BIM
  readonly fetchedGroup: string // Original group from BIM
  currentGroup: string // Current display group
  group?: never // Ensure group is never present
  equation?: never
  isCustom?: never
  validationRules?: never
}

/**
 * User parameter - Created by users in the system
 */
export interface UserParameter extends BaseParameter {
  kind: 'user'
  type: UserValueType
  group: string // User-defined group
  equation?: string // Optional equation for computed values
  isCustom?: boolean // Flag for custom parameters
  validationRules?: ValidationRules // Optional validation rules
  sourceValue?: never // Ensure BIM properties are never present
  fetchedGroup?: never
  currentGroup?: never
}

/**
 * Union type for all parameter types
 */
export type Parameter = BimParameter | UserParameter

/**
 * Type guards with runtime checks
 */
export function isBimParameter(param: Parameter): param is BimParameter {
  return param.kind === 'bim'
}

export function isUserParameter(param: Parameter): param is UserParameter {
  return param.kind === 'user'
}

/**
 * Collection types
 */
export interface ParameterCollection {
  parameters: Map<string, Parameter>
  groups: Set<string>
}

export interface ParameterState {
  parameters: Map<string, Parameter>
  groups: Set<string>
  tableMappings: Map<string, ParameterTableMapping[]>
  loading: boolean
  error: Error | null
}

/**
 * Parameter creation utilities
 */
export function createBimParameter(props: Omit<BimParameter, 'kind'>): BimParameter {
  return {
    ...props,
    kind: 'bim'
  }
}

export function createUserParameter(props: Omit<UserParameter, 'kind'>): UserParameter {
  return {
    ...props,
    kind: 'user'
  }
}

/**
 * Helper to get the effective group of any parameter
 */
export function getParameterGroup(param: Parameter): string {
  return isBimParameter(param) ? param.currentGroup : param.group
}

/**
 * Create a parameter value state
 */
export function createParameterValueState(value: PrimitiveValue): PrimitiveValue {
  return value
}
