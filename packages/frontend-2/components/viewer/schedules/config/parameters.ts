import type { BIMNodeRaw } from '../types'
import { convertToString } from '../utils/dataConversion'

// Parameter definition type
export interface BIMParameter {
  name: string
  path: string[]
  fallback: keyof BIMNodeRaw
}

// Helper to safely get nested property
export function getNestedValue(obj: BIMNodeRaw, path: string[]): string | undefined {
  if (!obj || !path?.length) return undefined

  let current: unknown = obj
  for (const key of path) {
    if (!current || typeof current !== 'object' || !key) return undefined
    current = (current as Record<string, unknown>)[key]
  }

  if (current === undefined || current === null) return undefined
  return convertToString(current)
}

// Predefined list of BIM Active parameters we want to collect
export const BASIC_PARAMETERS: BIMParameter[] = [
  {
    name: 'Mark',
    path: ['Identity Data', 'Mark'],
    fallback: 'Tag'
  },
  {
    name: 'Category',
    path: ['Other', 'Category'],
    fallback: 'type'
  },
  {
    name: 'Host',
    path: ['Constraints', 'Host'],
    fallback: 'id'
  },
  {
    name: 'ID',
    path: ['id'],
    fallback: 'id'
  }
] as const
