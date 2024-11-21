import { ref, watch } from 'vue'
import type {
  ElementData,
  TreeItemComponentModel,
  BIMNodeRaw,
  WorldTreeNode,
  ParameterValue
} from '../types'
import { debug, DebugCategories } from '../utils/debug'
import { ValidationError } from '../utils/validation'
import { convertToString } from '../utils/dataConversion'
import { getMostSpecificCategory } from '../config/categoryMapping'
import { useInjectedViewerState } from '~~/lib/viewer/composables/setup'
import { defaultColumns } from '../config/defaultColumns'

interface UseBIMElementsReturn {
  allElements: Ref<ElementData[]>
  rawWorldTree: Ref<WorldTreeNode | null>
  rawTreeNodes: Ref<TreeItemComponentModel[]>
  isLoading: Ref<boolean>
  hasError: Ref<boolean>
  initializeElements: (activeParameters?: string[]) => Promise<void>
  stopWorldTreeWatch: () => void
}

interface NodeModel {
  raw?: BIMNodeRaw
  children?: NodeModel[]
  atomic?: boolean
  id?: string
  speckle_type?: string
  type?: string
}

interface TreeNode {
  model: NodeModel
  children?: TreeNode[]
}

interface ProcessingStats {
  totalNodes: number
  skippedNodes: number
  processedNodes: number
}

async function validateWorldTree(
  viewer: ReturnType<typeof useInjectedViewerState>['viewer'],
  maxAttempts = 10,
  interval = 500
): Promise<void> {
  if (!viewer.instance) {
    debug.error(DebugCategories.VALIDATION, 'Viewer instance not available')
    throw new ValidationError('Viewer instance not available')
  }

  let attempts = 0
  while (attempts < maxAttempts) {
    if (viewer.metadata.worldTree.value) {
      const tree = viewer.metadata.worldTree.value as unknown as { _root: unknown }
      if (tree._root) {
        debug.log(DebugCategories.VALIDATION, 'WorldTree validation successful', {
          hasRoot: true,
          attempt: attempts + 1
        })
        return
      }
    }
    debug.log(DebugCategories.VALIDATION, 'Waiting for WorldTree', {
      attempt: attempts + 1,
      maxAttempts
    })
    await new Promise((resolve) => setTimeout(resolve, interval))
    attempts++
  }

  const error = new ValidationError('Timeout waiting for WorldTree initialization')
  debug.error(DebugCategories.VALIDATION, 'WorldTree validation failed:', {
    attempts,
    maxAttempts,
    hasWorldTree: !!viewer.metadata.worldTree.value,
    error
  })
  throw error
}

function findMarkInObject(obj: Record<string, unknown>): string | undefined {
  // Helper to recursively search for Mark in an object
  function searchMark(current: unknown): string | undefined {
    if (!current || typeof current !== 'object') return undefined

    for (const [key, value] of Object.entries(current)) {
      // Check if this is a Mark field
      if (key === 'Mark' || key === 'mark') {
        return convertToString(value)
      }
      // Recursively search nested objects
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const found = searchMark(value)
        if (found) return found
      }
    }
    return undefined
  }

  return searchMark(obj)
}

function extractParameters(
  raw: BIMNodeRaw,
  activeParameters: string[] = defaultColumns.map((col) => col.field)
): Record<string, ParameterValue> {
  const parameters: Record<string, ParameterValue> = {}

  // Only extract active parameters
  function processGroup(group: Record<string, unknown>, prefix: string = '') {
    Object.entries(group).forEach(([key, value]) => {
      const paramKey = prefix ? `${prefix}.${key}` : key

      // Only process if it's an active parameter
      if (activeParameters.includes(paramKey)) {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          processGroup(value as Record<string, unknown>, paramKey)
        } else if (
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean'
        ) {
          parameters[paramKey] = value as ParameterValue

          // Special handling for Host parameter
          if (key === 'Host') {
            parameters.host = value as ParameterValue
            debug.log(DebugCategories.PARAMETERS, 'Found host parameter', {
              value,
              source: prefix || 'Top Level'
            })
          }

          debug.log(DebugCategories.PARAMETERS, 'Found active parameter', {
            key: paramKey,
            value,
            source: prefix || 'Top Level'
          })
        }
      }
    })
  }

  // Process all groups and nested objects
  Object.entries(raw).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      processGroup(value as Record<string, unknown>, key)
    } else if (activeParameters.includes(key)) {
      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      ) {
        parameters[key] = value as ParameterValue
        debug.log(DebugCategories.PARAMETERS, 'Found top-level parameter', {
          key,
          value
        })
      }
    }
  })

  debug.log(DebugCategories.PARAMETERS, 'Extracted active parameters', {
    totalParameters: Object.keys(parameters).length,
    activeParameters,
    extractedParameters: Object.keys(parameters),
    hasHost: 'host' in parameters,
    hostValue: parameters.host
  })

  return parameters
}

function createEmptyElement(
  id: string,
  type: string,
  mark: string,
  category: string,
  parameters: Record<string, ParameterValue>
): ElementData {
  const element: ElementData = {
    id,
    type,
    mark,
    category,
    parameters,
    details: [],
    _visible: true
  }

  Object.entries(parameters).forEach(([key, value]) => {
    element[key] = value
  })

  return element
}

function hasValidSpeckleType(raw: BIMNodeRaw): boolean {
  // Check speckleType first
  if (typeof raw.speckleType === 'string' && raw.speckleType.trim() !== '') {
    return true
  }

  // Fallback to type if speckleType is not available
  if (typeof raw.type === 'string' && raw.type.trim() !== '') {
    return true
  }

  // Check Other.Category as last resort
  if (
    raw.Other?.Category &&
    typeof raw.Other.Category === 'string' &&
    raw.Other.Category.trim() !== ''
  ) {
    return true
  }

  debug.log(DebugCategories.DATA, 'Invalid type for node:', {
    id: raw.id,
    speckleType: raw.speckleType,
    type: raw.type,
    category: raw.Other?.Category
  })

  return false
}

function extractElementData(
  raw: BIMNodeRaw,
  activeParameters: string[]
): ElementData | null {
  try {
    if (!hasValidSpeckleType(raw)) {
      debug.log(DebugCategories.DATA, 'Skipping element without valid type', {
        id: raw.id,
        type: raw.type,
        speckleType: raw.speckleType,
        category: raw.Other?.Category
      })
      return null
    }

    // Use the first available type identifier
    const speckleType = raw.speckleType || raw.type || raw.Other?.Category || 'Unknown'
    const category = getMostSpecificCategory(speckleType) || 'Uncategorized'

    // Find Mark in any location
    const mark = findMarkInObject(raw) || raw.id.toString()

    const parameters = extractParameters(raw, activeParameters)

    const element = createEmptyElement(
      raw.id.toString(),
      speckleType,
      mark,
      category,
      parameters
    )

    // Make _raw enumerable so it shows up in debug panel
    Object.defineProperty(element, '_raw', {
      value: raw,
      enumerable: true,
      configurable: true
    })

    debug.log(DebugCategories.DATA, 'Element data extracted', {
      id: element.id,
      speckleType,
      category,
      mark,
      parameterCount: Object.keys(parameters).length,
      activeParameters
    })

    return element
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Error extracting element data:', err)
    return null
  }
}

function processNode(
  node: TreeNode,
  activeParameters: string[],
  stats: ProcessingStats = { totalNodes: 0, skippedNodes: 0, processedNodes: 0 }
): ElementData[] {
  const elements: ElementData[] = []

  try {
    if (node.model?.raw) {
      stats.totalNodes++
      if (hasValidSpeckleType(node.model.raw)) {
        const element = extractElementData(node.model.raw, activeParameters)
        if (element) {
          elements.push(element)
          stats.processedNodes++
        } else {
          stats.skippedNodes++
        }
      } else {
        stats.skippedNodes++
      }
    }

    if (node.model?.children?.length) {
      node.model.children.forEach((child) => {
        if (child.raw) {
          stats.totalNodes++
          if (hasValidSpeckleType(child.raw)) {
            const element = extractElementData(child.raw, activeParameters)
            if (element) {
              elements.push(element)
              stats.processedNodes++
            } else {
              stats.skippedNodes++
            }
          } else {
            stats.skippedNodes++
          }
        }
      })
    }

    if (node.children?.length) {
      node.children.forEach((child) => {
        const childElements = processNode(child, activeParameters, stats)
        elements.push(...childElements)
      })
    }

    debug.log(DebugCategories.DATA, 'Node processing stats', {
      totalNodes: stats.totalNodes,
      processedNodes: stats.processedNodes,
      skippedNodes: stats.skippedNodes,
      processingRatio: `${((stats.processedNodes / stats.totalNodes) * 100).toFixed(
        2
      )}%`,
      activeParameters
    })
  } catch (err) {
    // Create a new ValidationError with the error message
    const error =
      err instanceof Error
        ? new ValidationError(err.message)
        : new ValidationError('Unknown error processing node')
    debug.error(DebugCategories.ERROR, 'Error processing node:', {
      error: error.message,
      nodeId: node.model?.raw?.id
    })
  }

  return elements
}

export function useBIMElements(): UseBIMElementsReturn {
  const { viewer } = useInjectedViewerState()
  const allElements = ref<ElementData[]>([])
  const rawWorldTree = ref<WorldTreeNode | null>(null)
  const rawTreeNodes = ref<TreeItemComponentModel[]>([])
  const isLoading = ref(false)
  const hasError = ref(false)

  async function initializeElements(
    activeParameters: string[] = defaultColumns.map((col) => col.field)
  ): Promise<void> {
    try {
      isLoading.value = true
      hasError.value = false

      debug.log(DebugCategories.INITIALIZATION, 'Starting BIM element initialization', {
        activeParameters
      })

      await validateWorldTree(viewer)

      if (!viewer.metadata.worldTree.value) {
        debug.error(DebugCategories.VALIDATION, 'WorldTree is null')
        throw new ValidationError('WorldTree is null')
      }

      const tree = viewer.metadata.worldTree.value as unknown as {
        _root: TreeNode
      }

      const stats: ProcessingStats = {
        totalNodes: 0,
        skippedNodes: 0,
        processedNodes: 0
      }
      const processedElements = processNode(tree._root, activeParameters, stats)

      if (!processedElements.length) {
        debug.error(DebugCategories.VALIDATION, 'No elements processed from WorldTree')
        throw new ValidationError('No elements processed from WorldTree')
      }

      allElements.value = processedElements
      rawWorldTree.value = viewer.metadata.worldTree.value as WorldTreeNode

      debug.log(DebugCategories.INITIALIZATION, 'BIM element initialization complete', {
        elementCount: processedElements.length,
        categories: [...new Set(processedElements.map((el) => el.category))],
        activeParameters,
        stats: {
          totalNodes: stats.totalNodes,
          processedNodes: stats.processedNodes,
          skippedNodes: stats.skippedNodes,
          processingRatio: `${((stats.processedNodes / stats.totalNodes) * 100).toFixed(
            2
          )}%`
        }
      })
    } catch (error) {
      debug.error(DebugCategories.ERROR, 'BIM element initialization failed:', error)
      hasError.value = true
      allElements.value = []
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const stopWorldTreeWatch = watch(
    () => viewer.metadata.worldTree.value,
    async (newWorldTree) => {
      if (newWorldTree && viewer.init.ref.value) {
        try {
          const tree = newWorldTree as unknown as { _root: TreeNode }
          if (!tree._root) {
            debug.error(DebugCategories.VALIDATION, 'Invalid WorldTree structure')
            return
          }

          debug.log(DebugCategories.DATA, 'WorldTree updated', {
            hasRoot: true,
            rootChildren: tree._root?.children?.length || 0,
            rootModel: !!tree._root?.model
          })

          await initializeElements()
        } catch (error) {
          debug.error(DebugCategories.ERROR, 'WorldTree update failed:', error)
        }
      }
    },
    { deep: true }
  )

  return {
    allElements,
    rawWorldTree,
    rawTreeNodes,
    isLoading,
    hasError,
    initializeElements,
    stopWorldTreeWatch: () => stopWorldTreeWatch()
  }
}
