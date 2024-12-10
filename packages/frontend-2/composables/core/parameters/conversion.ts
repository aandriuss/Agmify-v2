import type { Parameter } from '../types/parameters'
import type { ColumnDef } from '../types/tables/column-types'
import { toBimValueType, toUserValueType } from '../utils/conversion'
import {
  createBimColumnDefWithDefaults,
  createUserColumnDefWithDefaults,
  isBimColumnDef
} from '../types/tables/column-types'

/**
 * Convert parameter value to primitive value
 */
export function toPrimitiveValue(value: unknown): string | number | boolean | null {
  if (value === undefined || value === null) return null
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value
  }
  return String(value)
}

/**
 * Convert Parameter to ColumnDef
 */
export function parameterToColumnDef(param: Parameter): ColumnDef {
  if (param.kind === 'bim') {
    return createBimColumnDefWithDefaults({
      id: param.id,
      name: param.name,
      field: param.field,
      header: param.header,
      type: param.type,
      category: param.category,
      description: param.description,
      visible: param.visible,
      removable: param.removable,
      sourceValue: param.sourceValue,
      fetchedGroup: param.fetchedGroup,
      currentGroup: param.currentGroup,
      metadata: param.metadata
    })
  } else {
    return createUserColumnDefWithDefaults({
      id: param.id,
      name: param.name,
      field: param.field,
      header: param.header,
      type: param.type,
      category: param.category,
      description: param.description,
      visible: param.visible,
      removable: param.removable,
      group: param.group,
      isCustomParameter: param.isCustom ?? false,
      metadata: param.metadata
    })
  }
}

/**
 * Convert ColumnDef to Parameter
 */
export function columnDefToParameter(col: ColumnDef): Parameter {
  if (isBimColumnDef(col)) {
    return {
      kind: 'bim',
      id: col.id,
      name: col.name,
      field: col.field,
      header: col.header,
      type: toBimValueType(col.type),
      category: col.category,
      description: col.description,
      visible: col.visible,
      removable: col.removable,
      sourceValue: col.sourceValue || null,
      fetchedGroup: col.fetchedGroup,
      currentGroup: col.currentGroup,
      metadata: col.metadata,
      value: col.value
    }
  } else {
    return {
      kind: 'user',
      id: col.id,
      name: col.name,
      field: col.field,
      header: col.header,
      type: toUserValueType(col.type),
      category: col.category,
      description: col.description,
      visible: col.visible,
      removable: col.removable,
      group: col.group || 'Default',
      isCustom: col.isCustomParameter,
      metadata: col.metadata,
      value: col.value
    }
  }
}
