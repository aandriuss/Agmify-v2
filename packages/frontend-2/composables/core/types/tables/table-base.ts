import type { BaseItem } from '../common/base-types'

/**
 * Base table row interface
 * Extends BaseItem to ensure consistent base properties
 */
export interface BaseTableRow extends BaseItem {
  [key: string]: unknown
}

/**
 * Expandable table row interface
 * Extends BaseTableRow to include details for nested rows
 */
export interface ExpandableTableRow extends BaseTableRow {
  details?: BaseTableRow[]
}

/**
 * Type guard for base table row
 */
export function isBaseTableRow(value: unknown): value is BaseTableRow {
  if (!value || typeof value !== 'object') return false
  return 'id' in value && typeof (value as BaseTableRow).id === 'string'
}
