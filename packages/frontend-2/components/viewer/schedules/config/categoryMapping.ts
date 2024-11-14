import { parentCategories, childCategories } from './categories'

/**
 * Maps UI category names to their corresponding IFC type patterns
 * These patterns are used to match against the raw IFC type strings
 */
export const categoryToTypeMapping: Record<string, string[]> = {
  // Parent categories
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
  const patterns = getTypePatterns(category)
  const lowercaseType = speckleType.toLowerCase()
  return patterns.some((pattern) => lowercaseType.includes(pattern))
}

/**
 * Find all matching categories for a given speckle type
 */
export function findMatchingCategories(speckleType: string): {
  parentCategories: string[]
  childCategories: string[]
} {
  const lowercaseType = speckleType.toLowerCase()

  return {
    parentCategories: parentCategories.filter((category) =>
      getTypePatterns(category).some((pattern) => lowercaseType.includes(pattern))
    ),
    childCategories: childCategories.filter((category) =>
      getTypePatterns(category).some((pattern) => lowercaseType.includes(pattern))
    )
  }
}

/**
 * Get the most specific category for a speckle type
 * This is useful when an element could match multiple categories
 */
export function getMostSpecificCategory(speckleType: string): string | null {
  const { parentCategories: matchedParents, childCategories: matchedChildren } =
    findMatchingCategories(speckleType)

  // Prefer child categories as they are more specific
  if (matchedChildren.length > 0) return matchedChildren[0]
  if (matchedParents.length > 0) return matchedParents[0]

  return null
}
