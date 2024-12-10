import type { BimColumnDef, UserColumnDef, ColumnDef } from './column-types'
import type {
  BimValueType,
  UserValueType,
  PrimitiveValue
} from '../parameters/value-types'
import { convertBimToUserType } from '../parameters/value-types'
import { debug, DebugCategories } from '~/composables/core/utils/debug'

/**
 * Column conversion options
 */
export interface ColumnConversionOptions {
  field: string
  header?: string
  name?: string
  type?: BimValueType | UserValueType
  visible?: boolean
  removable?: boolean
  order?: number
  category?: string
  description?: string
  metadata?: Record<string, unknown>
}

/**
 * Convert any column to a UserColumnDef
 */
export function toUserColumn(
  column: ColumnConversionOptions | ColumnDef
): UserColumnDef {
  try {
    debug.log(DebugCategories.COLUMNS, 'Converting column to user column', {
      field: column.field,
      type: column.type
    })

    // If it's already a UserColumnDef, just return it
    if ('kind' in column && column.kind === 'user') {
      return column
    }

    // If it's a BimColumnDef, convert its type
    let valueType: UserValueType
    if ('kind' in column && column.kind === 'bim') {
      valueType = convertBimToUserType(column.type)
    } else {
      // Default to 'fixed' for any other type
      valueType = 'fixed'
    }

    return {
      id: crypto.randomUUID(),
      kind: 'user',
      field: column.field,
      header: column.header || column.field,
      name: column.name || column.field,
      type: valueType,
      visible: column.visible ?? true,
      removable: column.removable ?? true,
      order: column.order,
      group: 'Custom',
      category: column.category,
      description: column.description,
      metadata: column.metadata
    }
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Failed to convert column:', err)
    throw err
  }
}

/**
 * Convert any column to a BimColumnDef
 */
export function toBimColumn(
  column: ColumnConversionOptions | ColumnDef,
  sourceValue: PrimitiveValue = null
): BimColumnDef {
  try {
    debug.log(DebugCategories.COLUMNS, 'Converting column to BIM column', {
      field: column.field,
      type: column.type
    })

    // If it's already a BimColumnDef, just return it
    if ('kind' in column && column.kind === 'bim') {
      return column
    }

    // Default to 'string' if no type or invalid type
    const valueType: BimValueType = 'string'

    return {
      id: crypto.randomUUID(),
      kind: 'bim',
      field: column.field,
      header: column.header || column.field,
      name: column.name || column.field,
      type: valueType,
      visible: column.visible ?? true,
      removable: column.removable ?? true,
      order: column.order,
      sourceValue,
      fetchedGroup: 'Default',
      currentGroup: 'Default',
      category: column.category,
      description: column.description,
      metadata: column.metadata
    }
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Failed to convert column:', err)
    throw err
  }
}

/**
 * Ensure a column is of the specified kind
 */
export function ensureColumnKind(
  column: ColumnConversionOptions | ColumnDef,
  kind: 'bim' | 'user'
): ColumnDef {
  if ('kind' in column && column.kind === kind) {
    return column
  }
  return kind === 'bim' ? toBimColumn(column) : toUserColumn(column)
}
