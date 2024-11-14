import { ref, type Ref } from 'vue'
import type { ElementData } from '../types'
import { debug, DebugCategories } from '../utils/debug'
import { parentCategories, childCategories } from '../config/categories'
import { matchesCategory } from '../config/categoryMapping'

interface UseElementCategoriesOptions {
  allElements: ElementData[]
  selectedParent?: string[]
  selectedChild?: string[]
}

interface UseElementCategoriesReturn {
  filteredElements: ElementData[]
  selectedParentCategories: Ref<string[]>
  selectedChildCategories: Ref<string[]>
  availableParentCategories: Set<string>
  availableChildCategories: Set<string>
  toggleParentCategory: (category: string) => void
  toggleChildCategory: (category: string) => void
  resetCategories: () => void
  stopCategoryWatch: () => void
}

export function useElementCategories({
  allElements,
  selectedParent = [],
  selectedChild = []
}: UseElementCategoriesOptions): UseElementCategoriesReturn {
  // Category state
  const selectedParentCategories = ref<string[]>(selectedParent)
  const selectedChildCategories = ref<string[]>(selectedChild)

  // Get available categories from elements
  const availableParentCategories = new Set<string>()
  const availableChildCategories = new Set<string>()

  // Process parent categories
  allElements.forEach((element) => {
    parentCategories.forEach((category) => {
      if (matchesCategory(element.type || '', category)) {
        availableParentCategories.add(category)
      }
    })
  })

  // Process child categories
  allElements.forEach((element) => {
    if (element.details) {
      element.details.forEach((child) => {
        childCategories.forEach((category) => {
          if (matchesCategory(child.type || '', category)) {
            availableChildCategories.add(category)
          }
        })
      })
    }
  })

  // Filter elements based on selected categories
  const filteredElements = allElements.reduce<ElementData[]>((acc, element) => {
    const isParentVisible =
      selectedParentCategories.value.length === 0 ||
      selectedParentCategories.value.some((category) =>
        matchesCategory(element.type || '', category)
      )

    const visibleDetails = (element.details || []).filter(
      (child) =>
        selectedChildCategories.value.length === 0 ||
        selectedChildCategories.value.some((category) =>
          matchesCategory(child.type || '', category)
        )
    )

    if (!isParentVisible && visibleDetails.length === 0) {
      return acc
    }

    const filteredElement: ElementData = {
      ...element,
      details: visibleDetails,
      _visible: true
    }

    acc.push(filteredElement)
    return acc
  }, [])

  // Category toggle functions
  function toggleParentCategory(category: string) {
    const index = selectedParentCategories.value.indexOf(category)
    if (index === -1) {
      selectedParentCategories.value = [...selectedParentCategories.value, category]
    } else {
      selectedParentCategories.value = selectedParentCategories.value.filter(
        (cat) => cat !== category
      )
    }

    debug.log(DebugCategories.CATEGORIES, 'Parent category toggled', {
      category,
      selectedParentCategories: selectedParentCategories.value
    })
  }

  function toggleChildCategory(category: string) {
    const index = selectedChildCategories.value.indexOf(category)
    if (index === -1) {
      selectedChildCategories.value = [...selectedChildCategories.value, category]
    } else {
      selectedChildCategories.value = selectedChildCategories.value.filter(
        (cat) => cat !== category
      )
    }

    debug.log(DebugCategories.CATEGORIES, 'Child category toggled', {
      category,
      selectedChildCategories: selectedChildCategories.value
    })
  }

  function resetCategories() {
    selectedParentCategories.value = []
    selectedChildCategories.value = []
    debug.log(DebugCategories.CATEGORIES, 'Categories reset')
  }

  // No need for watch since we're just filtering
  const stopCategoryWatch = () => {
    // Nothing to clean up
  }

  return {
    filteredElements,
    selectedParentCategories,
    selectedChildCategories,
    availableParentCategories,
    availableChildCategories,
    toggleParentCategory,
    toggleChildCategory,
    resetCategories,
    stopCategoryWatch
  }
}
