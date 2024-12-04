import { ref, computed, type Ref } from 'vue'
import { debug, DebugCategories } from '../debug/useDebug'
import { useStore } from '../core/store'
import { defaultTable } from '../config/defaultColumns'
import type {
  CategoryHierarchy,
  CategoryState,
  CategoryMutations
} from '../features/categories/types'
import type { ElementData } from '~/composables/core/types'

interface UseScheduleCategoriesOptions {
  initialState?: Partial<CategoryState>
  defaultParentCategories?: string[]
  defaultChildCategories?: string[]
  onUpdate?: (state: CategoryState) => Promise<void>
}

export interface UseScheduleCategoriesReturn extends CategoryState {
  selectedParentCategoriesValue: Ref<string[]>
  selectedChildCategoriesValue: Ref<string[]>
  selectedParentCategories: ComputedRef<string[]>
  selectedChildCategories: ComputedRef<string[]>
  hierarchy: Ref<CategoryHierarchy>
  isUpdating: Ref<boolean>
  error: Ref<Error | null>
  hasSelectedCategories: Ref<boolean>

  // Mutations
  toggleCategory: CategoryMutations['toggleCategory']
  setHierarchy: CategoryMutations['setHierarchy']
  setCategories: CategoryMutations['setCategories']

  // Actions
  loadCategories: (parent: string[], child: string[]) => Promise<void>
  updateHierarchy: (hierarchy: CategoryHierarchy) => Promise<void>
  updateCategories: (elements: ElementData[]) => Promise<void>
  handleCategoryToggle: (type: 'parent' | 'child', category: string) => Promise<void>
}

const defaultHierarchy: CategoryHierarchy = {
  nodes: [],
  edges: []
}

export function useScheduleCategories(
  options: UseScheduleCategoriesOptions = {}
): UseScheduleCategoriesReturn {
  const store = useStore()

  // Initialize with defaults if no options provided
  const defaultOptions = {
    defaultParentCategories: defaultTable.categoryFilters.selectedParentCategories,
    defaultChildCategories: defaultTable.categoryFilters.selectedChildCategories,
    ...options
  }

  // Internal state
  const selectedParentCategories = ref<string[]>([])
  const selectedChildCategories = ref<string[]>([])
  const hierarchy = ref<CategoryHierarchy>(defaultHierarchy)
  const isUpdating = ref(false)
  const error = ref<Error | null>(null)

  // Computed
  const hasSelectedCategories = computed(
    () =>
      selectedParentCategories.value.length > 0 ||
      selectedChildCategories.value.length > 0
  )

  // Initialize with provided state
  if (defaultOptions.initialState) {
    selectedParentCategories.value =
      defaultOptions.initialState.selectedParentCategories || []
    selectedChildCategories.value =
      defaultOptions.initialState.selectedChildCategories || []
    hierarchy.value = defaultOptions.initialState.hierarchy || defaultHierarchy
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

    toggleCategory: async (type: 'parent' | 'child', id: string) => {
      try {
        const categories =
          type === 'parent' ? selectedParentCategories : selectedChildCategories
        const currentCategories = [...categories.value]
        const index = currentCategories.indexOf(id)

        if (index === -1) {
          currentCategories.push(id)
        } else {
          currentCategories.splice(index, 1)
        }

        categories.value = currentCategories

        await store.lifecycle.update({
          selectedParentCategories: selectedParentCategories.value,
          selectedChildCategories: selectedChildCategories.value
        })

        debug.log(DebugCategories.CATEGORIES, 'Category toggled', {
          type,
          category: id,
          currentState: {
            parent: selectedParentCategories.value,
            child: selectedChildCategories.value
          }
        })
      } catch (err) {
        error.value =
          err instanceof Error ? err : new Error('Failed to toggle category')
        debug.error(DebugCategories.CATEGORIES, 'Error toggling category:', err)
        throw error.value
      }
    }
  }

  // Actions
  async function loadCategories(parent: string[], child: string[]) {
    debug.log(DebugCategories.CATEGORIES, 'Loading categories:', { parent, child })
    try {
      isUpdating.value = true
      error.value = null

      mutations.setCategories(parent, child)

      await store.lifecycle.update({
        selectedParentCategories: parent,
        selectedChildCategories: child
      })

      if (defaultOptions.onUpdate) {
        await defaultOptions.onUpdate({
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

      if (defaultOptions.onUpdate) {
        await defaultOptions.onUpdate({
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

  async function updateCategories(elements: ElementData[]) {
    try {
      isUpdating.value = true
      error.value = null

      await store.lifecycle.update({
        selectedParentCategories: selectedParentCategories.value,
        selectedChildCategories: selectedChildCategories.value
      })

      debug.log(DebugCategories.CATEGORIES, 'Categories updated', {
        parentCategories: selectedParentCategories.value,
        childCategories: selectedChildCategories.value,
        elementCount: elements.length
      })
    } catch (err) {
      error.value =
        err instanceof Error ? err : new Error('Failed to update categories')
      debug.error(DebugCategories.CATEGORIES, 'Error updating categories:', err)
      throw error.value
    } finally {
      isUpdating.value = false
    }
  }

  // Initialize with defaults if no initial state
  if (!defaultOptions.initialState) {
    loadCategories(
      defaultOptions.defaultParentCategories,
      defaultOptions.defaultChildCategories
    ).catch((err) => {
      debug.error(DebugCategories.CATEGORIES, 'Failed to load default categories:', err)
    })
  }

  return {
    // State
    selectedParentCategoriesValue: selectedParentCategories,
    selectedChildCategoriesValue: selectedChildCategories,
    selectedParentCategories: computed(() => selectedParentCategories.value),
    selectedChildCategories: computed(() => selectedChildCategories.value),
    hierarchy,
    isUpdating: computed(() => isUpdating.value),
    error,
    hasSelectedCategories: computed(
      () =>
        selectedParentCategories.value.length > 0 ||
        selectedChildCategories.value.length > 0
    ),

    // Mutations
    ...mutations,

    // Actions
    loadCategories,
    updateHierarchy,
    updateCategories,
    handleCategoryToggle: mutations.toggleCategory
  }
}
