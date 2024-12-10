import type {
  BimValueType,
  UserValueType,
  PrimitiveValue,
  ParameterValue
} from '../parameters/value-types'

/**
 * Common base interface for both parameters and columns
 */
export interface BaseItem {
  readonly id: string
  name: string
  field: string
  header: string
  visible: boolean
  removable: boolean
  order?: number
  category?: string
  description?: string
  metadata?: Record<string, unknown>
}

/**
 * Common BIM item interface
 */
export interface BaseBimItem extends BaseItem {
  kind: 'bim'
  type: BimValueType
  source?: string
  sourceValue: PrimitiveValue
  fetchedGroup: string
  currentGroup: string
  value?: ParameterValue
  isFixed?: boolean
  group?: never // Ensure group is never present
  isCustom?: never
  isCustomParameter?: never
}

/**
 * Common user item interface
 */
export interface BaseUserItem extends BaseItem {
  kind: 'user'
  type: UserValueType
  group: string
  value?: ParameterValue
  isCustom?: boolean
  isCustomParameter?: boolean
  parameterRef?: string
  fetchedGroup?: never // Ensure BIM properties are never present
  currentGroup?: never
  sourceValue?: never
  isFixed?: never
}

/**
 * Common base item type
 */
export type BaseItemType = BaseBimItem | BaseUserItem

/**
 * Type guard for base BIM item
 */
export function isBaseBimItem(value: unknown): value is BaseBimItem {
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

/**
 * Type guard for base user item
 */
export function isBaseUserItem(value: unknown): value is BaseUserItem {
  return (
    typeof value === 'object' &&
    value !== null &&
    'kind' in value &&
    value.kind === 'user' &&
    'group' in value
  )
}

/**
 * Helper to get the effective group of any item
 */
export function getItemGroup(item: BaseItemType): string {
  return isBaseBimItem(item) ? item.currentGroup : item.group
}

/**
 * Create a base item with required fields
 */
export function createBaseItem(
  partial: Partial<BaseItem> & { field: string }
): BaseItem {
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
    category: partial.category
  }
}

/**
 * Create a BIM item with required fields
 */
export function createBaseBimItem(
  partial: Partial<BaseBimItem> & { field: string; sourceValue: PrimitiveValue }
): BaseBimItem {
  const base = createBaseItem(partial)
  return {
    ...base,
    kind: 'bim',
    type: partial.type || 'string',
    sourceValue: partial.sourceValue,
    fetchedGroup: partial.fetchedGroup || 'Default',
    currentGroup: partial.currentGroup || partial.fetchedGroup || 'Default',
    source: partial.source,
    isFixed: partial.isFixed,
    value: partial.value
  }
}

/**
 * Create a user item with required fields
 */
export function createBaseUserItem(
  partial: Partial<BaseUserItem> & { field: string }
): BaseUserItem {
  const base = createBaseItem(partial)
  return {
    ...base,
    kind: 'user',
    type: partial.type || 'fixed',
    group: partial.group || 'Custom',
    isCustom: partial.isCustom,
    isCustomParameter: partial.isCustomParameter,
    parameterRef: partial.parameterRef,
    value: partial.value
  }
}
