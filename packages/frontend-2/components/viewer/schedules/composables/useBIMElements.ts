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
  initializeElements: (activeParameters?: string[]) => Promise<void>
  stopWorldTreeWatch: () => void
}

interface ProcessingStats {
  totalNodes: number
  skippedNodes: number
  processedNodes: number
}

function inferType(paramName: string, value: unknown): ParameterValueType {
  if (paramName in parameterMapping) {
    return parameterMapping[paramName].type
  }

  if (typeof value === 'boolean') return 'boolean'
  if (
    typeof value === 'number' ||
    (typeof value === 'string' && !isNaN(parseFloat(value)))
  )
    return 'number'
  return 'string'
}

function transformValue(value: unknown, type: ParameterValueType): ParameterValue {
  if (value === null || value === undefined) return null

  if (value && typeof value === 'object' && '_' in value) {
    value = (value as { _: unknown })._
  }

  switch (type) {
    case 'boolean':
      return typeof value === 'boolean' ? value : null

    case 'number':
      if (typeof value === 'number') return isNaN(value) ? null : value
      if (typeof value === 'string') {
        const trimmed = value.trim()
        if (trimmed.endsWith('%')) {
          const num = parseFloat(trimmed)
          return isNaN(num) ? null : num / 100
        }
        if (trimmed.startsWith('$')) {
          const num = parseFloat(trimmed.substring(1))
          return isNaN(num) ? null : num
        }
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
  if (typeof raw.speckleType === 'string' && raw.speckleType.trim() !== '') {
    return true
  }

  if (typeof raw.type === 'string' && raw.type.trim() !== '') {
    return true
  }

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
  const mapping = parameterMapping[paramName] || { names: [paramName], type: 'string' }

  for (const name of mapping.names) {
    if (raw.parameters?.[name] !== undefined) {
      return raw.parameters[name]
    }

    if (name === 'mark' && raw.Mark !== undefined) {
      return raw.Mark
    }
    if (name === 'category' && raw.Other?.Category !== undefined) {
      return raw.Other.Category
    }
    if (name === 'host' && raw.Constraints?.Host !== undefined) {
      return raw.Constraints.Host
    }

    if (name in raw) {
      return raw[name]
    }
  }

  return null
}

function findPropertyInGroups(raw: BIMNodeRaw, propertyName: string): string | null {
  function getFromGroup(group: unknown, name: string): string | null {
    if (group && typeof group === 'object' && name in group) {
      const value = (group as Record<string, unknown>)[name]
      return value ? String(value) : null
    }
    return null
  }

  const identityValue = getFromGroup(raw['Identity Data'], propertyName)
  if (identityValue) return identityValue

  const paramValue = getFromGroup(raw.parameters, propertyName)
  if (paramValue) return paramValue

  for (const [key, value] of Object.entries(raw)) {
    if (key !== 'parameters' && typeof value === 'object' && value) {
      const groupValue = getFromGroup(value, propertyName)
      if (groupValue) return groupValue
    }
  }

  return null
}

function findCategoryInGroups(raw: BIMNodeRaw): string | null {
  const otherCategory = raw.Other?.Category
  if (typeof otherCategory === 'string') {
    return normalizeCategory(otherCategory)
  }

  const identityData = raw['Identity Data'] as Record<string, unknown> | undefined
  const identityCategory = identityData?.Category
  if (typeof identityCategory === 'string') {
    return normalizeCategory(identityCategory)
  }

  const parameters = raw.parameters as Record<string, unknown> | undefined
  if (parameters) {
    const paramCategory = parameters.Category
    if (typeof paramCategory === 'string') {
      return normalizeCategory(paramCategory)
    }

    const categoryKey = Object.keys(parameters).find(
      (key) => key.toLowerCase() === 'category'
    )
    if (categoryKey && typeof parameters[categoryKey] === 'string') {
      return normalizeCategory(parameters[categoryKey] as string)
    }
  }

  const directCategory = (raw as Record<string, unknown>).Category
  if (typeof directCategory === 'string') {
    return normalizeCategory(directCategory)
  }

  return null
}

function normalizeCategory(category: string): string {
  return category
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

function extractElementData(
  raw: BIMNodeRaw,
  activeParameters: string[]
): ElementData | null {
  try {
    const id = raw.id.toString()
    const mark = findPropertyInGroups(raw, 'Mark') || id
    const category = findCategoryInGroups(raw) || 'Uncategorized'
    const host = raw.Constraints?.Host || findPropertyInGroups(raw, 'Host')
    const type = raw.speckleType || raw.type || 'Unknown'

    const parameters = extractParameters(raw, activeParameters)

    const element = createEmptyElement(id, type, mark, category, parameters)

    if (host) {
      element.host = host
    }

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
    const processRawData = (raw: BIMNodeRaw) => {
      stats.totalNodes++

      if (raw.id && processedIds.has(raw.id.toString())) {
        stats.skippedNodes++
        return
      }

      if (hasValidSpeckleType(raw)) {
        const element = extractElementData(raw, activeParameters)
        if (element) {
          elements.push(element)
          processedIds.add(raw.id.toString())
          stats.processedNodes++
        } else {
          stats.skippedNodes++
        }
      } else {
        stats.skippedNodes++
      }
    }

    if (node.raw) {
      processRawData(node.raw)
    }

    if (node.model?.raw && (!node.raw || node.model.raw.id !== node.raw.id)) {
      processRawData(node.model.raw)
    }

    const uniqueChildren = new Set([
      ...(node.children || []),
      ...(node.model?.children || []),
      ...(node.elements || [])
    ])

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
  stats: ProcessingStats
): ElementData[] {
  const processedIds = new Set<string>()
  return processNodeDeep(node, activeParameters, stats, processedIds)
}

function convertViewerTreeNode(node: ViewerTree['_root']): TreeNode {
  return {
    model: node.model || {},
    children: node.children || []
  }
}

function extractParameters(raw: BIMNodeRaw, activeParameters: string[]): Parameters {
  const result: Parameters = {}

  activeParameters.forEach((paramName) => {
    let value = findParameterValue(raw, paramName)

    if (value && typeof value === 'object' && 'currentValue' in value) {
      const paramState = value as ParameterValueState
      value = paramState.currentValue
    }

    const type = inferType(paramName, value)
    const transformedValue = transformValue(value, type)

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

      debug.startState(DebugCategories.INITIALIZATION, 'Initializing BIM elements')

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

      const processedElements = await Promise.resolve(
        processNode(
          convertViewerTreeNode(worldTreeValue._root),
          activeParameters,
          stats
        )
      )

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
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const stopWorldTreeWatch = watch(
    () => viewerState?.viewer?.metadata?.worldTree?.value,
    async (worldTree) => {
      try {
        if (!worldTree?._root) {
          debug.warn(DebugCategories.STATE, 'World tree not available')
          return
        }

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
