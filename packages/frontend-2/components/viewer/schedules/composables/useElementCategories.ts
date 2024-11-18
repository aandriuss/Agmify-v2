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
  // Check if element's category is in parent or child categories
  const isParentCategory = parentCategories.includes(element.category)
  const isChildCategory = childCategories.includes(element.category)

  // If element's category is in child categories, treat as child
  if (isChildCategory) {
    return 'child'
  }

  // If element's category is in parent categories or is Uncategorized, treat as parent
  if (isParentCategory || element.category === 'Uncategorized') {
    return 'parent'
  }

  // If no specific category match, check selected categories
  if (selectedChild.includes(element.category)) {
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
    essentialFieldsOnly,
    categories: [...new Set(allElements.map((el) => el.category))]
  })

  // First pass: Identify potential parents and children
  const parents: ElementData[] = []
  const children: ElementData[] = []

  allElements.forEach((element) => {
    const elementType = determineElementType(element, selectedParent, selectedChild)
    const isParent = elementType === 'parent'

    // Check if element matches selected categories
    const matchesSelectedCategories = isParent
      ? selectedParent.length === 0 || selectedParent.includes(element.category)
      : selectedChild.length === 0 || selectedChild.includes(element.category)

    if (matchesSelectedCategories) {
      if (isParent) {
        parents.push({
          ...element,
          isChild: false,
          _visible: true
        })
      } else {
        children.push({
          ...element,
          isChild: true,
          _visible: true
        })
      }
    }

    // Process details
    element.details?.forEach((detail) => {
      const detailType = determineElementType(detail, selectedParent, selectedChild)
      const isDetailParent = detailType === 'parent'

      // Check if detail matches selected categories
      const detailMatchesCategories = isDetailParent
        ? selectedParent.length === 0 || selectedParent.includes(detail.category)
        : selectedChild.length === 0 || selectedChild.includes(detail.category)

      if (detailMatchesCategories) {
        if (isDetailParent) {
          parents.push({
            ...detail,
            host: detail.host || element.mark,
            isChild: false,
            _visible: true
          })
        } else {
          children.push({
            ...detail,
            host: detail.host || element.mark,
            isChild: true,
            _visible: true
          })
        }
      }
    })
  })

  // Create a map of parent marks
  const parentMarkMap = new Map<string, ElementData>()
  parents.forEach((parent) => {
    if (parent.mark) {
      parentMarkMap.set(parent.mark, parent)
    }
  })

  // Create "Without Host" parent if needed
  const withoutHostParent: ElementData = {
    id: 'without-host',
    mark: 'Without Host',
    category: 'Uncategorized',
    type: 'group',
    parameters: {},
    details: [],
    isChild: false,
    _visible: true
  }

  // Second pass: Match children to parents or assign to "Without Host"
  const orphanedChildren: ElementData[] = []
  const matchedChildren: ElementData[] = []

  children.forEach((child) => {
    if (child.host && parentMarkMap.has(child.host)) {
      matchedChildren.push(child)
    } else {
      // Assign to "Without Host" parent
      orphanedChildren.push({
        ...child,
        host: withoutHostParent.mark
      })
    }
  })

  // Add "Without Host" parent only if there are orphaned children
  const finalElements = [...parents]
  if (orphanedChildren.length > 0) {
    finalElements.push(withoutHostParent)
  }
  finalElements.push(...matchedChildren, ...orphanedChildren)

  // When essentialFieldsOnly is true, only include necessary fields
  const filteredElements = finalElements.map((element) =>
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

  // Log detailed filtering results
  const parentCount = filteredElements.filter((el) => !el.isChild).length
  const childCount = filteredElements.filter((el) => el.isChild).length
  const categories = [...new Set(filteredElements.map((el) => el.category))]

  debug.log(DebugCategories.CATEGORIES, 'Elements filtered', {
    totalElements: allElements.length,
    filteredCount: filteredElements.length,
    selectedParent,
    selectedChild,
    essentialFieldsOnly,
    filteredCategories: categories,
    parentCount,
    childCount,
    orphanedCount: orphanedChildren.length,
    matchedCount: matchedChildren.length,
    categoryBreakdown: categories.map((cat) => ({
      category: cat,
      count: filteredElements.filter((el) => el.category === cat).length,
      isParent: parentCategories.includes(cat),
      isChild: childCategories.includes(cat)
    }))
  })

  return {
    filteredElements
  }
}
