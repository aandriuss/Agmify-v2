import type { CategoryDefinition } from '../../core/types'

// Category hierarchy interface
export interface CategoryHierarchy {
  id: string
  name: string
  parent?: string
  children: CategoryHierarchy[]
  level: number
}

// Category relation interface
export interface CategoryRelation {
  parent: string
  child: string
}

// Build category hierarchy from definitions
export function buildCategoryHierarchy(
  categories: CategoryDefinition[]
): CategoryHierarchy[] {
  const categoryMap = new Map<string, CategoryHierarchy>()
  const roots: CategoryHierarchy[] = []

  // First pass: Create hierarchy nodes
  for (const category of categories) {
    categoryMap.set(category.id, {
      id: category.id,
      name: category.name,
      parent: category.parent,
      children: [],
      level: 0
    })
  }

  // Second pass: Build relationships
  for (const node of categoryMap.values()) {
    if (node.parent && categoryMap.has(node.parent)) {
      const parent = categoryMap.get(node.parent)!
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  }

  // Third pass: Calculate levels
  calculateLevels(roots, 0)

  return roots
}

// Calculate hierarchy levels
function calculateLevels(nodes: CategoryHierarchy[], level: number): void {
  for (const node of nodes) {
    node.level = level
    if (node.children.length > 0) {
      calculateLevels(node.children, level + 1)
    }
  }
}

// Get all descendant categories
export function getDescendants(
  categoryId: string,
  hierarchy: CategoryHierarchy[]
): Set<string> {
  const descendants = new Set<string>()
  const node = findNode(categoryId, hierarchy)

  if (node) {
    collectDescendants(node, descendants)
  }

  return descendants
}

// Get all ancestor categories
export function getAncestors(
  categoryId: string,
  hierarchy: CategoryHierarchy[]
): Set<string> {
  const ancestors = new Set<string>()
  const node = findNode(categoryId, hierarchy)

  if (node) {
    let current = node
    while (current.parent) {
      ancestors.add(current.parent)
      const parentNode = findNodeById(current.parent, hierarchy)
      if (!parentNode) break
      current = parentNode
    }
  }

  return ancestors
}

// Check if category is descendant of another
export function isDescendantOf(
  categoryId: string,
  ancestorId: string,
  hierarchy: CategoryHierarchy[]
): boolean {
  const ancestors = getAncestors(categoryId, hierarchy)
  return ancestors.has(ancestorId)
}

// Check if category is ancestor of another
export function isAncestorOf(
  categoryId: string,
  descendantId: string,
  hierarchy: CategoryHierarchy[]
): boolean {
  const descendants = getDescendants(categoryId, hierarchy)
  return descendants.has(descendantId)
}

// Get category path (from root to category)
export function getCategoryPath(
  categoryId: string,
  hierarchy: CategoryHierarchy[]
): string[] {
  const path: string[] = []
  const node = findNode(categoryId, hierarchy)

  if (node) {
    let current: CategoryHierarchy | undefined = node
    while (current) {
      path.unshift(current.id)
      if (!current.parent) break
      current = findNodeById(current.parent, hierarchy)
    }
  }

  return path
}

// Helper: Collect all descendants
function collectDescendants(node: CategoryHierarchy, descendants: Set<string>): void {
  for (const child of node.children) {
    descendants.add(child.id)
    collectDescendants(child, descendants)
  }
}

// Helper: Find node by ID in hierarchy
function findNodeById(
  id: string,
  hierarchy: CategoryHierarchy[]
): CategoryHierarchy | undefined {
  for (const node of hierarchy) {
    if (node.id === id) return node
    const found = findNodeById(id, node.children)
    if (found) return found
  }
  return undefined
}

// Helper: Find node by ID starting from roots
function findNode(
  id: string,
  hierarchy: CategoryHierarchy[]
): CategoryHierarchy | undefined {
  return findNodeById(id, hierarchy)
}

// Validate category hierarchy (detect cycles)
export function validateHierarchy(categories: CategoryDefinition[]): boolean {
  const visited = new Set<string>()
  const recursionStack = new Set<string>()

  function hasCycle(categoryId: string): boolean {
    if (recursionStack.has(categoryId)) {
      return true // Cycle detected
    }

    if (visited.has(categoryId)) {
      return false // Already checked this path
    }

    const category = categories.find((c) => c.id === categoryId)
    if (!category) {
      return false // Category not found
    }

    visited.add(categoryId)
    recursionStack.add(categoryId)

    if (category.parent && hasCycle(category.parent)) {
      return true
    }

    recursionStack.delete(categoryId)
    return false
  }

  return !categories.some((category) => hasCycle(category.id))
}
