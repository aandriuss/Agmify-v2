import type { ElementData } from '../types'
import { debug, DebugCategories } from '../debug/useDebug'
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

function determineElementType(element: ElementData): 'parent' | 'child' {
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

  // Default uncategorized elements to parent
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

  // If no categories are selected, show all elements as parents
  const showAllAsParents = selectedParent.length === 0 && selectedChild.length === 0

  allElements.forEach((element) => {
    const elementType = showAllAsParents ? 'parent' : determineElementType(element)
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
      const detailType = showAllAsParents ? 'parent' : determineElementType(detail)
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

  // Log initial parent-child split
  debug.logRelationships(parents, children, 'Initial parent-child split')

  // Create a map of parent marks
  const parentMarkMap = new Map<string, ElementData>()
  parents.forEach((parent) => {
    if (parent.mark) {
      parentMarkMap.set(parent.mark, parent)
      debug.logRelationshipValidation(
        parent,
        true,
        `Parent element with mark '${parent.mark}' registered`
      )
    } else {
      debug.logRelationshipValidation(
        parent,
        false,
        'Parent element missing required mark value'
      )
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
      const matchedParent = parentMarkMap.get(child.host)
      matchedChildren.push(child)
      debug.logMarkHostMatch(child, matchedParent, true)
    } else {
      // Log why the child is orphaned
      if (!child.host) {
        debug.logRelationshipValidation(
          child,
          false,
          'Child element missing host value'
        )
      } else {
        debug.logRelationshipValidation(
          child,
          false,
          `No parent found with mark '${child.host}'`
        )
      }
      // Assign to "Without Host" parent
      orphanedChildren.push({
        ...child,
        host: withoutHostParent.mark
      })
      debug.logMarkHostMatch(child, undefined, false)
    }
  })

  // Add "Without Host" parent only if there are orphaned children
  const finalElements = [...parents]
  if (orphanedChildren.length > 0) {
    finalElements.push(withoutHostParent)
  }
  finalElements.push(...matchedChildren, ...orphanedChildren)

  // When essentialFieldsOnly is true, only include necessary fields but keep parameters
  const filteredElements = finalElements.map((element) =>
    essentialFieldsOnly
      ? {
          id: element.id,
          mark: element.mark,
          category: element.category,
          type: element.type,
          host: element.host,
          isChild: element.isChild,
          _visible: true,
          parameters: element.parameters // Keep parameters to satisfy ElementData interface
        }
      : element
  )

  // Log final relationship stats
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

  // Log final relationship status
  debug.logRelationships(
    filteredElements.filter((el) => !el.isChild),
    filteredElements.filter((el) => el.isChild),
    'Final relationship status'
  )

  return {
    filteredElements
  }
}
