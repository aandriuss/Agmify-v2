import type { ElementData, CategoryDefinition } from '~/composables/core/types'
import type { CategoryHierarchy } from './relations'
import { buildCategoryHierarchy, getDescendants, getAncestors } from './relations'

// Filtering options
export interface FilterOptions {
  includeDescendants?: boolean
  includeAncestors?: boolean
  matchAll?: boolean
}

const defaultOptions: Required<FilterOptions> = {
  includeDescendants: true,
  includeAncestors: false,
  matchAll: false
}

// Filter elements by categories
export function filterElementsByCategories(
  elements: ElementData[],
  selectedCategories: Set<string>,
  categories: CategoryDefinition[],
  options: FilterOptions = {}
): ElementData[] {
  const opts = { ...defaultOptions, ...options }

  // If no categories selected, return all elements
  if (selectedCategories.size === 0) {
    return elements
  }

  // Build category hierarchy for relationship checks
  const hierarchy = buildCategoryHierarchy(categories)

  // Get expanded category set (including descendants/ancestors)
  const expandedCategories = expandCategorySet(selectedCategories, hierarchy, opts)

  // Filter elements based on expanded categories
  return elements.filter((element) =>
    opts.matchAll
      ? matchesAllCategories(element, expandedCategories)
      : matchesAnyCategory(element, expandedCategories)
  )
}

// Expand category set based on options
function expandCategorySet(
  selectedCategories: Set<string>,
  hierarchy: CategoryHierarchy[],
  options: Required<FilterOptions>
): Set<string> {
  const expanded = new Set(selectedCategories)

  for (const categoryId of selectedCategories) {
    // Add descendants if enabled
    if (options.includeDescendants) {
      const descendants = getDescendants(categoryId, hierarchy)
      for (const descendant of descendants) {
        expanded.add(descendant)
      }
    }

    // Add ancestors if enabled
    if (options.includeAncestors) {
      const ancestors = getAncestors(categoryId, hierarchy)
      for (const ancestor of ancestors) {
        expanded.add(ancestor)
      }
    }
  }

  return expanded
}

// Check if element matches any selected category
function matchesAnyCategory(element: ElementData, categories: Set<string>): boolean {
  return categories.has(element.category)
}

// Check if element matches all selected categories
function matchesAllCategories(element: ElementData, categories: Set<string>): boolean {
  return (
    categories.has(element.category) &&
    Array.from(categories).every(
      (category) =>
        category === element.category || hasRelatedCategory(element, category)
    )
  )
}

// Check if element has related category in its parameters
function hasRelatedCategory(element: ElementData, category: string): boolean {
  // Check for category-related parameters
  const categoryParams = [
    'parentCategory',
    'relatedCategory',
    'subCategory',
    'categoryGroup'
  ]

  return categoryParams.some((param) => {
    const value = element.parameters[param]
    return value === category
  })
}

// Get unique categories from elements
export function getUniqueCategories(elements: ElementData[]): Set<string> {
  return new Set(elements.map((element) => element.category))
}

// Get category statistics
export interface CategoryStats {
  id: string
  count: number
  percentage: number
}

export function getCategoryStatistics(
  elements: ElementData[],
  categories: CategoryDefinition[]
): CategoryStats[] {
  const stats = new Map<string, number>()
  const totalElements = elements.length

  // Initialize counts
  for (const category of categories) {
    stats.set(category.id, 0)
  }

  // Count elements per category
  for (const element of elements) {
    const count = stats.get(element.category) || 0
    stats.set(element.category, count + 1)
  }

  // Convert to statistics array
  return Array.from(stats.entries()).map(([id, count]) => ({
    id,
    count,
    percentage: (count / totalElements) * 100
  }))
}

// Sort categories by hierarchy level
export function sortCategoriesByHierarchy(
  categories: CategoryDefinition[]
): CategoryDefinition[] {
  const hierarchy = buildCategoryHierarchy(categories)
  const sorted: CategoryDefinition[] = []

  function addInOrder(nodes: CategoryHierarchy[]): void {
    for (const node of nodes) {
      const category = categories.find((c) => c.id === node.id)
      if (category) {
        sorted.push(category)
      }
      addInOrder(node.children)
    }
  }

  addInOrder(hierarchy)
  return sorted
}
