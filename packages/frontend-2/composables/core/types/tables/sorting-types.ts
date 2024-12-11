import type { Ref } from 'vue'
import type { ColumnDef } from '~/composables/core/types'

/**
 * Sort by field type
 */
export type SortByField = 'name' | 'category' | 'type' | 'fixed' | 'order'
export type SortDirection = 'asc' | 'desc'

/**
 * Sort by interface
 */
export interface SortBy {
  field: string
  direction: SortDirection
}

/**
 * Use columns options interface
 */
export interface UseColumnsOptions {
  initialColumns: ColumnDef[]
  searchTerm?: Ref<string>
  isGrouped?: Ref<boolean>
  sortBy?: Ref<SortByField>
  selectedCategories?: Ref<string[]>
  onUpdate?: (columns: ColumnDef[]) => void
}

/**
 * Category filters interface
 */
export interface CategoryFilters {
  selectedParentCategories: string[]
  selectedChildCategories: string[]
}
