import { parentCategories, childCategories } from './categories'
import { debug, DebugCategories } from '../utils/debug'

/**
 * Maps UI category names to their corresponding IFC type patterns
 * These patterns are used to match against the raw IFC type strings
 */
export const categoryToTypeMapping: Record<string, string[]> = {
  // Parent categories
  Uncategorized: [], // Empty array so it never matches automatically
  Walls: ['ifcwall', 'ifcwallstandardcase', 'wall'],
  Floors: ['ifcfloor', 'ifcslab', 'floor', 'slab'],
  Roofs: ['ifcroof', 'roof'],
  Building: ['ifcbuilding', 'building'],
  Site: ['ifcsite', 'site'],
  Base: ['ifcfooting', 'foundation'],

  // Child categories
  'Structural Framing': [
    'ifcbeam',
    'beam',
    'frame',
    'truss',
    'framing',
    'joist',
    'rafter',
    'stud',
    'plate'
  ],
  'Structural Connections': ['ifcconnection', 'connection'],
  Windows: ['ifcwindow', 'window'],
  Doors: ['ifcdoor', 'door'],
  Columns: ['ifccolumn', 'column'],
  Ducts: ['ifcduct', 'duct'],
  Pipes: ['ifcpipe', 'pipe'],
  'Cable Trays': ['ifccabletray', 'cabletray'],
  Conduits: ['ifcconduit', 'conduit'],
  'Lighting Fixtures': ['ifclightfixture', 'lighting']
}

/**
 * Get all possible type patterns for a given category
 */
export function getTypePatterns(category: string): string[] {
  return categoryToTypeMapping[category] || []
}

/**
 * Check if a speckle type matches any of the patterns for a given category
 */
export function matchesCategory(speckleType: string, category: string): boolean {
  const lowercaseType = speckleType.toLowerCase()

  // First check if it matches any child category patterns
  if (childCategories.includes(category)) {
    const patterns = getTypePatterns(category)
    return patterns.some((pattern) => lowercaseType.includes(pattern))
  }

  // For parent categories, check if it matches any patterns
  if (parentCategories.includes(category)) {
    if (category === 'Uncategorized') {
      // Only mark as Uncategorized if it doesn't match any child category
      const matchesAnyChild = childCategories.some((childCat) =>
        getTypePatterns(childCat).some((pattern) => lowercaseType.includes(pattern))
      )
      if (matchesAnyChild) return false

      // And doesn't match any other parent category
      const matchesOtherParent = parentCategories
        .filter((cat) => cat !== 'Uncategorized')
        .some((parentCat) =>
          getTypePatterns(parentCat).some((pattern) => lowercaseType.includes(pattern))
        )
      return !matchesOtherParent
    }

    const patterns = getTypePatterns(category)
    return patterns.some((pattern) => lowercaseType.includes(pattern))
  }

  return false
}

/**
 * Find all matching categories for a given speckle type
 */
export function findMatchingCategories(speckleType: string): {
  parentCategories: string[]
  childCategories: string[]
} {
  const lowercaseType = speckleType.toLowerCase()

  // Check child categories first
  const matchedChildren = childCategories.filter((category) =>
    getTypePatterns(category).some((pattern) => lowercaseType.includes(pattern))
  )

  // If we found child categories, don't look for parent categories
  if (matchedChildren.length > 0) {
    debug.log(DebugCategories.CATEGORIES, 'Found child categories:', {
      speckleType,
      categories: matchedChildren
    })
    return {
      parentCategories: [],
      childCategories: matchedChildren
    }
  }

  // Look for parent categories
  const matchedParents = parentCategories
    .filter((category) => category !== 'Uncategorized')
    .filter((category) =>
      getTypePatterns(category).some((pattern) => lowercaseType.includes(pattern))
    )

  // If no matches found, add to Uncategorized
  if (matchedParents.length === 0) {
    debug.log(DebugCategories.CATEGORIES, 'No matches found, using Uncategorized:', {
      speckleType
    })
    return {
      parentCategories: ['Uncategorized'],
      childCategories: []
    }
  }

  debug.log(DebugCategories.CATEGORIES, 'Found parent categories:', {
    speckleType,
    categories: matchedParents
  })
  return {
    parentCategories: matchedParents,
    childCategories: []
  }
}

/**
 * Get the most specific category for a speckle type
 * This is useful when an element could match multiple categories
 */
export function getMostSpecificCategory(speckleType: string): string {
  const { parentCategories: matchedParents, childCategories: matchedChildren } =
    findMatchingCategories(speckleType)

  // Prefer child categories as they are more specific
  if (matchedChildren.length > 0) {
    return matchedChildren[0]
  }

  if (matchedParents.length > 0) {
    return matchedParents[0]
  }

  // Always return Uncategorized as fallback instead of null
  return 'Uncategorized'
}
