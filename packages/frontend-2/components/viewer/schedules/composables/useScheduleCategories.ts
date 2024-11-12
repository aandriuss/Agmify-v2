import { ref } from 'vue'
import type { Ref } from 'vue'
import { debug, DebugCategories } from '../utils/debug'
import {
  parentCategories as defaultParentCategories,
  childCategories as defaultChildCategories
} from '../config/categories'

interface UseScheduleCategoriesOptions {
  updateCategories: (
    parentCategories: string[],
    childCategories: string[]
  ) => Promise<void>
  isInitialized?: Ref<boolean>
}

// Validation function for category state
function validateCategories(categories: string[]): boolean {
  if (!Array.isArray(categories)) {
    debug.warn(DebugCategories.VALIDATION, 'Invalid category array:', {
      value: categories,
      type: typeof categories
    })
    return false
  }

  const allValid = categories.every((cat) => typeof cat === 'string' && cat.length > 0)
  if (!allValid) {
    debug.warn(DebugCategories.VALIDATION, 'Invalid category values:', {
      categories,
      invalidItems: categories.filter((cat) => typeof cat !== 'string' || !cat.length)
    })
  }

  return allValid
}

export function useScheduleCategories(options: UseScheduleCategoriesOptions) {
  const { updateCategories } = options

  // Initialize with empty selections - will be loaded from PostgreSQL
  const selectedParentCategories = ref<string[]>([])
  const selectedChildCategories = ref<string[]>([])
  const loadingError = ref<Error | null>(null)

  async function toggleCategory(type: 'parent' | 'child', category: string) {
    debug.log(DebugCategories.CATEGORIES, 'Toggle requested:', {
      type,
      category,
      currentState: {
        parent: selectedParentCategories.value,
        child: selectedChildCategories.value
      }
    })

    try {
      // Validate category before proceeding
      if (!category || typeof category !== 'string') {
        throw new Error('Invalid category value')
      }

      let updatedParentCategories = [...selectedParentCategories.value]
      let updatedChildCategories = [...selectedChildCategories.value]

      if (type === 'parent') {
        const index = selectedParentCategories.value.indexOf(category)
        if (index === -1) {
          // Adding a category
          updatedParentCategories = [...selectedParentCategories.value, category]
        } else {
          // Removing a category
          updatedParentCategories = selectedParentCategories.value.filter(
            (cat) => cat !== category
          )
        }
      } else {
        const index = selectedChildCategories.value.indexOf(category)
        if (index === -1) {
          // Adding a category
          updatedChildCategories = [...selectedChildCategories.value, category]
        } else {
          // Removing a category
          updatedChildCategories = selectedChildCategories.value.filter(
            (cat) => cat !== category
          )
        }
      }

      // Validate updated categories
      if (
        !validateCategories(updatedParentCategories) ||
        !validateCategories(updatedChildCategories)
      ) {
        throw new Error('Invalid category state after update')
      }

      // Update local state first
      selectedParentCategories.value = updatedParentCategories
      selectedChildCategories.value = updatedChildCategories

      debug.log(DebugCategories.CATEGORIES, 'Local state updated:', {
        selected: {
          parent: selectedParentCategories.value,
          child: selectedChildCategories.value
        }
      })

      // Let parent handle saving to PostgreSQL
      await updateCategories(
        selectedParentCategories.value,
        selectedChildCategories.value
      )

      debug.log(DebugCategories.CATEGORIES, 'Parent notified of update')
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Toggle failed:', err)
      loadingError.value =
        err instanceof Error ? err : new Error('Failed to toggle category')
      throw loadingError.value
    }
  }

  // Reset categories to empty state
  function resetCategories() {
    debug.log(DebugCategories.CATEGORIES, 'Resetting categories to empty state')
    selectedParentCategories.value = []
    selectedChildCategories.value = []
  }

  // Set categories with validation (used when loading from PostgreSQL)
  function setCategories(parent: string[], child: string[]) {
    debug.log(DebugCategories.CATEGORIES, 'Setting categories from PostgreSQL:', {
      parent,
      child
    })

    try {
      if (!validateCategories(parent) || !validateCategories(child)) {
        throw new Error('Invalid categories provided')
      }

      // Only update local state - no need to save back to PostgreSQL
      selectedParentCategories.value = parent
      selectedChildCategories.value = child

      debug.log(DebugCategories.CATEGORIES, 'Categories set from PostgreSQL')
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to set categories:', err)
      loadingError.value =
        err instanceof Error ? err : new Error('Failed to set categories')
      throw loadingError.value
    }
  }

  return {
    selectedParentCategories,
    selectedChildCategories,
    loadingError,
    toggleCategory,
    resetCategories,
    setCategories,
    availableParentCategories: defaultParentCategories,
    availableChildCategories: defaultChildCategories
  }
}
