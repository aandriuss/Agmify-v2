import { DebugCategories } from './debug'

// Add parameter categories to existing enum
export const ParameterDebugCategories = {
  STATE: DebugCategories.STATE,
  PROCESSING: DebugCategories.PARAMETERS,
  CACHE: DebugCategories.DATA,
  RECOVERY: DebugCategories.DATA_TRANSFORM
} as const

// Type for parameter debug categories
export type ParameterDebugCategory =
  (typeof ParameterDebugCategories)[keyof typeof ParameterDebugCategories]

// Helper to ensure category is used correctly
export function isParameterCategory(
  category: DebugCategories
): category is ParameterDebugCategory {
  return Object.values(ParameterDebugCategories).includes(
    category as ParameterDebugCategory
  )
}
