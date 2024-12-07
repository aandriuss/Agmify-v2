import type {
  Parameter,
  BimParameter,
  UserParameter,
  PrimitiveValue,
  ParameterValue,
  BimValueType,
  UserValueType
} from '../parameters'

/**
 * Store parameter value state
 */
export interface StoreParameterValueState {
  readonly id: string
  name: string
  type: BimValueType | UserValueType
  value: ParameterValue
  currentValue?: ParameterValue
  previousValue?: ParameterValue
  userValue?: ParameterValue
  fetchedValue?: PrimitiveValue
  isValid: boolean
  error?: string
}

/**
 * Store BIM parameter
 */
export interface StoreBimParameter extends StoreParameterValueState {
  kind: 'bim'
  type: BimValueType
  sourceValue: PrimitiveValue
  fetchedGroup: string
  currentGroup: string
  group?: never
  equation?: never
}

/**
 * Store user parameter
 */
export interface StoreUserParameter extends StoreParameterValueState {
  kind: 'user'
  type: UserValueType
  group: string
  equation?: string
  sourceValue?: never
  fetchedGroup?: never
  currentGroup?: never
}

/**
 * Store parameter value union type
 */
export type StoreParameterValue = StoreBimParameter | StoreUserParameter

/**
 * Store parameter definition base
 */
export interface BaseStoreParameterDefinition {
  readonly id: string
  field: string
  name: string
  type: string
  header: string
  visible: boolean
  removable: boolean
  order?: number
  category?: string
  description?: string
  metadata?: Record<string, unknown>
}

/**
 * Store BIM parameter definition
 */
export interface StoreBimParameterDefinition extends BaseStoreParameterDefinition {
  kind: 'bim'
  type: BimValueType
  currentGroup: string
  fetchedGroup: string
  group?: never
  equation?: never
}

/**
 * Store user parameter definition
 */
export interface StoreUserParameterDefinition extends BaseStoreParameterDefinition {
  kind: 'user'
  type: UserValueType
  group: string
  equation?: string
  currentGroup?: never
  fetchedGroup?: never
}

/**
 * Store parameter definition union type
 */
export type StoreParameterDefinition =
  | StoreBimParameterDefinition
  | StoreUserParameterDefinition

/**
 * Type guards
 */
export function isStoreBimParameter(
  param: StoreParameterValue
): param is StoreBimParameter {
  return param.kind === 'bim'
}

export function isStoreUserParameter(
  param: StoreParameterValue
): param is StoreUserParameter {
  return param.kind === 'user'
}

export function isStoreBimDefinition(
  def: StoreParameterDefinition
): def is StoreBimParameterDefinition {
  return def.kind === 'bim'
}

export function isStoreUserDefinition(
  def: StoreParameterDefinition
): def is StoreUserParameterDefinition {
  return def.kind === 'user'
}

/**
 * Conversion utilities
 */
export function convertToStoreParameter(param: Parameter): StoreParameterValue {
  if (param.kind === 'bim') {
    return {
      id: param.id,
      kind: 'bim',
      name: param.name,
      type: param.type,
      value: param.value,
      currentValue: param.value,
      sourceValue: param.sourceValue,
      fetchedGroup: param.fetchedGroup,
      currentGroup: param.currentGroup,
      isValid: true
    }
  } else {
    return {
      id: param.id,
      kind: 'user',
      name: param.name,
      type: param.type,
      value: param.value,
      currentValue: param.value,
      group: param.group,
      equation: param.equation,
      isValid: true
    }
  }
}

export function convertToStoreDefinition(param: Parameter): StoreParameterDefinition {
  if (param.kind === 'bim') {
    return {
      id: param.id,
      kind: 'bim',
      field: param.field,
      name: param.name,
      type: param.type,
      header: param.header,
      visible: param.visible,
      removable: param.removable,
      order: param.order,
      category: param.category,
      description: param.description,
      metadata: param.metadata,
      currentGroup: param.currentGroup,
      fetchedGroup: param.fetchedGroup
    }
  } else {
    return {
      id: param.id,
      kind: 'user',
      field: param.field,
      name: param.name,
      type: param.type,
      header: param.header,
      visible: param.visible,
      removable: param.removable,
      order: param.order,
      category: param.category,
      description: param.description,
      metadata: param.metadata,
      group: param.group,
      equation: param.equation
    }
  }
}

export function convertToParameter(
  store: StoreParameterValue | StoreParameterDefinition
): Parameter {
  if (store.kind === 'bim') {
    return {
      id: store.id,
      kind: 'bim',
      name: store.name,
      field: 'field' in store ? store.field : store.id,
      type: store.type,
      header: 'header' in store ? store.header : store.name,
      visible: 'visible' in store ? store.visible : true,
      removable: 'removable' in store ? store.removable : true,
      value: 'value' in store ? store.value : null,
      sourceValue: 'sourceValue' in store ? store.sourceValue : null,
      fetchedGroup: store.fetchedGroup,
      currentGroup: store.currentGroup
    } as BimParameter
  } else {
    return {
      id: store.id,
      kind: 'user',
      name: store.name,
      field: 'field' in store ? store.field : store.id,
      type: store.type,
      header: 'header' in store ? store.header : store.name,
      visible: 'visible' in store ? store.visible : true,
      removable: 'removable' in store ? store.removable : true,
      value: 'value' in store ? store.value : null,
      group: store.group,
      equation: store.equation
    } as UserParameter
  }
}
