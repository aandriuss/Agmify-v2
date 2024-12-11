import type { BaseTableRow } from './base-types'
import type { ParameterValue } from '../parameters'
import type { TableParameter } from './parameter-table-types'
import type { CategoryTableRow } from './category-types'

/**
 * Schedule row interface
 * Defines common schedule row functionality
 */
export interface ScheduleRow extends BaseTableRow {
  name: string
  type: string
  category?: string
  sourceValue?: unknown
  equation?: string
  kind?: string
  parameters: Record<string, ParameterValue>
  metadata?: Record<string, unknown>
  visible: boolean
  selected?: boolean
}

/**
 * Conversion functions
 */

/**
 * Convert TableParameter to ScheduleRow
 */
export function toScheduleRow(param: TableParameter): ScheduleRow {
  return {
    id: param.id,
    name: param.name,
    type: param.type,
    field: param.field,
    header: param.header,
    visible: param.visible,
    removable: param.removable,
    order: param.order,
    category: param.category,
    kind: param.kind,
    parameters: {},
    selected: false,
    metadata: param.metadata
  }
}

/**
 * Convert ScheduleRow to CategoryTableRow
 */
export function scheduleRowToCategoryRow(row: ScheduleRow): CategoryTableRow {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    field: row.field,
    header: row.header,
    visible: row.visible,
    removable: row.removable,
    order: row.order,
    category: row.category,
    parameters: row.parameters,
    metadata: row.metadata
  }
}

/**
 * Type guards
 */
export function isScheduleRow(value: unknown): value is ScheduleRow {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    'type' in value &&
    'parameters' in value &&
    'visible' in value
  )
}
