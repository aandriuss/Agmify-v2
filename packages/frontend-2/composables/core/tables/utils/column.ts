import type { TableColumn } from '../../types/tables/table-column'
import { safeString, safeBoolean, safeNumber } from '../../utils/validation'

/**
 * Get display name for a column
 */
export function getColumnDisplayName(column: TableColumn): string {
  return safeString(column.header || column.field, 'Unnamed Column')
}

/**
 * Check if column is sortable
 */
export function isColumnSortable(column: TableColumn): boolean {
  return safeBoolean(column.sortable, true)
}

/**
 * Check if column is filterable
 */
export function isColumnFilterable(column: TableColumn): boolean {
  return safeBoolean(column.filterable, true)
}

/**
 * Check if column is visible
 */
export function isColumnVisible(column: TableColumn): boolean {
  return safeBoolean(column.visible, true)
}

/**
 * Get column width with default
 */
export function getColumnWidth(column: TableColumn): number {
  return safeNumber(column.width, 150)
}

/**
 * Get column order with default
 */
export function getColumnOrder(column: TableColumn): number {
  return safeNumber(column.order, 0)
}
