import { ref, computed, watch, type Ref } from 'vue'
import type { ElementData } from '../types'
import { debug, DebugCategories } from '../utils/debug'
import { parentCategories, childCategories } from '../config/categories'
import { matchesCategory } from '../config/categoryMapping'

interface UseElementCategoriesOptions {
  allElements: ElementData[]
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
  allElements
}: UseElementCategoriesOptions): UseElementCategoriesReturn {
  // Category state
  const selectedParentCategories = ref<string[]>([])
  const selectedChildCategories = ref<string[]>([])

  // Available categories based on actual data
  const availableParentCategories = computed(() => {
    const categories = new Set<string>()
    allElements.forEach((element) => {
      parentCategories.forEach((category) => {
        if (matchesCategory(element.type || '', category)) {
          categories.add(category)
        }
      })
    })
    return categories
  })

  const availableChildCategories = computed(() => {
    const categories = new Set<string>()
    allElements.forEach((element) => {
      if (element.details) {
        element.details.forEach((child) => {
          childCategories.forEach((category) => {
            if (matchesCategory(child.type || '', category)) {
              categories.add(category)
            }
          })
        })
      }
    })
    return categories
  })

  // Filtered elements based on selected categories
  const filteredElements = computed<ElementData[]>(() => {
    // If no categories selected, return all elements
    if (
      selectedParentCategories.value.length === 0 &&
      selectedChildCategories.value.length === 0
    ) {
      return allElements
    }

    return allElements.reduce<ElementData[]>((acc, element) => {
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
  })

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
      selectedParentCategories: selectedParentCategories.value,
      filteredCount: filteredElements.value.length
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
      selectedChildCategories: selectedChildCategories.value,
      filteredCount: filteredElements.value.length
    })
  }

  function resetCategories() {
    selectedParentCategories.value = []
    selectedChildCategories.value = []
    debug.log(DebugCategories.CATEGORIES, 'Categories reset')
  }

  // Watch for changes in allElements to update available categories
  const stopCategoryWatch = watch(
    () => allElements,
    () => {
      debug.log(DebugCategories.CATEGORIES, 'Available categories updated', {
        parentCategories: [...availableParentCategories.value],
        childCategories: [...availableChildCategories.value]
      })
    },
    { deep: true }
  )

  return {
    filteredElements: filteredElements.value,
    selectedParentCategories,
    selectedChildCategories,
    availableParentCategories: availableParentCategories.value,
    availableChildCategories: availableChildCategories.value,
    toggleParentCategory,
    toggleChildCategory,
    resetCategories,
    stopCategoryWatch
  }
}
