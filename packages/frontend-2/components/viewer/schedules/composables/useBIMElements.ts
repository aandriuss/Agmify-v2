import { ref, watch } from 'vue'
import type {
  ElementData,
  TreeItemComponentModel,
  BIMNodeRaw,
  ViewerTree,
  ParameterValue,
  Parameters,
  ParameterValueType,
  ParameterValueState,
  TreeNode
} from '../types'
import { debug, DebugCategories } from '../utils/debug'
import { getMostSpecificCategory } from '../config/categoryMapping'
import { useInjectedViewerState } from '~~/lib/viewer/composables/setup'
import { defaultColumns } from '../config/defaultColumns'

// BIM parameter mapping with type information
const parameterMapping: Record<string, { names: string[]; type: ParameterValueType }> =
  {
    width: {
      names: ['width', 'Width', 'b', 'B', 'Width Parameter'],
      type: 'number'
    },
    height: {
      names: ['height', 'Height', 'h', 'H', 'Height Parameter'],
      type: 'number'
    },
    length: {
      names: ['length', 'Length', 'l', 'L', 'Length Parameter'],
      type: 'number'
    },
    family: {
      names: ['family', 'Family', 'familyName', 'FamilyName', 'Family Type'],
      type: 'string'
    },
    mark: {
      names: ['mark', 'Mark', 'markId', 'MarkId'],
      type: 'string'
    },
    category: {
      names: ['category', 'Category', 'elementCategory', 'ElementCategory'],
      type: 'string'
    },
    host: {
      names: ['host', 'Host', 'hostId', 'HostId', 'hostElement', 'HostElement'],
      type: 'string'
    }
  }

interface UseBIMElementsReturn {
  allElements: Ref<ElementData[]>
  rawWorldTree: Ref<ViewerTree | null>
  rawTreeNodes: Ref<TreeItemComponentModel[]>
  isLoading: Ref<boolean>
  hasError: Ref<boolean>
  initializeElements: (activeParameters?: string[]) => Promise<void>
  stopWorldTreeWatch: () => void
}

interface ProcessingStats {
  totalNodes: number
  skippedNodes: number
  processedNodes: number
}

function inferType(paramName: string, value: unknown): ParameterValueType {
  // If we have a type defined in the mapping, use it
  if (paramName in parameterMapping) {
    return parameterMapping[paramName].type
  }

  // Otherwise infer from value
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

function findParameterValue(raw: BIMNodeRaw, paramName: string): unknown {
  // Get possible parameter names and type for this field
  const mapping = parameterMapping[paramName] || { names: [paramName], type: 'string' }

  // Try each possible name
  for (const name of mapping.names) {
    // Check in parameters
    if (raw.parameters?.[name] !== undefined) {
      return raw.parameters[name]
    }

    // Check special cases
    if (name === 'mark' && raw.Mark !== undefined) {
      return raw.Mark
    }
    if (name === 'category' && raw.Other?.Category !== undefined) {
      return raw.Other.Category
    }
    if (name === 'host' && raw.Constraints?.Host !== undefined) {
      return raw.Constraints.Host
    }

    // Check direct property
    if (name in raw) {
      return raw[name]
    }
  }

  return null
}

function extractParameters(
  raw: BIMNodeRaw,
  activeParameters: string[] = defaultColumns.map((col) => col.field)
): Parameters {
  const result: Parameters = {}

  // Initialize all active parameters with null values
  activeParameters.forEach((paramName) => {
    // Try to get value from BIM data
    let value = findParameterValue(raw, paramName)

    // If value is already a ParameterValueState, extract its currentValue
    if (value && typeof value === 'object' && 'currentValue' in value) {
      const paramState = value as ParameterValueState
      value = paramState.currentValue
    }

    // Get the parameter type
    const type = inferType(paramName, value)

    // Transform the value according to the type
    const transformedValue = transformValue(value, type)

    // Create clean ParameterValueState
    result[paramName] = {
      fetchedValue: transformedValue,
      currentValue: transformedValue,
      previousValue: transformedValue,
      userValue: null
    }

    debug.log(DebugCategories.PARAMETERS, 'Parameter processed', {
      key: paramName,
      rawValue: value,
      transformedValue: result[paramName].currentValue,
      type,
      source:
        raw.parameters?.[paramName] !== undefined
          ? 'parameters'
          : paramName === 'mark' && raw.Mark !== undefined
          ? 'Mark'
          : paramName === 'category' && raw.Other?.Category !== undefined
          ? 'Other.Category'
          : paramName === 'host' && raw.Constraints?.Host !== undefined
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
      acc[key] = {
        currentValue: value.currentValue,
        fetchedValue: value.fetchedValue,
        previousValue: value.previousValue,
        userValue: value.userValue,
        source:
          raw.parameters?.[key] !== undefined
            ? 'parameters'
            : key === 'mark' && raw.Mark !== undefined
            ? 'Mark'
            : key === 'category' && raw.Other?.Category !== undefined
            ? 'Other.Category'
            : key === 'host' && raw.Constraints?.Host !== undefined
            ? 'Constraints.Host'
            : key in raw
            ? 'raw'
            : 'none'
      }
      return acc
    }, {} as Record<string, { currentValue: unknown; fetchedValue: unknown; previousValue: unknown; userValue: unknown; source: string }>)
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
          acc[key] = {
            currentValue: value.currentValue,
            fetchedValue: value.fetchedValue,
            previousValue: value.previousValue,
            userValue: value.userValue
          }
          return acc
        }, {} as Record<string, ParameterValueState>)
    })

    return element
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Error extracting element data:', err)
    return null
  }
}

function processNodeDeep(
  node: any,
  activeParameters: string[],
  stats: ProcessingStats,
  depth: number = 0,
  maxDepth: number = 10
): ElementData[] {
  const elements: ElementData[] = []

  if (depth >= maxDepth) {
    return elements
  }

  try {
    // Helper function to process raw data
    const processRawData = (raw: BIMNodeRaw) => {
      stats.totalNodes++
      if (hasValidSpeckleType(raw)) {
        const element = extractElementData(raw, activeParameters)
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

    // Process current node's raw data if it exists
    if (node?.raw) {
      processRawData(node.raw)
    }
    if (node?.model?.raw) {
      processRawData(node.model.raw)
    }

    // Process all possible children paths
    const childrenPaths = [
      node?.children,
      node?.model?.children,
      node?.elements,
      node?.raw?.children,
      node?.raw?.elements
    ]

    childrenPaths.forEach((children) => {
      if (Array.isArray(children)) {
        children.forEach((child) => {
          const childElements = processNodeDeep(
            child,
            activeParameters,
            stats,
            depth + 1,
            maxDepth
          )
          elements.push(...childElements)
        })
      }
    })

    debug.log(DebugCategories.DATA, `Processing node at depth ${depth}:`, {
      totalNodes: stats.totalNodes,
      processedNodes: stats.processedNodes,
      skippedNodes: stats.skippedNodes,
      nodeId: node?.id || node?.model?.raw?.id || 'unknown',
      hasRaw: !!node?.raw || !!node?.model?.raw,
      childrenCounts: {
        children: Array.isArray(node?.children) ? node.children.length : 0,
        modelChildren: Array.isArray(node?.model?.children)
          ? node.model.children.length
          : 0,
        elements: Array.isArray(node?.elements) ? node.elements.length : 0,
        rawChildren: Array.isArray(node?.raw?.children) ? node.raw.children.length : 0,
        rawElements: Array.isArray(node?.raw?.elements) ? node.raw.elements.length : 0
      }
    })
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Error processing node:', {
      error: err instanceof Error ? err.message : String(err),
      nodeId: node?.id || node?.model?.raw?.id || 'unknown',
      depth
    })
  }

  return elements
}

function processNode(
  node: TreeNode,
  activeParameters: string[],
  stats: ProcessingStats
): ElementData[] {
  return processNodeDeep(node, activeParameters, stats)
}

function convertViewerTreeNode(node: ViewerTree['_root']): TreeNode {
  // Handle potentially undefined model more gracefully
  return {
    model: node.model || {},
    children: node.children || []
  }
}

export function useBIMElements(): UseBIMElementsReturn {
  const allElements = ref<ElementData[]>([])
  const rawWorldTree = ref<ViewerTree | null>(null)
  const rawTreeNodes = ref<TreeItemComponentModel[]>([])
  const isLoading = ref(false)
  const hasError = ref(false)
  const isInitialized = ref(false)
  const viewerState = useInjectedViewerState()

  async function initializeElements(
    activeParameters: string[] = defaultColumns.map((col) => col.field)
  ): Promise<void> {
    try {
      isLoading.value = true
      hasError.value = false

      debug.startState('BIM element initialization')

      // Get world tree from viewer
      const worldTreeValue = viewerState?.viewer?.metadata?.worldTree?.value
      if (!worldTreeValue?._root) {
        debug.warn(DebugCategories.STATE, 'World tree not available')
        return
      }

      const stats = {
        totalNodes: 0,
        skippedNodes: 0,
        processedNodes: 0
      }

      // Process the nodes
      const processedElements = await Promise.resolve(
        processNode(
          convertViewerTreeNode(worldTreeValue._root),
          activeParameters,
          stats
        )
      )

      // Update refs with processed data
      allElements.value = processedElements
      rawWorldTree.value = worldTreeValue
      isInitialized.value = true

      debug.completeState('BIM element initialization')
      debug.log(DebugCategories.DATA, 'Processing complete', {
        elementCount: processedElements.length,
        categories: [...new Set(processedElements.map((el) => el.category))],
        firstElement: processedElements[0],
        stats
      })
    } catch (error) {
      debug.error(DebugCategories.ERROR, 'BIM element initialization failed:', error)
      hasError.value = true
      throw error // Propagate error for proper handling
    } finally {
      isLoading.value = false
    }
  }

  // Watch for world tree updates
  const stopWorldTreeWatch = watch(
    () => viewerState?.viewer?.metadata?.worldTree?.value,
    async (worldTree) => {
      try {
        if (!worldTree?._root) {
          debug.warn(DebugCategories.STATE, 'World tree not available')
          return
        }

        debug.log(DebugCategories.INITIALIZATION, 'World tree updated', {
          hasRoot: !!worldTree._root,
          timestamp: new Date().toISOString()
        })

        await initializeElements()
      } catch (error) {
        debug.error(DebugCategories.ERROR, 'World tree update failed:', error)
        hasError.value = true
      }
    },
    { immediate: true }
  )

  return {
    allElements,
    rawWorldTree,
    rawTreeNodes,
    isLoading,
    hasError,
    initializeElements,
    stopWorldTreeWatch
  }
}
