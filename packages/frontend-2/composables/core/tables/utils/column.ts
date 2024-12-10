import type { ColumnDef, BaseColumnDef } from '../../types/tables/column-types'
import { safeString, safeBoolean, safeNumber } from '../../utils/validation'
import {
  isColumnDef as isColumnDefTypeGuard,
  createBaseColumnDef,
  createBimColumnDefWithDefaults,
  createUserColumnDefWithDefaults
} from '../../types/tables/column-types'

/**
 * Type guard for ColumnDef - re-export from types
 */
export { isColumnDefTypeGuard as isColumnDef }

/**
 * Column creation utilities - re-export from types
 */
export {
  createBaseColumnDef,
  createBimColumnDefWithDefaults,
  createUserColumnDefWithDefaults
}

/**
 * Get effective group for a column
 */
export function getColumnGroup(column: ColumnDef): string {
  if ('currentGroup' in column) {
    return safeString(column.currentGroup, 'Default')
  }
  return safeString(column.group, 'Default')
}

/**
 * Get display name for a column
 */
export function getColumnDisplayName(column: BaseColumnDef): string {
  return safeString(column.header || column.name || column.field, 'Unnamed Column')
}

/**
 * Check if column is sortable
 */
export function isColumnSortable(column: ColumnDef): boolean {
  return safeBoolean(column.sortable, true)
}

/**
 * Check if column is filterable
 */
export function isColumnFilterable(column: ColumnDef): boolean {
  return safeBoolean(column.filterable, true)
}

/**
 * Check if column is visible
 */
export function isColumnVisible(column: BaseColumnDef): boolean {
  return safeBoolean(column.visible, true)
}

/**
 * Check if column is removable
 */
export function isColumnRemovable(column: BaseColumnDef): boolean {
  return safeBoolean(column.removable, true)
}

/**
 * Get column width with default
 */
export function getColumnWidth(column: ColumnDef): number {
  return safeNumber(column.width, 150)
}

/**
 * Get column order with default
 */
export function getColumnOrder(column: BaseColumnDef): number {
  return safeNumber(column.order, 0)
}
