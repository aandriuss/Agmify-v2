import type { ElementData } from '../types'
import { debug, DebugCategories } from '../utils/debug'
import { parentCategories, childCategories } from '../config/categories'

interface FilterElementsOptions {
  allElements: ElementData[]
  selectedParent: string[]
  selectedChild: string[]
  essentialFieldsOnly?: boolean
}

interface FilterElementsResult {
  filteredElements: ElementData[]
}

function determineElementType(
  element: ElementData,
  selectedParent: string[],
  selectedChild: string[]
): 'parent' | 'child' {
  // If no categories are selected, treat all elements as parents
  if (selectedParent.length === 0 && selectedChild.length === 0) {
    return 'parent'
  }

  // Check if element's category is in parent or child categories
  const isParentCategory = parentCategories.includes(element.category)
  const isChildCategory = childCategories.includes(element.category)

  // If element's category is in parent categories or is Uncategorized, treat as parent
  if (isParentCategory || element.category === 'Uncategorized') {
    return 'parent'
  }

  // If element's category is in child categories, treat as child
  if (isChildCategory) {
    return 'child'
  }

  // Default to parent for any other cases
  return 'parent'
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
    if (
      element.mark &&
      determineElementType(element, selectedParent, selectedChild) === 'parent'
    ) {
      parentMarkMap.set(element.mark, element)
    }
  })

  // Flatten all elements and mark them based on selected categories
  const flattenedElements = allElements.reduce<ElementData[]>((acc, element) => {
    const elementType = determineElementType(element, selectedParent, selectedChild)
    const isParent = elementType === 'parent'

    // Add the main element if it matches the selected categories
    if (
      (isParent &&
        (selectedParent.length === 0 || selectedParent.includes(element.category))) ||
      (!isParent &&
        (selectedChild.length === 0 || selectedChild.includes(element.category)))
    ) {
      acc.push({
        ...element,
        isChild: !isParent,
        _visible: true
      })
    }

    // Add details as separate elements if they match categories
    element.details?.forEach((detail) => {
      const detailType = determineElementType(detail, selectedParent, selectedChild)
      const isDetailParent = detailType === 'parent'

      if (
        (isDetailParent &&
          (selectedParent.length === 0 || selectedParent.includes(detail.category))) ||
        (!isDetailParent &&
          (selectedChild.length === 0 || selectedChild.includes(detail.category)))
      ) {
        acc.push({
          ...detail,
          host: detail.host || element.mark, // Ensure host is set
          isChild: !isDetailParent,
          _visible: true
        })
      }
    })

    return acc
  }, [])

  // Filter out child elements that don't have a valid parent
  const validElements = flattenedElements.filter((element) => {
    if (element.isChild) {
      return element.host && parentMarkMap.has(element.host)
    }
    return true
  })

  // When essentialFieldsOnly is true, only include necessary fields
  const filteredElements = validElements.map((element) =>
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
