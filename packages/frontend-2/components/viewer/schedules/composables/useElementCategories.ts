import type { ElementData } from '../types'
import { debug, DebugCategories } from '../utils/debug'
import { matchesCategory } from '../config/categoryMapping'

interface FilterElementsOptions {
  allElements: ElementData[]
  selectedParent: string[]
  selectedChild: string[]
  essentialFieldsOnly?: boolean
}

interface FilterElementsResult {
  filteredElements: ElementData[]
}

/**
 * Pure function to filter elements based on selected categories
 */
export function filterElements({
  allElements,
  selectedParent = [],
  selectedChild = [],
  essentialFieldsOnly = false
}: FilterElementsOptions): FilterElementsResult {
  debug.log(DebugCategories.CATEGORIES, 'Starting element filtering', {
    totalElements: allElements.length,
    selectedParent,
    selectedChild,
    essentialFieldsOnly
  })

  // Create a map of parent marks for quick lookup
  const parentMarkMap = new Map<string, ElementData>()
  allElements.forEach((element) => {
    if (element.mark) {
      parentMarkMap.set(element.mark, element)
    }
  })

  // Flatten all elements and mark them based on selected categories
  const flattenedElements = allElements.reduce<ElementData[]>((acc, element) => {
    // Check if element matches parent or child categories
    const isParentMatch =
      selectedParent.length === 0 ||
      selectedParent.some((category) => matchesCategory(element.type || '', category))
    const isChildMatch =
      selectedChild.length === 0 ||
      selectedChild.some((category) => matchesCategory(element.type || '', category))

    // Add the main element if it matches either category
    if (isParentMatch || isChildMatch) {
      acc.push({
        ...element,
        isChild: isChildMatch && !isParentMatch, // Mark as child if only matches child categories
        _visible: true
      })
    }

    // Add details as separate elements if they match categories
    element.details?.forEach((detail) => {
      const isDetailParentMatch =
        selectedParent.length === 0 ||
        selectedParent.some((category) => matchesCategory(detail.type || '', category))
      const isDetailChildMatch =
        selectedChild.length === 0 ||
        selectedChild.some((category) => matchesCategory(detail.type || '', category))

      if (isDetailParentMatch || isDetailChildMatch) {
        acc.push({
          ...detail,
          host: detail.host || element.mark, // Ensure host is set
          isChild: isDetailChildMatch && !isDetailParentMatch,
          _visible: true
        })
      }
    })

    return acc
  }, [])

  // When essentialFieldsOnly is true, only include necessary fields
  const filteredElements = flattenedElements.map((element) =>
    essentialFieldsOnly
      ? {
          id: element.id,
          mark: element.mark,
          category: element.category,
          type: element.type,
          host: element.host,
          isChild: element.isChild,
          _visible: true
        }
      : element
  )

  debug.log(DebugCategories.CATEGORIES, 'Elements filtered', {
    totalElements: allElements.length,
    filteredCount: filteredElements.length,
    selectedParent,
    selectedChild,
    essentialFieldsOnly,
    filteredCategories: [...new Set(filteredElements.map((el) => el.category))],
    parentCount: filteredElements.filter((el) => !el.isChild).length,
    childCount: filteredElements.filter((el) => el.isChild).length
  })

  return {
    filteredElements
  }
}
