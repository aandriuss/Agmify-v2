import type { SpeckleObject, SpeckleReference } from '@speckle/viewer'

/**
 * Raw BIM node interface
 */
export interface ViewerNodeRaw {
  // Required SpeckleObject properties
  id: string
  speckle_type: string

  // Optional SpeckleObject properties
  referencedId?: string
  applicationId?: string
  units?: string

  // Core properties
  type?: string
  Name?: string
  speckleType?: string

  // Parameter groups - can be any string key with object value
  [group: string]:
    | {
        [key: string]: unknown
      }
    | unknown

  // Base parameters
  parameters?: Record<string, unknown>
  metadata?: Record<string, unknown>

  // Allow references in children/elements
  children?: Array<ViewerNodeRaw | SpeckleReference>
  elements?: SpeckleReference[]
}

export interface ViewerNode {
  id: string
  model: {
    id?: string
    type?: string
    raw?: ViewerNodeRaw | SpeckleReference
  }
  children?: ViewerNode[]
}

export interface WorldTreeRoot {
  _root: {
    children: ViewerNode[]
  }
}

/**
 * Type guard to check if a value is a SpeckleReference
 */
export function isSpeckleReference(value: unknown): value is SpeckleReference {
  return (
    typeof value === 'object' &&
    value !== null &&
    'referencedId' in value &&
    typeof (value as SpeckleReference).referencedId === 'string'
  )
}

/**
 * Type guard to check if a value is a ViewerNodeRaw
 */
export function isViewerNodeRaw(value: unknown): value is ViewerNodeRaw {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof (value as ViewerNodeRaw).id === 'string' &&
    'speckle_type' in value &&
    typeof (value as ViewerNodeRaw).speckle_type === 'string'
  )
}

/**
 * Type guard to check if a value is a SpeckleObject
 */
export function isSpeckleObject(value: unknown): value is SpeckleObject {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof (value as SpeckleObject).id === 'string' &&
    'speckle_type' in value &&
    typeof (value as SpeckleObject).speckle_type === 'string'
  )
}
