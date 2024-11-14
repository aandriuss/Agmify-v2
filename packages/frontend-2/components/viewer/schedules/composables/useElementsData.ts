import { ref, watch, nextTick, shallowRef, computed } from 'vue'
import type { Ref } from 'vue'
import type {
  ElementData,
  TreeItemComponentModel,
  ElementsDataReturn,
  ParameterValue,
  BIMNodeRaw,
  ProcessingState,
  WorldTreeNode,
  BIMNode
} from '../types'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import { useInjectedViewer } from '~~/lib/viewer/composables/setup'
import { debug, DebugCategories } from '../utils/debug'
import { getNestedValue } from '../config/parameters'
import { useParameterDiscovery } from './useParameterDiscovery'
import {
  parentCategories as defaultParentCategories,
  childCategories as defaultChildCategories
} from '../config/categories'
import {
  isValidTreeItemComponentModel,
  isValidWorldTreeNode,
  isValidArray,
  ValidationError
} from '../utils/validation'
import { convertToString } from '../utils/dataConversion'

interface ElementsDataOptions {
  _currentTableColumns: Ref<ColumnDef[]>
  _currentDetailColumns: Ref<ColumnDef[]>
  selectedParentCategories: Ref<string[]>
  selectedChildCategories: Ref<string[]>
}

// Define the expected structure of incoming nodes
interface IncomingNode {
  model?: {
    id?: string | number
    type?: string
    Name?: string
    Mark?: string
    speckleType?: string
    'Identity Data'?: Record<string, unknown>
    Constraints?: Record<string, unknown>
    Other?: Record<string, unknown>
    [key: string]: unknown
  }
  children?: IncomingNode[]
  id?: string | number
  type?: string
  name?: string
  mark?: string
  [key: string]: unknown
}

function getParameterValue(value: unknown): ParameterValue {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return value
  if (typeof value === 'boolean') return value
  return null
}

function createEmptyParameters(columns: ColumnDef[]): Record<string, ParameterValue> {
  return Object.fromEntries(
    columns
      .filter(
        (column): column is ColumnDef & { field: string } =>
          typeof column?.field === 'string' && column.field.length > 0
      )
      .map((column) => [column.field, null as ParameterValue])
  )
}

function createEmptyElement(
  id: string,
  type: string,
  mark: string,
  category: string,
  host: string,
  parameters: Record<string, ParameterValue>
): ElementData {
  return {
    id,
    type,
    mark,
    category,
    host,
    parameters,
    details: [],
    _visible: true
  }
}

function transformToTreeItemComponentModel(node: IncomingNode): TreeItemComponentModel {
  // If the node already has a rawNode property, return it as is
  if ('rawNode' in node) {
    return node as unknown as TreeItemComponentModel
  }

  // Create BIMNode structure from model or direct properties
  const bimNode: BIMNode = {
    raw: {
      id: convertToString(node.model?.id || node.id || ''),
      type: convertToString(node.model?.type || node.type || ''),
      Name: convertToString(node.model?.Name || node.name || ''),
      Mark: convertToString(node.model?.Mark || node.mark || ''),
      speckleType: convertToString(node.model?.speckleType || ''),
      'Identity Data': node.model?.['Identity Data'] || {},
      Constraints: node.model?.Constraints || {},
      Other: node.model?.Other || {},
      // Include all model properties
      ...(node.model || {}),
      // Include direct properties if no model
      ...(!node.model ? node : {})
    }
  }

  // Transform children recursively if they exist
  const children =
    node.children?.map((child) => {
      // Ensure child is treated as IncomingNode
      const incomingChild = child as unknown as IncomingNode
      return transformToTreeItemComponentModel(incomingChild)
    }) || []

  return {
    rawNode: bimNode,
    children
  }
}

function getRootNode(tree: Required<WorldTreeNode>): TreeItemComponentModel | null {
  if (!tree._root?.children?.length) {
    debug.error(DebugCategories.DATA, 'No root node found in WorldTree', tree)
    return null
  }

  // Cast the root node to IncomingNode type since we know its structure
  const rootNode = tree._root.children[0] as unknown as IncomingNode
  debug.log(DebugCategories.DATA, 'Found root node', rootNode)

  // Transform the root node into our expected format
  return transformToTreeItemComponentModel(rootNode)
}

function getHostValue(raw: BIMNodeRaw): string {
  if (!raw.Constraints) return ''
  return convertToString(raw.Constraints.Host)
}

function getFieldPath(field: string): string[] {
  if (!field) return []
  return field
    .split('.')
    .filter((part): part is string => typeof part === 'string' && part.length > 0)
}

export function useElementsData({
  _currentTableColumns,
  _currentDetailColumns,
  selectedParentCategories,
  selectedChildCategories
}: ElementsDataOptions): ElementsDataReturn {
  const {
    metadata: { worldTree }
  } = useInjectedViewer()

  // Core data states
  const scheduleData = ref<ElementData[]>([])
  const allElements = ref<ElementData[]>([])

  // Processing state
  const processingState = ref<ProcessingState>({
    isInitializing: false,
    isProcessingElements: false,
    isUpdatingCategories: false,
    error: null
  })

  // Computed states for UI feedback
  const isLoading = ref(false)
  const hasError = ref(false)

  // Internal category arrays
  const internalCategories = ref({
    parent: [] as string[],
    child: [] as string[]
  })

  // Convert arrays to Sets for external interface
  const availableCategories = computed(() => ({
    parent: new Set<string>(internalCategories.value.parent),
    child: new Set<string>(internalCategories.value.child)
  }))

  // Parameter discovery
  const { availableHeaders, discoverParameters } = useParameterDiscovery({
    selectedParentCategories,
    selectedChildCategories
  })

  // Debug properties using shallowRef for performance
  const debugRawElements = shallowRef<ElementData[]>([])
  const debugParentElements = shallowRef<ElementData[]>([])
  const debugChildElements = shallowRef<ElementData[]>([])
  const debugMatchedElements = shallowRef<ElementData[]>([])
  const debugOrphanedElements = shallowRef<ElementData[]>([])
  const rawWorldTree = ref<WorldTreeNode | null>(null)
  const rawTreeNodes = shallowRef<TreeItemComponentModel[]>([])

  // Step 2: Process elements and get their parameter values
  function processElementsWithParameters(node: TreeItemComponentModel): {
    parents: ElementData[]
    children: ElementData[]
  } {
    const parentElements: ElementData[] = []
    const childElements: ElementData[] = []

    // Get active columns (parameters)
    const activeColumns = [
      ..._currentTableColumns.value,
      ..._currentDetailColumns.value
    ]

    debug.log(DebugCategories.DATA, 'Processing elements with active columns', {
      columnsCount: activeColumns.length,
      selectedParentCategories: selectedParentCategories.value,
      selectedChildCategories: selectedChildCategories.value
    })

    function processNode(treeNode: TreeItemComponentModel) {
      try {
        if (!isValidTreeItemComponentModel(treeNode, true)) {
          debug.error(DebugCategories.VALIDATION, 'Invalid tree node', treeNode)
          return
        }

        const raw = treeNode.rawNode?.raw as BIMNodeRaw | undefined
        if (!raw?.id) {
          debug.error(
            DebugCategories.VALIDATION,
            'Invalid raw node data',
            treeNode.rawNode
          )
          return
        }

        const category =
          convertToString(raw.Other?.Category) ||
          convertToString(raw.type) ||
          'Uncategorized'

        // Only process if category is selected
        if (
          !selectedParentCategories.value.includes(category) &&
          !selectedChildCategories.value.includes(category)
        ) {
          debug.log(DebugCategories.DATA, 'Skipping node - category not selected', {
            category,
            nodeId: raw.id
          })
          return
        }

        // Initialize parameters with null values for active columns only
        const parameters = createEmptyParameters(activeColumns)

        // Then fill in values from raw data only for active parameters
        Object.keys(parameters).forEach((field) => {
          if (typeof field === 'string') {
            const path = getFieldPath(field)
            if (path.length > 0) {
              const rawValue = getNestedValue(raw, path)
              if (rawValue !== undefined) {
                parameters[field] = getParameterValue(rawValue)
              }
            }
          }
        })

        const mark =
          convertToString(raw['Identity Data']?.Mark) ||
          convertToString(raw.Tag) ||
          convertToString(raw.Mark) ||
          raw.id.toString()

        const element = createEmptyElement(
          raw.id.toString(),
          convertToString(raw.type) || 'Unknown',
          mark,
          category,
          getHostValue(raw),
          parameters
        )

        Object.defineProperty(element, '_raw', {
          value: raw,
          enumerable: false,
          configurable: true
        })

        // Add to appropriate array based on category
        if (selectedParentCategories.value.includes(category)) {
          parentElements.push(element)
          debug.log(DebugCategories.DATA, 'Added parent element', {
            id: element.id,
            category: element.category,
            mark: element.mark
          })
        }
        if (selectedChildCategories.value.includes(category)) {
          childElements.push(element)
          debug.log(DebugCategories.DATA, 'Added child element', {
            id: element.id,
            category: element.category,
            mark: element.mark,
            host: element.host
          })
        }

        // Process children recursively
        if (isValidArray(treeNode.children)) {
          treeNode.children.forEach((child) => {
            if (isValidTreeItemComponentModel(child)) {
              processNode(child)
            }
          })
        }
      } catch (error) {
        if (error instanceof ValidationError) {
          debug.error(DebugCategories.ERROR, 'Validation error:', error)
        } else {
          debug.error(DebugCategories.ERROR, 'Error processing node:', error)
        }
      }
    }

    processNode(node)
    debug.log(DebugCategories.DATA, 'Finished processing elements', {
      parentCount: parentElements.length,
      childCount: childElements.length
    })
    return { parents: parentElements, children: childElements }
  }

  // Step 3: Nest elements by mark/host relationships
  function nestElements(
    parents: ElementData[],
    children: ElementData[]
  ): ElementData[] {
    const result = [...parents]
    const parentsByMark = new Map<string, ElementData>()
    const parentsById = new Map<string, ElementData>()

    debug.log(DebugCategories.DATA, 'Starting element nesting', {
      parentCount: parents.length,
      childCount: children.length
    })

    // Create lookup maps
    parents.forEach((parent) => {
      if (parent.mark) parentsByMark.set(parent.mark, parent)
      if (parent.id) parentsById.set(parent.id, parent)
    })

    // Match children to parents
    children.forEach((child) => {
      if (child.host) {
        const parent = parentsByMark.get(child.host) || parentsById.get(child.host)
        if (parent) {
          parent.details = parent.details || []
          parent.details.push(child)
          debug.log(DebugCategories.DATA, 'Nested child under parent', {
            childId: child.id,
            parentId: parent.id,
            parentMark: parent.mark
          })
        } else {
          debug.warn(DebugCategories.DATA, 'Could not find parent for child', {
            childId: child.id,
            hostValue: child.host
          })
        }
      }
    })

    debug.log(DebugCategories.DATA, 'Finished nesting elements', {
      resultCount: result.length,
      nestedChildrenCount: result.reduce(
        (acc, parent) => acc + (parent.details?.length || 0),
        0
      )
    })

    return result
  }

  async function updateCategories(
    parentCategories: string[],
    childCategories: string[]
  ): Promise<void> {
    try {
      processingState.value.isUpdatingCategories = true

      debug.log(DebugCategories.DATA, 'Updating categories', {
        parentCategories,
        childCategories,
        currentElementCount: allElements.value.length
      })

      scheduleData.value = allElements.value
        .map((element) => {
          const isParentVisible =
            parentCategories.length === 0 || parentCategories.includes(element.category)
          const visibleDetails =
            element.details?.filter(
              (child) =>
                childCategories.length === 0 || childCategories.includes(child.category)
            ) || []

          return {
            ...element,
            _visible: isParentVisible || visibleDetails.length > 0,
            details: visibleDetails
          }
        })
        .filter((element) => element._visible)

      debug.log(DebugCategories.DATA, 'Categories updated', {
        visibleElementCount: scheduleData.value.length
      })

      await nextTick()
    } catch (error) {
      debug.error(DebugCategories.ERROR, 'Error updating categories:', error)
      throw error
    } finally {
      processingState.value.isUpdatingCategories = false
    }
  }

  // Watch worldTree for changes
  const stopWorldTreeWatch = watch(
    () => worldTree.value,
    async (newWorldTree) => {
      try {
        if (!isValidWorldTreeNode(newWorldTree, true)) {
          debug.error(
            DebugCategories.VALIDATION,
            'Invalid WorldTree data',
            newWorldTree
          )
          return
        }

        const rootNode = getRootNode(newWorldTree)
        if (!rootNode || !isValidTreeItemComponentModel(rootNode, true)) {
          debug.error(
            DebugCategories.VALIDATION,
            'Invalid root node structure',
            rootNode
          )
          return
        }

        rawWorldTree.value = newWorldTree

        // Only proceed with parameter discovery and data processing if categories are selected
        if (
          selectedParentCategories.value.length === 0 &&
          selectedChildCategories.value.length === 0
        ) {
          debug.log(
            DebugCategories.DATA,
            'No categories selected, skipping data processing'
          )
          allElements.value = []
          scheduleData.value = []
          return
        }

        // Step 1: Discover parameters based on categories
        await discoverParameters(rootNode)

        // Step 2: Process elements with active parameters
        const { parents, children } = processElementsWithParameters(rootNode)

        // Step 3: Nest elements by mark/host relationships
        const processedElements = nestElements(parents, children)

        allElements.value = processedElements
        scheduleData.value = processedElements

        debug.log(DebugCategories.DATA, 'WorldTree processing complete', {
          processedElementCount: processedElements.length,
          parentCount: parents.length,
          childCount: children.length
        })

        await nextTick()
      } catch (error) {
        if (error instanceof ValidationError) {
          debug.error(DebugCategories.ERROR, 'Validation error:', error)
        } else {
          debug.error(DebugCategories.ERROR, 'Error processing world tree:', error)
        }
      }
    },
    { deep: true }
  )

  async function initializeData(): Promise<void> {
    try {
      isLoading.value = true
      processingState.value.isInitializing = true
      processingState.value.error = null

      debug.log(DebugCategories.INITIALIZATION, 'Starting data initialization')

      // Wait for WorldTree to be available
      let retryCount = 0
      while (!isValidWorldTreeNode(worldTree.value) && retryCount < 50) {
        await new Promise((resolve) => setTimeout(resolve, 100))
        retryCount++
      }

      if (!isValidWorldTreeNode(worldTree.value, true)) {
        throw new ValidationError('No WorldTree data available after retries')
      }

      const rootNode = getRootNode(worldTree.value)
      if (!rootNode || !isValidTreeItemComponentModel(rootNode, true)) {
        throw new ValidationError('Invalid WorldTree structure')
      }

      rawWorldTree.value = worldTree.value

      // Only proceed with parameter discovery and data processing if categories are selected
      if (
        selectedParentCategories.value.length === 0 &&
        selectedChildCategories.value.length === 0
      ) {
        debug.log(
          DebugCategories.DATA,
          'No categories selected, skipping data processing'
        )
        allElements.value = []
        scheduleData.value = []
        return
      }

      // Step 1: Discover parameters based on categories
      await discoverParameters(rootNode)

      // Step 2: Process elements with active parameters
      const { parents, children } = processElementsWithParameters(rootNode)

      // Step 3: Nest elements by mark/host relationships
      const processedElements = nestElements(parents, children)

      allElements.value = processedElements
      scheduleData.value = processedElements

      debug.log(DebugCategories.INITIALIZATION, 'Data initialization complete', {
        elementCount: processedElements.length
      })

      await nextTick()
    } catch (error) {
      debug.error(DebugCategories.ERROR, 'Error initializing data:', error)
      processingState.value.error =
        error instanceof Error ? error : new Error('Failed to initialize data')
      hasError.value = true
      allElements.value = []
      scheduleData.value = []
      throw error
    } finally {
      isLoading.value = false
      processingState.value.isInitializing = false
    }
  }

  // Rest of the code remains the same...

  return {
    scheduleData,
    availableHeaders,
    availableCategories,
    updateCategories,
    initializeData,
    stopWorldTreeWatch: () => stopWorldTreeWatch(),
    // Processing state
    isLoading,
    hasError,
    processingState,
    // Raw data for debugging
    rawWorldTree,
    rawTreeNodes,
    // Debug properties
    rawElements: debugRawElements,
    parentElements: debugParentElements,
    childElements: debugChildElements,
    matchedElements: debugMatchedElements,
    orphanedElements: debugOrphanedElements
  }
}
