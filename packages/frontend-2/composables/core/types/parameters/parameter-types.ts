import type {
  BimValueType,
  UserValueType,
  ValidationRules,
  ParameterValue,
  PrimitiveValue
} from './value-types'
import type { BaseItem } from '../common/base-types'

/**
 * Parameter value state interface
 */
export interface ParameterValueState {
  fetchedValue: ParameterValue | null
  currentValue: ParameterValue | null
  previousValue: ParameterValue | null
  userValue: ParameterValue | null
}

/**
 * Parameters record type
 */
export type Parameters = Record<string, ParameterValueState>

/**
 * Base parameter interface
 */
export interface BaseParameter extends BaseItem {
  type: BimValueType | UserValueType
  value?: ParameterValue | null
}

/**
 * BIM parameter interface
 */
export interface BimParameter extends BaseParameter {
  kind: 'bim'
  type: BimValueType
  sourceValue: PrimitiveValue | null
  fetchedGroup: string
  currentGroup: string
  source?: string
  group?: never
  isCustom?: never
}

/**
 * User parameter interface
 */
export interface UserParameter extends BaseParameter {
  kind: 'user'
  type: UserValueType
  group: string
  equation?: string
  isCustom?: boolean
  validationRules?: ValidationRules
  fetchedGroup?: never
  currentGroup?: never
  sourceValue?: never
}

/**
 * Parameter type
 */
export type Parameter = BimParameter | UserParameter

/**
 * Parameter collection interface
 */
export interface ParameterCollection {
  [key: string]: Parameter
}

/**
 * Parameter state interface
 */
export interface ParameterState {
  parameters: ParameterCollection
  loading: boolean
  error: Error | null
}

/**
 * Create parameter input interface
 */
export interface CreateParameterInput {
  field: string
  id?: string
  name?: string
  header?: string
  type?: BimValueType | UserValueType
  value?: ParameterValue | null
  category?: string
  description?: string
  visible?: boolean
  removable?: boolean
  metadata?: Record<string, unknown>
  order?: number
  sourceValue?: PrimitiveValue | null
  source?: string
  fetchedGroup?: string
  currentGroup?: string
  group?: string
  equation?: string
  isCustom?: boolean
  validationRules?: ValidationRules
}

/**
 * Evaluated BIM parameter interface
 */
export interface EvaluatedBimParameter extends BimParameter {
  evaluatedValue: ParameterValue | null
}

/**
 * Evaluated user parameter interface
 */
export interface EvaluatedUserParameter extends UserParameter {
  evaluatedValue: ParameterValue | null
}

/**
 * Evaluated parameter type
 */
export type EvaluatedParameter = EvaluatedBimParameter | EvaluatedUserParameter

/**
 * Type guards
 */
export function isBimParameter(value: unknown): value is BimParameter {
  return (
    typeof value === 'object' &&
    value !== null &&
    'kind' in value &&
    value.kind === 'bim' &&
    'sourceValue' in value &&
    'fetchedGroup' in value &&
    'currentGroup' in value
  )
}

export function isUserParameter(value: unknown): value is UserParameter {
  return (
    typeof value === 'object' &&
    value !== null &&
    'kind' in value &&
    value.kind === 'user' &&
    'group' in value
  )
}

export function isParameter(value: unknown): value is Parameter {
  return isBimParameter(value) || isUserParameter(value)
}

export function isEvaluatedBimParameter(
  value: unknown
): value is EvaluatedBimParameter {
  return isBimParameter(value) && 'evaluatedValue' in value
}

export function isEvaluatedUserParameter(
  value: unknown
): value is EvaluatedUserParameter {
  return isUserParameter(value) && 'evaluatedValue' in value
}

export function isEvaluatedParameter(value: unknown): value is EvaluatedParameter {
  return isEvaluatedBimParameter(value) || isEvaluatedUserParameter(value)
}

/**
 * Create parameter functions
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
 * Create a base parameter with required fields
 */
export function createBaseParameter(
  partial: Partial<BaseParameter> & { field: string }
): BaseParameter {
  return {
    id: partial.id || crypto.randomUUID(),
    name: partial.name || partial.field,
    field: partial.field,
    header: partial.header || partial.field,
    visible: partial.visible ?? true,
    removable: partial.removable ?? true,
    order: partial.order,
    metadata: partial.metadata,
    description: partial.description,
    category: partial.category,
    type: partial.type || 'string',
    value: partial.value ?? null
  }
}

/**
 * Create a BIM parameter with required fields
 */
export function createBimParameterWithDefaults(
  partial: Partial<BimParameter> & { field: string }
): BimParameter {
  const base = createBaseParameter(partial)
  return {
    ...base,
    kind: 'bim',
    type: partial.type || 'string',
    sourceValue: partial.sourceValue ?? null,
    fetchedGroup: partial.fetchedGroup || 'Default',
    currentGroup: partial.currentGroup || partial.fetchedGroup || 'Default',
    source: partial.source,
    value: partial.value ?? null
  }
}

/**
 * Create a user parameter with required fields
 */
export function createUserParameterWithDefaults(
  partial: Partial<UserParameter> & { field: string }
): UserParameter {
  const base = createBaseParameter(partial)
  return {
    ...base,
    kind: 'user',
    type: partial.type || 'fixed',
    group: partial.group || 'Custom',
    equation: partial.equation,
    isCustom: partial.isCustom,
    validationRules: partial.validationRules,
    value: partial.value ?? null
  }
}

/**
 * Get parameter group
 */
export function getParameterGroup(param: Parameter): string {
  return isBimParameter(param) ? param.currentGroup : param.group
}

/**
 * Create parameter value state
 */
export function createParameterValueState(
  value: ParameterValue | null
): ParameterValueState {
  return {
    fetchedValue: value,
    currentValue: value,
    previousValue: value,
    userValue: null
  }
}
