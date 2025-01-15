import { ref, computed } from 'vue'
import { debug, DebugCategories } from '../../utils/debug'

export interface TableCategoriesState {
  selectedParentCategories: string[]
  selectedChildCategories: string[]
}

export interface TableCategoriesOptions {
  initialState?: Partial<TableCategoriesState>
  onUpdate?: (state: TableCategoriesState) => Promise<void>
  onError?: (error: Error) => void
}

const defaultState: TableCategoriesState = {
  selectedParentCategories: [],
  selectedChildCategories: []
}

/**
 * Core table categories composable
 * Handles category selection and filtering for tables
 */
export function useTableCategories(options: TableCategoriesOptions = {}) {
  const { initialState, onUpdate, onError } = options

  // Initialize state
  const internalState = ref<TableCategoriesState>({
    ...defaultState,
    ...initialState
  })

  // Computed properties
  const selectedParentCategories = computed(
    () => internalState.value.selectedParentCategories
  )
  const selectedChildCategories = computed(
    () => internalState.value.selectedChildCategories
  )
  const hasSelectedCategories = computed(
    () =>
      selectedParentCategories.value.length > 0 ||
      selectedChildCategories.value.length > 0
  )

  /**
   * Load categories from provided arrays
   */
  async function loadCategories(
    parentCategories: string[] = [],
    childCategories: string[] = []
  ) {
    try {
      debug.startState(DebugCategories.CATEGORIES, 'Loading categories', {
        parentCount: parentCategories.length,
        childCount: childCategories.length
      })

      internalState.value = {
        selectedParentCategories: [...parentCategories],
        selectedChildCategories: [...childCategories]
      }

      if (onUpdate) {
        await onUpdate(internalState.value)
      }

      debug.completeState(DebugCategories.CATEGORIES, 'Categories loaded')
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load categories')
      debug.error(DebugCategories.ERROR, 'Error loading categories:', error)
      onError?.(error)
      throw error
    }
  }

  /**
   * Toggle category selection
   */
  async function handleCategoryToggle(type: 'parent' | 'child', category: string) {
    try {
      debug.startState(DebugCategories.CATEGORIES, 'Toggling category', {
        type,
        category
      })

      if (type === 'parent') {
        const newCategories = [...internalState.value.selectedParentCategories]
        const index = newCategories.indexOf(category)
        if (index === -1) {
          newCategories.push(category)
        } else {
          newCategories.splice(index, 1)
        }
        internalState.value = {
          ...internalState.value,
          selectedParentCategories: newCategories
        }
      } else {
        const newCategories = [...internalState.value.selectedChildCategories]
        const index = newCategories.indexOf(category)
        if (index === -1) {
          newCategories.push(category)
        } else {
          newCategories.splice(index, 1)
        }
        internalState.value = {
          ...internalState.value,
          selectedChildCategories: newCategories
        }
      }

      if (onUpdate) {
        await onUpdate(internalState.value)
      }

      debug.completeState(DebugCategories.CATEGORIES, 'Category toggled')
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to toggle category')
      debug.error(DebugCategories.ERROR, 'Error toggling category:', error)
      onError?.(error)
      throw error
    }
  }

  /**
   * Reset categories to initial state
   */
  async function reset() {
    try {
      debug.startState(DebugCategories.CATEGORIES, 'Resetting categories')

      internalState.value = { ...defaultState }

      if (onUpdate) {
        await onUpdate(internalState.value)
      }

      debug.completeState(DebugCategories.CATEGORIES, 'Categories reset')
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to reset categories')
      debug.error(DebugCategories.ERROR, 'Error resetting categories:', error)
      onError?.(error)
      throw error
    }
  }

  return {
    // State
    selectedParentCategories,
    selectedChildCategories,
    hasSelectedCategories,

    // Methods
    loadCategories,
    handleCategoryToggle,
    reset
  }
}
