import type { ElementData } from '../types'
import { debug, DebugCategories } from '../utils/debug'
import { parentCategories, childCategories } from '../config/categories'
import { matchesCategory } from '../config/categoryMapping'

interface FilterElementsOptions {
  allElements: ElementData[]
  selectedParent: string[]
  selectedChild: string[]
  essentialFieldsOnly?: boolean
}

interface FilterElementsResult {
  filteredElements: ElementData[]
  availableParentCategories: Set<string>
  availableChildCategories: Set<string>
}

/**
 * Pure function to filter elements based on categories
 */
export function filterElements({
  allElements,
  selectedParent = [],
  selectedChild = [],
  essentialFieldsOnly = false
}: FilterElementsOptions): FilterElementsResult {
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
      selectedParent.length === 0 ||
      selectedParent.some((category) => matchesCategory(element.type || '', category))

    const visibleDetails = (element.details || []).filter(
      (child) =>
        selectedChild.length === 0 ||
        selectedChild.some((category) => matchesCategory(child.type || '', category))
    )

    if (!isParentVisible && visibleDetails.length === 0) {
      return acc
    }

    // When essentialFieldsOnly is true, only include necessary fields
    const filteredElement: ElementData = essentialFieldsOnly
      ? {
          id: element.id,
          mark: element.mark,
          category: element.category,
          type: element.type,
          details: visibleDetails.map((child) => ({
            id: child.id,
            mark: child.mark,
            category: child.category,
            type: child.type
          })),
          _visible: true
        }
      : {
          ...element,
          details: visibleDetails,
          _visible: true
        }

    acc.push(filteredElement)
    return acc
  }, [])

  debug.log(DebugCategories.CATEGORIES, 'Elements filtered', {
    totalElements: allElements.length,
    filteredCount: filteredElements.length,
    selectedParent,
    selectedChild,
    essentialFieldsOnly,
    availableParent: Array.from(availableParentCategories),
    availableChild: Array.from(availableChildCategories)
  })

  return {
    filteredElements,
    availableParentCategories,
    availableChildCategories
  }
}
