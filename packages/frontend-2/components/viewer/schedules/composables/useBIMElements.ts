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
  TreeNode,
  DeepBIMNode
} from '../types'
import { useDebug, DebugCategories } from '../debug/useDebug'
import { useInjectedViewerState } from '~~/lib/viewer/composables/setup'
import { defaultColumns } from '../config/defaultColumns'

// Initialize debug
const debug = useDebug()

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
  initializeElements: (
    activeParameters?: string[],
    selectedChildCategories?: string[]
  ) => Promise<void>
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

function findPropertyInGroups(raw: BIMNodeRaw, propertyName: string): string | null {
  // Helper to safely check group
  function getFromGroup(group: unknown, name: string): string | null {
    if (group && typeof group === 'object' && name in group) {
      const value = (group as Record<string, unknown>)[name]
      return value ? String(value) : null
    }
    return null
  }

  // First check Identity Data
  const identityValue = getFromGroup(raw['Identity Data'], propertyName)
  if (identityValue) return identityValue

  // Check parameters
  const paramValue = getFromGroup(raw.parameters, propertyName)
  if (paramValue) return paramValue

  // Check all other groups
  for (const [key, value] of Object.entries(raw)) {
    if (key !== 'parameters' && typeof value === 'object' && value) {
      const groupValue = getFromGroup(value, propertyName)
      if (groupValue) return groupValue
    }
  }

  return null
}

function processParentChildRelationships(
  elements: ElementData[],
  selectedChildCategories: string[]
): ElementData[] {
  // Create a map of mark to element for quick lookups
  const markToElement = new Map<string, ElementData>()
  const processedElements: ElementData[] = []
  const childElements: ElementData[] = []
  const ungroupedChildren: ElementData[] = []

  // First pass: identify parents and create mark lookup
  elements.forEach((element) => {
    const processed = { ...element }

    // If element's category is in selectedChildCategories, it's always a child
    if (selectedChildCategories.includes(element.category)) {
      processed.isChild = true
      childElements.push(processed)
    } else {
      // Not in child categories, so it's a parent
      processed.isChild = false
      processed.details = []
      processedElements.push(processed)
      // Add to mark lookup if it's a parent
      if (processed.mark) {
        markToElement.set(processed.mark, processed)
      }
    }
  })

  // Second pass: process child elements
  childElements.forEach((child) => {
    // If child has a host and that host exists as a parent's mark,
    // add it to that parent's details
    if (child.host && markToElement.has(child.host)) {
      const hostElement = markToElement.get(child.host)
      if (hostElement) {
        hostElement.details.push(child)
      }
    } else {
      // No valid host, add to ungrouped
      ungroupedChildren.push(child)
    }
  })

  // Create "Ungrouped" parent if we have any ungrouped children
  if (ungroupedChildren.length > 0) {
    const ungroupedParent: ElementData = {
      id: 'ungrouped',
      type: 'Group',
      mark: 'Ungrouped',
      category: 'Groups',
      parameters: {},
      details: ungroupedChildren,
      _visible: true,
      isChild: false
    }
    processedElements.push(ungroupedParent)
  }

  return processedElements
}

function extractElementData(
  raw: BIMNodeRaw,
  activeParameters: string[]
): ElementData | null {
  try {
    // Get top-level properties from BIM data
    const id = raw.id.toString()
    const mark = findPropertyInGroups(raw, 'Mark') || id
    const category =
      raw.Other?.Category || findPropertyInGroups(raw, 'Category') || 'Uncategorized'
    const host = raw.Constraints?.Host || findPropertyInGroups(raw, 'Host')
    const type = raw.speckleType || raw.type || 'Unknown'

    // Extract parameters separately
    const parameters = extractParameters(raw, activeParameters)

    const element = createEmptyElement(id, type, mark, category, parameters)

    // Add host if found
    if (host) {
      element.host = host
    }

    // Make _raw enumerable for debug panel
    Object.defineProperty(element, '_raw', {
      value: raw,
      enumerable: true,
      configurable: true
    })

    return element
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Error extracting element data:', err)
    return null
  }
}

function processNodeDeep(
  node: DeepBIMNode,
  activeParameters: string[],
  stats: ProcessingStats,
  processedIds: Set<string> = new Set(),
  depth = 0,
  maxDepth = 10
): ElementData[] {
  const elements: ElementData[] = []

  if (depth >= maxDepth) {
    return elements
  }

  try {
    // Helper function to process raw data
    const processRawData = (raw: BIMNodeRaw) => {
      stats.totalNodes++

      // Skip if we've already processed this ID
      if (raw.id && processedIds.has(raw.id.toString())) {
        stats.skippedNodes++
        return
      }

      if (hasValidSpeckleType(raw)) {
        const element = extractElementData(raw, activeParameters)
        if (element) {
          elements.push(element)
          // Add ID to processed set
          processedIds.add(raw.id.toString())
          stats.processedNodes++
        } else {
          stats.skippedNodes++
        }
      } else {
        stats.skippedNodes++
      }
    }

    // Process current node's raw data if it exists
    if (node.raw) {
      processRawData(node.raw)
    }

    // Process model's raw data only if it's different from node's raw data
    if (node.model?.raw && (!node.raw || node.model.raw.id !== node.raw.id)) {
      processRawData(node.model.raw)
    }

    // Collect unique children
    const uniqueChildren = new Set([
      ...(node.children || []),
      ...(node.model?.children || []),
      ...(node.elements || [])
    ])

    // Process each unique child
    for (const child of uniqueChildren) {
      if (child) {
        const childElements = processNodeDeep(
          child,
          activeParameters,
          stats,
          processedIds,
          depth + 1,
          maxDepth
        )
        elements.push(...childElements)
      }
    }
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Error processing node:', {
      error: err instanceof Error ? err.message : String(err),
      nodeId: node.id || node.model?.raw?.id || 'unknown',
      depth
    })
  }

  return elements
}

function processNode(
  node: TreeNode,
  activeParameters: string[],
  stats: ProcessingStats,
  selectedChildCategories: string[]
): ElementData[] {
  const processedIds = new Set<string>()
  // First collect all elements
  const elements = processNodeDeep(node, activeParameters, stats, processedIds)
  // Then process parent-child relationships
  return processParentChildRelationships(elements, selectedChildCategories)
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
  const currentChildCategories = ref<string[]>([]) // Track current child categories

  async function initializeElements(
    activeParameters: string[] = defaultColumns.map((col) => col.field),
    selectedChildCategories: string[] = []
  ): Promise<void> {
    try {
      isLoading.value = true
      hasError.value = false

      debug.startState(DebugCategories.INITIALIZATION, 'Initializing BIM elements')

      // Update current child categories
      currentChildCategories.value = selectedChildCategories

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

      // Process the nodes with current child categories
      const processedElements = await Promise.resolve(
        processNode(
          convertViewerTreeNode(worldTreeValue._root),
          activeParameters,
          stats,
          currentChildCategories.value
        )
      )

      // Update refs with processed data
      allElements.value = processedElements
      rawWorldTree.value = worldTreeValue
      isInitialized.value = true

      debug.completeState(DebugCategories.INITIALIZATION, 'BIM elements initialized', {
        elementCount: processedElements.length,
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

        // Use current child categories when reinitializing
        await initializeElements(undefined, currentChildCategories.value)
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
