import { ref, watch } from 'vue'
import type {
  ElementData,
  TreeItemComponentModel,
  BIMNodeRaw,
  WorldTreeNode,
  ParameterValue,
  Parameters,
  ParameterValueState,
  ParameterValueType
} from '../types'
import { debug, DebugCategories } from '../utils/debug'
import { ValidationError } from '../utils/validation'
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
  model?: NodeModel
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

function inferType(value: unknown): ParameterValueType {
  if (typeof value === 'boolean') return 'boolean'
  if (
    typeof value === 'number' ||
    (typeof value === 'string' && !isNaN(parseFloat(value)))
  )
    return 'number'
  return 'string'
}

function transformValue(value: unknown, type: ParameterValueType): ParameterValue {
  // Handle null/undefined
  if (value === null || value === undefined) return null

  // Unwrap speckle value
  if (value && typeof value === 'object' && '_' in value) {
    value = (value as { _: unknown })._
  }

  // Convert based on type
  switch (type) {
    case 'boolean':
      return typeof value === 'boolean' ? value : null

    case 'number':
      if (typeof value === 'number') return isNaN(value) ? null : value
      if (typeof value === 'string') {
        const trimmed = value.trim()
        // Handle percentages
        if (trimmed.endsWith('%')) {
          const num = parseFloat(trimmed)
          return isNaN(num) ? null : num / 100
        }
        // Handle currency
        if (trimmed.startsWith('$')) {
          const num = parseFloat(trimmed.substring(1))
          return isNaN(num) ? null : num
        }
        // Handle plain numbers
        const num = parseFloat(trimmed)
        return isNaN(num) ? null : num
      }
      return null

    case 'string':
      if (value === null || value === undefined) return null
      if (typeof value === 'object') {
        try {
          const str = JSON.stringify(value)
          return str === '{}' ? null : str
        } catch {
          return null
        }
      }
      return String(value)

    default:
      return null
  }
}

function createParameterState(value: ParameterValue): ParameterValueState {
  return {
    fetchedValue: value,
    currentValue: value,
    previousValue: value,
    userValue: null
  }
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

function extractParameters(
  raw: BIMNodeRaw,
  activeParameters: string[] = defaultColumns.map((col) => col.field)
): Parameters {
  const result: Parameters = {}

  // Initialize all active parameters with null values
  activeParameters.forEach((paramName) => {
    let value: unknown = null

    // Try all possible sources for the value
    if (
      raw.parameters &&
      typeof raw.parameters === 'object' &&
      paramName in raw.parameters
    ) {
      value = raw.parameters[paramName]
    }
    // Try BIM-specific fields
    else if (paramName === 'mark' && raw.Mark) {
      value = raw.Mark
    } else if (paramName === 'category' && raw.Other?.Category) {
      value = raw.Other.Category
    } else if (paramName === 'host' && raw.Constraints?.Host) {
      value = raw.Constraints.Host
    }
    // Try raw object directly
    else if (paramName in raw) {
      value = raw[paramName]
    }

    // Transform value based on type
    const type = inferType(value)
    const transformedValue = transformValue(value, type)
    result[paramName] = createParameterState(transformedValue)

    debug.log(DebugCategories.PARAMETERS, 'Parameter processed', {
      key: paramName,
      rawValue: value,
      transformedValue: result[paramName].currentValue,
      source: raw.parameters?.[paramName]
        ? 'parameters'
        : paramName === 'mark' && raw.Mark
        ? 'Mark'
        : paramName === 'category' && raw.Other?.Category
        ? 'Other.Category'
        : paramName === 'host' && raw.Constraints?.Host
        ? 'Constraints.Host'
        : paramName in raw
        ? 'raw'
        : 'none'
    })
  })

  debug.log(DebugCategories.PARAMETERS, 'Extracted parameters', {
    totalParameters: Object.keys(result).length,
    activeParameters,
    extractedParameters: Object.keys(result),
    sampleValues: Object.entries(result).reduce((acc, [key, value]) => {
      acc[key] = value.currentValue
      return acc
    }, {} as Record<string, ParameterValue>)
  })

  return result
}

function createEmptyElement(
  id: string,
  type: string,
  mark: string,
  category: string,
  parameters: Parameters
): ElementData {
  return {
    id,
    type,
    mark,
    category,
    parameters,
    details: [],
    _visible: true
  }
}

function extractElementData(
  raw: BIMNodeRaw,
  activeParameters: string[]
): ElementData | null {
  try {
    const speckleType = raw.speckleType || raw.type || raw.Other?.Category || 'Unknown'
    const category = getMostSpecificCategory(speckleType) || 'Uncategorized'
    const mark = raw.Mark?.toString() || raw.id.toString()
    const parameters = extractParameters(raw, activeParameters)

    const element = createEmptyElement(
      raw.id.toString(),
      speckleType,
      mark,
      category,
      parameters
    )

    // Make _raw enumerable for debug panel
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
      sampleParameters: Object.entries(parameters)
        .slice(0, 3)
        .reduce((acc, [key, value]) => {
          acc[key] = value.currentValue
          return acc
        }, {} as Record<string, ParameterValue>)
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
  stats: ProcessingStats
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

    if (node.model?.children) {
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

    if (node.children) {
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
    debug.error(DebugCategories.ERROR, 'Error processing node:', {
      error: err instanceof Error ? err.message : String(err),
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
