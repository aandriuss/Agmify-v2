import { debug, DebugCategories } from '../debug/useDebug'

/**
 * Configuration for BIM element type keywords
 * Used to identify valid BIM elements in the WorldTree
 * These are the base types that we look for within IFC type strings
 */
export const BIM_ELEMENT_TYPES = [
  'wall',
  'beam',
  'floor',
  'window',
  'door',
  'pipe',
  'duct',
  'column',
  'roof',
  'slab',
  'stair',
  'railing',
  'ceiling'
] as const

export type BIMElementType = (typeof BIM_ELEMENT_TYPES)[number]

/**
 * Check if a speckle type matches any of our BIM element keywords
 * This does a case-insensitive partial match, so e.g. 'wall' will match 'IFCWALLSTANDARDCASE'
 */
export function isBIMElement(speckleType: string | undefined): boolean {
  if (!speckleType) return false

  const lowercaseType = speckleType.toLowerCase()
  const matchedTypes = BIM_ELEMENT_TYPES.filter((type) =>
    lowercaseType.includes(type.toLowerCase())
  )
  const isMatch = matchedTypes.length > 0

  if (isMatch) {
    debug.log(DebugCategories.DATA, `Matched type "${speckleType}"`, {
      matchedTypes,
      originalType: speckleType
    })
  } else {
    debug.log(DebugCategories.DATA, `No match for type "${speckleType}"`)
  }

  return isMatch
}
