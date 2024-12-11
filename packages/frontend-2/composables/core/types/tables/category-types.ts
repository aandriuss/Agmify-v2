import type { ViewerTableRow } from '~/composables/core/types'
import type { ParameterValue } from '~/composables/core/types/parameters'

/**
 * Category-enabled table row that extends ViewerTableRow
 * Provides category-specific functionality
 */
export interface CategoryTableRow extends ViewerTableRow {
  category?: string
  type: string
  parameters: Record<string, ParameterValue>
}
