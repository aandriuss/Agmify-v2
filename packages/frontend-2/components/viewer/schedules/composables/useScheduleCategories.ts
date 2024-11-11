import { ref, watch, watchEffect } from 'vue'
import type { Ref } from 'vue'
import { debug } from '../utils/debug'
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
    debug.warn('[Categories] Invalid category array:', {
      value: categories,
      type: typeof categories
    })
    return false
  }

  const allValid = categories.every((cat) => typeof cat === 'string' && cat.length > 0)
  if (!allValid) {
    debug.warn('[Categories] Invalid category values:', {
      categories,
      invalidItems: categories.filter((cat) => typeof cat !== 'string' || !cat.length)
    })
  }

  return allValid
}

export function useScheduleCategories(options: UseScheduleCategoriesOptions) {
  const { updateCategories, isInitialized } = options

  debug.log('[Categories] Starting with options:', {
    hasInitializedRef: !!isInitialized,
    isInitializedValue: isInitialized?.value,
    timestamp: new Date().toISOString()
  })

  // Initialize with empty arrays - categories will be set by table config
  const selectedParentCategories = ref<string[]>([])
  const selectedChildCategories = ref<string[]>([])
  const loadingError = ref<Error | null>(null)

  // Watch for initialization state
  watchEffect(() => {
    debug.log('[Categories] Initialization state changed:', {
      isInitialized: isInitialized?.value,
      selectedCategories: {
        parent: selectedParentCategories.value,
        child: selectedChildCategories.value
      },
      timestamp: new Date().toISOString()
    })
  })

  // Watch for category changes
  watch(
    () => selectedParentCategories.value,
    (newCategories) => {
      debug.log('[Categories] Parent categories changed:', {
        count: newCategories.length,
        categories: newCategories,
        isInitialized: isInitialized?.value,
        timestamp: new Date().toISOString()
      })
    }
  )

  watch(
    () => selectedChildCategories.value,
    (newCategories) => {
      debug.log('[Categories] Child categories changed:', {
        count: newCategories.length,
        categories: newCategories,
        isInitialized: isInitialized?.value,
        timestamp: new Date().toISOString()
      })
    }
  )

  async function toggleCategory(type: 'parent' | 'child', category: string) {
    debug.log('[Categories] Toggle requested:', {
      type,
      category,
      currentState: {
        parent: selectedParentCategories.value,
        child: selectedChildCategories.value
      },
      isInitialized: isInitialized?.value,
      timestamp: new Date().toISOString()
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
          debug.log('[Categories] Added parent category:', {
            category,
            newState: updatedParentCategories
          })
        } else {
          // Removing a category
          updatedParentCategories = selectedParentCategories.value.filter(
            (cat) => cat !== category
          )
          debug.log('[Categories] Removed parent category:', {
            category,
            newState: updatedParentCategories
          })
        }
      } else {
        const index = selectedChildCategories.value.indexOf(category)
        if (index === -1) {
          // Adding a category
          updatedChildCategories = [...selectedChildCategories.value, category]
          debug.log('[Categories] Added child category:', {
            category,
            newState: updatedChildCategories
          })
        } else {
          // Removing a category
          updatedChildCategories = selectedChildCategories.value.filter(
            (cat) => cat !== category
          )
          debug.log('[Categories] Removed child category:', {
            category,
            newState: updatedChildCategories
          })
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

      debug.log('[Categories] State after toggle:', {
        selected: {
          parent: selectedParentCategories.value,
          child: selectedChildCategories.value
        }
      })

      // Only update data if initialized
      if (isInitialized?.value) {
        await updateCategories(
          selectedParentCategories.value,
          selectedChildCategories.value
        )
        debug.log('[Categories] Update completed')
      } else {
        debug.log('[Categories] Update skipped - not initialized')
      }
    } catch (err) {
      debug.error('[Categories] Toggle failed:', err)
      loadingError.value =
        err instanceof Error ? err : new Error('Failed to toggle category')
      throw loadingError.value
    }
  }

  // Reset categories to empty arrays
  function resetCategories() {
    debug.log('[Categories] Resetting categories')
    selectedParentCategories.value = []
    selectedChildCategories.value = []
  }

  // Set categories with validation
  async function setCategories(parent: string[], child: string[]) {
    debug.log('[Categories] Setting categories:', {
      parent,
      child,
      isInitialized: isInitialized?.value
    })

    try {
      if (!validateCategories(parent) || !validateCategories(child)) {
        throw new Error('Invalid categories provided')
      }

      selectedParentCategories.value = parent
      selectedChildCategories.value = child

      if (isInitialized?.value) {
        await updateCategories(parent, child)
        debug.log('[Categories] Categories set and updated')
      } else {
        debug.log('[Categories] Categories set but update skipped - not initialized')
      }
    } catch (err) {
      debug.error('[Categories] Failed to set categories:', err)
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
