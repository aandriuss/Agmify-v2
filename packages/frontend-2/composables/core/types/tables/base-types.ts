import type { BaseItem } from '../common/base-types'

/**
 * Base table row interface
 * Defines core requirements for table functionality
 */
export interface BaseTableRow extends BaseItem {
  [key: string]: unknown
}
