import type {
  TreeItemComponentModel,
  WorldTreeNode,
  ElementData,
  ProcessedHeader,
  BIMNodeRaw,
  BIMNodeValue
} from '../types'
import { debug, DebugCategories } from '../debug/useDebug'

export class ValidationError extends Error {
  constructor(message: string, public details?: unknown) {
    super(message)
    this.name = 'ValidationError'
  }
}

// Core type guards with detailed error messages
export function isValidTreeItemComponentModel(
  node: unknown,
  throwError = false
): node is TreeItemComponentModel {
  if (!node || typeof node !== 'object') {
    if (throwError) {
      throw new ValidationError('Invalid node: must be an object', { node })
    }
    return false
  }

  const typedNode = node as Record<string, unknown>

  // Check required properties
  if (typeof typedNode.id !== 'string' || typeof typedNode.label !== 'string') {
    if (throwError) {
      throw new ValidationError('Invalid node: missing or invalid id/label', {
        id: typedNode.id,
        label: typedNode.label
      })
    }
    return false
  }

  // Allow either rawNode or model property
  if (!('rawNode' in typedNode) && !('model' in typedNode)) {
    if (throwError) {
      throw new ValidationError('Invalid node: missing rawNode or model property', {
        node
      })
    }
    return false
  }

  // If it has model property, treat it as valid
  if ('model' in typedNode) {
    return true
  }

  // If it has rawNode, ensure it has raw property
  const rawNode = typedNode.rawNode as Record<string, unknown> | null | undefined
  if (!rawNode || !('raw' in rawNode)) {
    if (throwError) {
      throw new ValidationError('Invalid node: rawNode must have raw property', {
        node
      })
    }
    return false
  }

  return true
}

export function isValidWorldTreeNode(
  node: unknown,
  throwError = false
): node is Required<WorldTreeNode> {
  if (!node || typeof node !== 'object') {
    if (throwError) {
      throw new ValidationError('Invalid WorldTree: must be an object', { node })
    }
    return false
  }

  const typedNode = node as WorldTreeNode
  if (!typedNode._root) {
    if (throwError) {
      throw new ValidationError('Invalid WorldTree: missing _root property', { node })
    }
    return false
  }

  if (!Array.isArray(typedNode._root.children)) {
    if (throwError) {
      throw new ValidationError('Invalid WorldTree: _root.children must be an array', {
        root: typedNode._root
      })
    }
    return false
  }

  return true
}

export function isValidArray<T>(
  arr: T[] | undefined | null,
  throwError = false
): arr is T[] {
  if (!Array.isArray(arr) || arr.length === 0) {
    if (throwError) {
      throw new ValidationError('Invalid array: must be non-empty array', { arr })
    }
    return false
  }
  return true
}

export function isValidBIMNodeRaw(
  node: unknown,
  throwError = false
): node is BIMNodeRaw {
  if (!node || typeof node !== 'object') {
    if (throwError) {
      throw new ValidationError('Invalid BIMNodeRaw: must be an object', { node })
    }
    return false
  }

  const bimNode = node as Record<string, unknown>
  if (typeof bimNode.id !== 'string') {
    if (throwError) {
      throw new ValidationError('Invalid BIMNodeRaw: missing or invalid id', {
        id: bimNode.id
      })
    }
    return false
  }

  return true
}

export function isValidBIMNodeValue(
  value: unknown,
  throwError = false
): value is BIMNodeValue {
  const isValid =
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null ||
    value === undefined

  if (!isValid && throwError) {
    throw new ValidationError(
      'Invalid BIMNodeValue: must be string, number, boolean, null, or undefined',
      { value }
    )
  }

  return isValid
}

export function isValidProcessedHeader(
  header: unknown,
  throwError = false
): header is ProcessedHeader {
  if (!header || typeof header !== 'object') {
    if (throwError) {
      throw new ValidationError('Invalid ProcessedHeader: must be an object', {
        header
      })
    }
    return false
  }

  const h = header as Record<string, unknown>
  const requiredFields = [
    'field',
    'header',
    'source',
    'type',
    'category',
    'description'
  ]

  for (const field of requiredFields) {
    if (typeof h[field] !== 'string') {
      if (throwError) {
        throw new ValidationError(
          `Invalid ProcessedHeader: missing or invalid ${field}`,
          { [field]: h[field] }
        )
      }
      return false
    }
  }

  return true
}

export function isValidElementData(
  data: unknown,
  throwError = false
): data is ElementData {
  if (!data || typeof data !== 'object') {
    if (throwError) {
      throw new ValidationError('Invalid ElementData: must be an object', { data })
    }
    return false
  }

  const element = data as Record<string, unknown>
  const requiredFields = ['id', 'mark', 'category']

  for (const field of requiredFields) {
    if (typeof element[field] !== 'string') {
      if (throwError) {
        throw new ValidationError(`Invalid ElementData: missing or invalid ${field}`, {
          [field]: element[field]
        })
      }
      return false
    }
  }

  // Validate details array if present
  if (element.details !== undefined) {
    if (!Array.isArray(element.details)) {
      if (throwError) {
        throw new ValidationError('Invalid ElementData: details must be an array', {
          details: element.details
        })
      }
      return false
    }

    // Recursively validate each detail
    for (const detail of element.details) {
      if (!isValidElementData(detail, throwError)) {
        return false
      }
    }
  }

  return true
}

// Validation helper functions
export function validateWorldTreeStructure(tree: unknown): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  try {
    isValidWorldTreeNode(tree, true)
  } catch (error) {
    if (error instanceof ValidationError) {
      errors.push(error.message)
      debug.error(DebugCategories.VALIDATION, error.message, error.details)
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

export function validateElementDataArray(data: unknown[]): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!Array.isArray(data)) {
    errors.push('Data must be an array')
    return { isValid: false, errors }
  }

  data.forEach((element, index) => {
    try {
      isValidElementData(element, true)
    } catch (error) {
      if (error instanceof ValidationError) {
        errors.push(`Element at index ${index}: ${error.message}`)
        debug.error(
          DebugCategories.VALIDATION,
          `Element validation error at index ${index}:`,
          error.details
        )
      }
    }
  })

  return {
    isValid: errors.length === 0,
    errors
  }
}
