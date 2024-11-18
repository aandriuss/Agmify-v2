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
import { ViewerInitializationError } from '../core/composables/useViewerInitialization'
import { useInjectedViewerState } from '~~/lib/viewer/composables/setup'

interface UseBIMElementsReturn {
  allElements: Ref<ElementData[]>
  rawWorldTree: Ref<WorldTreeNode | null>
  rawTreeNodes: Ref<TreeItemComponentModel[]>
  isLoading: Ref<boolean>
  hasError: Ref<boolean>
  initializeElements: () => Promise<void>
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

interface ParameterGroups {
  _groups: Record<string, string>
}

type ParametersWithGroups = Record<string, ParameterValue> & ParameterGroups

function extractParameters(raw: BIMNodeRaw): ParametersWithGroups {
  const parameters: Record<string, ParameterValue> = {}
  const parameterGroups: Record<string, string> = {}

  function processGroup(
    group: Record<string, unknown>,
    groupName: string,
    skipFields: string[] = []
  ) {
    Object.entries(group).forEach(([key, value]) => {
      if (!skipFields.includes(key)) {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          processGroup(value as Record<string, unknown>, `${groupName}.${key}`)
        } else if (
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean'
        ) {
          const paramKey = `${groupName}.${key}`
          parameters[paramKey] = value as ParameterValue
          parameterGroups[paramKey] = groupName

          debug.log(DebugCategories.PARAMETERS, 'Found parameter in group', {
            group: groupName,
            key,
            value,
            fullPath: paramKey
          })
        }
      }
    })
  }

  // Process Identity Data
  if (raw['Identity Data']) {
    processGroup(raw['Identity Data'], 'Identity Data', ['Mark'])
  }

  // Process Constraints
  if (raw.Constraints) {
    processGroup(raw.Constraints, 'Constraints')
  }

  // Process Other
  if (raw.Other) {
    processGroup(raw.Other, 'Other', ['Category'])
  }

  // Process top-level parameters
  const specialFields = [
    'id',
    'type',
    'Name',
    'Mark',
    'speckle_type',
    'Tag',
    'Identity Data',
    'Constraints',
    'Other'
  ]

  Object.entries(raw).forEach(([key, value]) => {
    if (!specialFields.includes(key)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        processGroup(value as Record<string, unknown>, key)
      } else if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      ) {
        parameters[key] = value as ParameterValue
        parameterGroups[key] = 'Top Level'

        debug.log(DebugCategories.PARAMETERS, 'Found top-level parameter', {
          key,
          value
        })
      }
    }
  })

  const result = parameters as ParametersWithGroups
  result._groups = parameterGroups

  debug.log(DebugCategories.PARAMETERS, 'Extracted parameters', {
    totalParameters: Object.keys(parameters).length,
    groups: [...new Set(Object.values(parameterGroups))],
    parameters: Object.keys(parameters).map((key) => ({
      key,
      group: parameterGroups[key]
    }))
  })

  return result
}

function createEmptyElement(
  id: string,
  type: string,
  mark: string,
  category: string,
  parameters: ParametersWithGroups
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
    if (key !== '_groups') {
      element[key] = value
    }
  })

  return element
}

function hasValidSpeckleType(raw: BIMNodeRaw): boolean {
  const typeValue = raw['speckle_type']
  return typeof typeValue === 'string' && typeValue.trim() !== ''
}

function extractElementData(raw: BIMNodeRaw): ElementData | null {
  try {
    if (!hasValidSpeckleType(raw)) {
      debug.log(DebugCategories.DATA, 'Skipping element without valid type', {
        id: raw.id,
        type: raw.type,
        speckleType: raw['speckle_type']
      })
      return null
    }

    const speckleType = raw['speckle_type'] as string
    const category = getMostSpecificCategory(speckleType) || 'Uncategorized'

    const mark =
      convertToString(raw['Identity Data']?.Mark) ||
      convertToString(raw.Tag) ||
      convertToString(raw.Mark) ||
      raw.id.toString()

    const parameters = extractParameters(raw)

    const element = createEmptyElement(
      raw.id.toString(),
      speckleType,
      mark,
      category,
      parameters
    )

    Object.defineProperty(element, '_raw', {
      value: raw,
      enumerable: false,
      configurable: true
    })

    debug.log(DebugCategories.DATA, 'Element data extracted', {
      id: element.id,
      speckleType,
      category,
      mark,
      parameterCount: Object.keys(parameters).length,
      parameterGroups: [...new Set(Object.values(parameters._groups))]
    })

    return element
  } catch (error) {
    debug.error(DebugCategories.ERROR, 'Error extracting element data:', error)
    return null
  }
}

function processNode(
  node: TreeNode,
  stats: ProcessingStats = { totalNodes: 0, skippedNodes: 0, processedNodes: 0 }
): ElementData[] {
  const elements: ElementData[] = []

  try {
    if (node.model?.raw) {
      stats.totalNodes++
      if (hasValidSpeckleType(node.model.raw)) {
        const element = extractElementData(node.model.raw)
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
            const element = extractElementData(child.raw)
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
        const childElements = processNode(child, stats)
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
      parameterGroups: [
        ...new Set(
          elements.flatMap((el) =>
            Object.values((el.parameters as ParametersWithGroups)?._groups || {})
          )
        )
      ]
    })
  } catch (error) {
    debug.error(DebugCategories.ERROR, 'Error processing node:', error)
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

  async function waitForWorldTree(maxAttempts = 10, interval = 500): Promise<void> {
    if (!viewer.instance) {
      throw new ViewerInitializationError('Viewer instance not available')
    }

    let attempts = 0
    while (attempts < maxAttempts) {
      if (viewer.metadata.worldTree.value) {
        return
      }
      await new Promise((resolve) => setTimeout(resolve, interval))
      attempts++
    }
    throw new ValidationError('Timeout waiting for WorldTree initialization')
  }

  async function initializeElements(): Promise<void> {
    try {
      isLoading.value = true
      hasError.value = false

      if (!viewer.instance) {
        throw new ViewerInitializationError('Viewer instance not available')
      }

      await waitForWorldTree()

      debug.log(DebugCategories.INITIALIZATION, 'Starting element initialization', {
        hasWorldTree: !!viewer.metadata.worldTree.value,
        isViewerInitialized: !!viewer.init.ref.value
      })

      if (!viewer.metadata.worldTree.value) {
        debug.error(DebugCategories.VALIDATION, 'WorldTree is null or undefined')
        throw new ValidationError('WorldTree is null or undefined')
      }

      const tree = viewer.metadata.worldTree.value as unknown as {
        _root: TreeNode
      }
      if (!tree._root) {
        debug.error(DebugCategories.VALIDATION, 'No root found')
        throw new ValidationError('No root found')
      }

      const stats: ProcessingStats = {
        totalNodes: 0,
        skippedNodes: 0,
        processedNodes: 0
      }
      const processedElements = processNode(tree._root, stats)

      debug.log(DebugCategories.DATA, 'Element processing statistics', {
        totalNodes: stats.totalNodes,
        processedNodes: stats.processedNodes,
        skippedNodes: stats.skippedNodes,
        processingRatio: `${((stats.processedNodes / stats.totalNodes) * 100).toFixed(
          2
        )}%`,
        categories: [...new Set(processedElements.map((el) => el.category))],
        parameterStats: {
          totalParameters: processedElements.reduce(
            (acc, el) => acc + Object.keys(el.parameters || {}).length,
            0
          ),
          averageParameters:
            processedElements.length > 0
              ? processedElements.reduce(
                  (acc, el) => acc + Object.keys(el.parameters || {}).length,
                  0
                ) / processedElements.length
              : 0,
          parameterGroups: [
            ...new Set(
              processedElements.flatMap((el) =>
                Object.values((el.parameters as ParametersWithGroups)?._groups || {})
              )
            )
          ]
        }
      })

      allElements.value = processedElements
    } catch (error) {
      debug.error(DebugCategories.ERROR, 'Error initializing BIM elements:', error)
      hasError.value = true
      allElements.value = []
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // Initialize watchers
  const stopWorldTreeWatch = watch(
    () => viewer.metadata.worldTree.value,
    async (newWorldTree) => {
      if (newWorldTree && viewer.init.ref.value) {
        const tree = newWorldTree as unknown as { _root: TreeNode }
        debug.log(DebugCategories.DATA, 'WorldTree updated', {
          hasRoot: !!tree._root,
          rootChildren: tree._root?.children?.length,
          rootModel: !!tree._root?.model
        })
        await initializeElements()
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
