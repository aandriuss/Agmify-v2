import { ref, type Ref } from 'vue'
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
  selectedParentCategories?: Ref<string[]>
  selectedChildCategories?: Ref<string[]>
}

export interface UseScheduleCategoriesReturn {
  selectedParentCategories: Ref<string[]>
  selectedChildCategories: Ref<string[]>
  isUpdating: Ref<boolean>
  error: Ref<Error | null>
  toggleCategory: (type: 'parent' | 'child', category: string) => void
  loadCategories: (parent: string[], child: string[]) => void
  availableParentCategories: string[]
  availableChildCategories: string[]
}

export function useScheduleCategories(
  options: UseScheduleCategoriesOptions
): UseScheduleCategoriesReturn {
  const { updateCategories } = options

  // Use provided refs or create new ones
  const selectedParentCategories = options.selectedParentCategories || ref<string[]>([])
  const selectedChildCategories = options.selectedChildCategories || ref<string[]>([])
  const isUpdating = ref(false)
  const error = ref<Error | null>(null)

  function toggleCategory(type: 'parent' | 'child', category: string) {
    debug.log(DebugCategories.CATEGORIES, 'Toggle requested:', {
      type,
      category,
      currentState: {
        parent: selectedParentCategories.value,
        child: selectedChildCategories.value
      }
    })

    // Update local state only - persistence happens in useScheduleTable
    if (type === 'parent') {
      const index = selectedParentCategories.value.indexOf(category)
      if (index === -1) {
        selectedParentCategories.value = [...selectedParentCategories.value, category]
      } else {
        selectedParentCategories.value = selectedParentCategories.value.filter(
          (cat) => cat !== category
        )
      }
    } else {
      const index = selectedChildCategories.value.indexOf(category)
      if (index === -1) {
        selectedChildCategories.value = [...selectedChildCategories.value, category]
      } else {
        selectedChildCategories.value = selectedChildCategories.value.filter(
          (cat) => cat !== category
        )
      }
    }

    debug.log(DebugCategories.CATEGORIES, 'Local state updated:', {
      parent: selectedParentCategories.value,
      child: selectedChildCategories.value
    })
  }

  function loadCategories(parent: string[], child: string[]) {
    debug.log(DebugCategories.CATEGORIES, 'Loading categories:', {
      parent,
      child
    })

    selectedParentCategories.value = [...parent]
    selectedChildCategories.value = [...child]

    debug.log(DebugCategories.CATEGORIES, 'Categories loaded:', {
      parent: selectedParentCategories.value,
      child: selectedChildCategories.value
    })
  }

  return {
    selectedParentCategories,
    selectedChildCategories,
    isUpdating,
    error,
    toggleCategory,
    loadCategories,
    availableParentCategories: defaultParentCategories,
    availableChildCategories: defaultChildCategories
  }
}
