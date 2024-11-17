import { ref, type Ref } from 'vue'
import { debug, DebugCategories } from '../utils/debug'
import type {
  CategoryHierarchy,
  CategoryState,
  CategoryMutations
} from '../features/categories/types'

interface UseScheduleCategoriesOptions {
  // Initial state
  initialState?: Partial<CategoryState>
  // Default categories (moved from config)
  defaultParentCategories?: string[]
  defaultChildCategories?: string[]
  // Update callback
  onUpdate?: (state: CategoryState) => Promise<void>
}

export interface UseScheduleCategoriesReturn {
  // Readonly state
  selectedParentCategories: Ref<string[]>
  selectedChildCategories: Ref<string[]>
  hierarchy: Ref<CategoryHierarchy>
  isUpdating: Ref<boolean>
  error: Ref<Error | null>

  // Mutations
  toggleCategory: CategoryMutations['toggleCategory']
  setHierarchy: CategoryMutations['setHierarchy']
  setCategories: CategoryMutations['setCategories']

  // Actions
  loadCategories: (parent: string[], child: string[]) => Promise<void>
  updateHierarchy: (hierarchy: CategoryHierarchy) => Promise<void>
}

const defaultHierarchy: CategoryHierarchy = {
  nodes: [],
  edges: []
}

export function useScheduleCategories(
  options: UseScheduleCategoriesOptions = {}
): UseScheduleCategoriesReturn {
  // Validate options
  if (
    !options.defaultParentCategories?.length &&
    !options.defaultChildCategories?.length
  ) {
    debug.warn(DebugCategories.CATEGORIES, 'No default categories provided')
  }

  // Internal state
  const selectedParentCategories = ref<string[]>([])
  const selectedChildCategories = ref<string[]>([])
  const hierarchy = ref<CategoryHierarchy>(defaultHierarchy)
  const isUpdating = ref(false)
  const error = ref<Error | null>(null)

  // Initialize with provided state
  if (options.initialState) {
    selectedParentCategories.value = options.initialState.selectedParentCategories || []
    selectedChildCategories.value = options.initialState.selectedChildCategories || []
    hierarchy.value = options.initialState.hierarchy || defaultHierarchy
  }

  // Mutations
  const mutations: CategoryMutations = {
    setCategories: (parent: string[], child: string[]) => {
      debug.log(DebugCategories.CATEGORIES, 'Setting categories:', { parent, child })
      selectedParentCategories.value = parent
      selectedChildCategories.value = child
    },

    setHierarchy: (newHierarchy: CategoryHierarchy) => {
      debug.log(DebugCategories.CATEGORIES, 'Setting hierarchy:', newHierarchy)
      hierarchy.value = newHierarchy
    },

    toggleCategory: (type: 'parent' | 'child', id: string) => {
      debug.log(DebugCategories.CATEGORIES, 'Toggle requested:', {
        type,
        id,
        currentState: {
          parent: selectedParentCategories.value,
          child: selectedChildCategories.value
        }
      })

      const categories =
        type === 'parent' ? selectedParentCategories : selectedChildCategories

      const index = categories.value.indexOf(id)
      if (index === -1) {
        categories.value = [...categories.value, id]
      } else {
        categories.value = categories.value.filter((cat) => cat !== id)
      }

      debug.log(DebugCategories.CATEGORIES, 'Local state updated:', {
        parent: selectedParentCategories.value,
        child: selectedChildCategories.value
      })
    }
  }

  // Actions
  async function loadCategories(parent: string[], child: string[]) {
    debug.log(DebugCategories.CATEGORIES, 'Loading categories:', { parent, child })
    try {
      isUpdating.value = true
      error.value = null

      mutations.setCategories(parent, child)

      if (options.onUpdate) {
        await options.onUpdate({
          selectedParentCategories: selectedParentCategories.value,
          selectedChildCategories: selectedChildCategories.value,
          hierarchy: hierarchy.value
        })
      }
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Failed to load categories')
      debug.error(DebugCategories.CATEGORIES, 'Error loading categories:', err)
      throw error.value
    } finally {
      isUpdating.value = false
    }
  }

  async function updateHierarchy(newHierarchy: CategoryHierarchy) {
    debug.log(DebugCategories.CATEGORIES, 'Updating hierarchy:', newHierarchy)
    try {
      isUpdating.value = true
      error.value = null

      mutations.setHierarchy(newHierarchy)

      if (options.onUpdate) {
        await options.onUpdate({
          selectedParentCategories: selectedParentCategories.value,
          selectedChildCategories: selectedChildCategories.value,
          hierarchy: hierarchy.value
        })
      }
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Failed to update hierarchy')
      debug.error(DebugCategories.CATEGORIES, 'Error updating hierarchy:', err)
      throw error.value
    } finally {
      isUpdating.value = false
    }
  }

  // Initialize with defaults if no initial state
  if (
    !options.initialState &&
    (options.defaultParentCategories || options.defaultChildCategories)
  ) {
    loadCategories(
      options.defaultParentCategories || [],
      options.defaultChildCategories || []
    ).catch((err) => {
      debug.error(DebugCategories.CATEGORIES, 'Failed to load default categories:', err)
    })
  }

  return {
    // Readonly state
    selectedParentCategories,
    selectedChildCategories,
    hierarchy,
    isUpdating,
    error,

    // Mutations
    ...mutations,

    // Actions
    loadCategories,
    updateHierarchy
  }
}
