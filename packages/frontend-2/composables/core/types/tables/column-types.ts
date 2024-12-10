import type {
  PrimitiveValue,
  ParameterValue,
  BimValueType,
  UserValueType
} from '../parameters/value-types'
import type { BaseItem } from '../common/base-types'
import type { Parameter } from '../parameters/parameter-types'

/**
 * Column-specific properties
 */
interface ColumnSpecific {
  width?: number
  sortable?: boolean
  filterable?: boolean
  headerComponent?: string
  color?: string
  expander?: boolean
}

/**
 * Base column definition
 */
export interface BaseColumnDef extends BaseItem {
  value?: ParameterValue | null
}

/**
 * BIM column definition
 */
export interface BimColumnDef extends BaseColumnDef, ColumnSpecific {
  kind: 'bim'
  type: BimValueType
  source?: string
  sourceValue: PrimitiveValue | null
  fetchedGroup: string
  currentGroup: string
  isFixed?: boolean
  group?: never
  isCustomParameter?: never
}

/**
 * User column definition
 */
export interface UserColumnDef extends BaseColumnDef, ColumnSpecific {
  kind: 'user'
  type: UserValueType
  group: string
  isCustomParameter?: boolean
  parameterRef?: string
  fetchedGroup?: never
  currentGroup?: never
  sourceValue?: never
  isFixed?: never
}

/**
 * Union type for all column types
 */
export type ColumnDef = BimColumnDef | UserColumnDef

/**
 * Type guards
 */
export function isBimColumnDef(value: unknown): value is BimColumnDef {
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

export function isUserColumnDef(value: unknown): value is UserColumnDef {
  return (
    typeof value === 'object' &&
    value !== null &&
    'kind' in value &&
    value.kind === 'user' &&
    'group' in value
  )
}

export function isColumnDef(value: unknown): value is ColumnDef {
  return isBimColumnDef(value) || isUserColumnDef(value)
}

/**
 * Create column definition functions
 */
export function createBimColumnDef(props: Omit<BimColumnDef, 'kind'>): BimColumnDef {
  return {
    ...props,
    kind: 'bim'
  }
}

export function createUserColumnDef(props: Omit<UserColumnDef, 'kind'>): UserColumnDef {
  return {
    ...props,
    kind: 'user'
  }
}

/**
 * Helper to get the effective group of any column
 */
export function getColumnGroup(column: ColumnDef): string {
  return isBimColumnDef(column) ? column.currentGroup : column.group
}

/**
 * Create a base column definition with required fields
 */
export function createBaseColumnDef(
  partial: Partial<BaseColumnDef> & { field: string }
): BaseColumnDef {
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
    value: partial.value ?? null
  }
}

/**
 * Create a BIM column definition with required fields
 */
export function createBimColumnDefWithDefaults(
  partial: Partial<BimColumnDef> & { field: string }
): BimColumnDef {
  const base = createBaseColumnDef(partial)
  return {
    ...base,
    kind: 'bim',
    type: partial.type || 'string',
    sourceValue: partial.sourceValue ?? null,
    fetchedGroup: partial.fetchedGroup || 'Default',
    currentGroup: partial.currentGroup || partial.fetchedGroup || 'Default',
    source: partial.source,
    isFixed: partial.isFixed,
    width: partial.width,
    sortable: partial.sortable,
    filterable: partial.filterable,
    headerComponent: partial.headerComponent,
    color: partial.color,
    expander: partial.expander
  }
}

/**
 * Create a user column definition with required fields
 */
export function createUserColumnDefWithDefaults(
  partial: Partial<UserColumnDef> & { field: string }
): UserColumnDef {
  const base = createBaseColumnDef(partial)
  return {
    ...base,
    kind: 'user',
    type: partial.type || 'fixed',
    group: partial.group || 'Custom',
    isCustomParameter: partial.isCustomParameter,
    parameterRef: partial.parameterRef,
    width: partial.width,
    sortable: partial.sortable,
    filterable: partial.filterable,
    headerComponent: partial.headerComponent,
    color: partial.color,
    expander: partial.expander
  }
}

/**
 * Convert parameter to column definition
 */
export function parameterToColumnDef(param: Parameter): ColumnDef {
  const base = {
    id: param.id,
    name: param.name,
    field: param.field,
    header: param.header,
    visible: param.visible,
    removable: param.removable,
    order: param.order,
    metadata: param.metadata,
    description: param.description,
    category: param.category,
    value: param.value ?? null
  }

  if (param.kind === 'bim') {
    return createBimColumnDefWithDefaults({
      ...base,
      kind: 'bim',
      type: param.type,
      sourceValue: param.sourceValue ?? null,
      fetchedGroup: param.fetchedGroup,
      currentGroup: param.currentGroup,
      source: param.source,
      isFixed: false
    })
  }

  return createUserColumnDefWithDefaults({
    ...base,
    kind: 'user',
    type: param.type,
    group: param.group,
    isCustomParameter: param.isCustom,
    parameterRef: param.id
  })
}
