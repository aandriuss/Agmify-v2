import { ref, watch } from 'vue'
import type {
  ElementData,
  TreeItemComponentModel,
  BIMNodeRaw,
  WorldTreeNode,
  ParameterValue
} from '../types'
import { useInjectedViewer } from '~~/lib/viewer/composables/setup'
import { debug, DebugCategories } from '../utils/debug'
import { ValidationError } from '../utils/validation'
import { convertToString } from '../utils/dataConversion'
import { getMostSpecificCategory } from '../config/categoryMapping'

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

function createEmptyElement(
  id: string,
  type: string,
  mark: string,
  category: string,
  parameters: Record<string, ParameterValue>
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

function extractElementData(raw: BIMNodeRaw): ElementData | null {
  try {
    const speckleType = (raw.speckle_type || raw.type || 'Unknown').toString()

    // Always create an element, even if it doesn't match our categories
    // This way we have all elements available when no categories are selected
    const category = getMostSpecificCategory(speckleType) || 'Uncategorized'

    const mark =
      convertToString(raw['Identity Data']?.Mark) ||
      convertToString(raw.Tag) ||
      convertToString(raw.Mark) ||
      raw.id.toString()

    const element = createEmptyElement(
      raw.id.toString(),
      speckleType,
      mark,
      category,
      {}
    )

    // Store raw data for debugging but keep it non-enumerable
    Object.defineProperty(element, '_raw', {
      value: raw,
      enumerable: false,
      configurable: true
    })

    debug.log(DebugCategories.DATA, 'Element data extracted', {
      id: element.id,
      speckleType,
      category,
      mark
    })

    return element
  } catch (error) {
    debug.error(DebugCategories.ERROR, 'Error extracting element data:', error)
    return null
  }
}

function processNode(node: TreeNode): ElementData[] {
  const elements: ElementData[] = []

  debug.log(DebugCategories.DATA, 'Processing node', {
    hasModel: !!node.model,
    modelType: node.model?.type,
    speckleType: node.model?.speckle_type,
    childrenCount: node.model?.children?.length || node.children?.length
  })

  try {
    // Process current node if it has raw data
    if (node.model?.raw) {
      const element = extractElementData(node.model.raw)
      if (element) {
        elements.push(element)
      }
    }

    // Process model children if they exist
    if (node.model?.children?.length) {
      node.model.children.forEach((child) => {
        if (child.raw) {
          const element = extractElementData(child.raw)
          if (element) {
            elements.push(element)
          }
        }
      })
    }

    // Process tree children recursively
    if (node.children?.length) {
      node.children.forEach((child) => {
        const childElements = processNode(child)
        elements.push(...childElements)
      })
    }
  } catch (error) {
    debug.error(DebugCategories.ERROR, 'Error processing node:', error)
  }

  return elements
}

export function useBIMElements(): UseBIMElementsReturn {
  const {
    metadata: { worldTree },
    init: { ref: isViewerInitialized }
  } = useInjectedViewer()

  const allElements = ref<ElementData[]>([])
  const rawWorldTree = ref<WorldTreeNode | null>(null)
  const rawTreeNodes = ref<TreeItemComponentModel[]>([])
  const isLoading = ref(false)
  const hasError = ref(false)

  async function waitForWorldTree(maxAttempts = 10, interval = 500): Promise<void> {
    let attempts = 0
    while (attempts < maxAttempts) {
      if (worldTree.value && isViewerInitialized.value) {
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

      await waitForWorldTree()

      debug.log(DebugCategories.INITIALIZATION, 'Starting element initialization', {
        hasWorldTree: !!worldTree.value,
        isViewerInitialized: isViewerInitialized.value
      })

      if (!worldTree.value) {
        debug.error(DebugCategories.VALIDATION, 'WorldTree is null or undefined')
        throw new ValidationError('WorldTree is null or undefined')
      }

      // Cast to access internal structure
      const tree = worldTree.value as unknown as { _root: TreeNode }
      if (!tree._root) {
        debug.error(DebugCategories.VALIDATION, 'No root found')
        throw new ValidationError('No root found')
      }

      const processedElements = processNode(tree._root)

      debug.log(DebugCategories.DATA, 'Element processing statistics', {
        totalElements: processedElements.length,
        categories: [...new Set(processedElements.map((el) => el.category))]
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

  const stopWorldTreeWatch = watch(
    () => worldTree.value,
    async (newWorldTree) => {
      if (newWorldTree) {
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
