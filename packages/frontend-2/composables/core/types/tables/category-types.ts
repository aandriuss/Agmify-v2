import type { BaseTableRow } from '~/components/tables/DataTable/types'

/**
 * Category-enabled table row that extends BaseTableRow
 * Provides category-specific functionality without BIM/viewer dependencies
 */
export interface CategoryTableRow extends BaseTableRow {
  category?: string
}

/**
 * Category table state
 */
export interface CategoryTableState {
  selectedCategories: string[]
  filteredRows: CategoryTableRow[]
}

/**
 * Category table options
 */
export interface CategoryTableOptions {
  initialCategories?: string[]
  onCategoryChange?: (categories: string[]) => void
  onError?: (error: Error) => void
}
