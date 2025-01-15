import { ref, computed } from 'vue'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import { TableStateError } from '~/composables/core/types/errors'
import type { CategoryTableRow } from '~/composables/core/types/tables/category-types'

export interface UseCategoryTableStateOptions {
  onError?: (error: Error) => void
}

/**
 * Category-based table state management
 * Provides functionality for filtering and managing table rows by categories
 */
export function useCategoryTableState(options: UseCategoryTableStateOptions = {}) {
  // State
  const selectedCategories = ref<string[]>([])
  const filteredRows = ref<CategoryTableRow[]>([])

  // Computed
  const hasSelectedCategories = computed(() => selectedCategories.value.length > 0)

  /**
   * Get available categories from rows
   */
  function getAvailableCategories(rows: CategoryTableRow[]): string[] {
    const categories = new Set<string>()
    rows.forEach((row) => {
      if (row.category) {
        categories.add(row.category)
      }
    })
    return Array.from(categories).sort()
  }

  /**
   * Update selected categories
   */
  function updateCategories(categories: string[]): void {
    try {
      debug.startState(DebugCategories.TABLE_UPDATES, 'Updating categories')
      selectedCategories.value = [...categories]
      debug.completeState(DebugCategories.TABLE_UPDATES, 'Categories updated')
    } catch (err) {
      handleError(err)
    }
  }

  /**
   * Filter rows by selected categories
   */
  function filterRowsByCategories(rows: CategoryTableRow[]): void {
    try {
      debug.startState(DebugCategories.TABLE_UPDATES, 'Filtering rows by categories')

      if (!hasSelectedCategories.value) {
        filteredRows.value = []
        return
      }

      filteredRows.value = rows.filter((row) => {
        return (
          typeof row.category === 'string' &&
          selectedCategories.value.includes(row.category)
        )
      })

      debug.completeState(
        DebugCategories.TABLE_UPDATES,
        'Rows filtered by categories',
        {
          filteredCount: filteredRows.value.length,
          totalCount: rows.length
        }
      )
    } catch (err) {
      handleError(err)
    }
  }

  /**
   * Reset category state
   */
  function reset(): void {
    selectedCategories.value = []
    filteredRows.value = []
  }

  // Error handling
  function handleError(err: unknown): void {
    const error =
      err instanceof Error
        ? new TableStateError(err.message, err)
        : new TableStateError('Category table error')
    options.onError?.(error)
    debug.error(DebugCategories.ERROR, 'Category table error:', err)
  }

  return {
    // State
    selectedCategories,
    filteredRows,
    hasSelectedCategories,

    // Methods
    getAvailableCategories,
    updateCategories,
    filterRowsByCategories,
    reset
  }
}
