import { ref, watch, nextTick } from 'vue'
import type { Ref } from 'vue'
import type {
  ElementData,
  TreeItemComponentModel,
  AvailableHeaders,
  ElementsDataReturn,
  ParameterValue,
  BIMNodeRaw
} from '../types'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import { useInjectedViewer } from '~~/lib/viewer/composables/setup'
import { debug, DebugCategories } from '../utils/debug'
import { BASIC_PARAMETERS, getNestedValue } from '../config/parameters'
import {
  parentCategories as defaultParentCategories,
  childCategories as defaultChildCategories
} from '../config/categories'

interface ElementsDataOptions {
  currentTableColumns: Ref<ColumnDef[]>
  currentDetailColumns: Ref<ColumnDef[]>
  isInitialized?: Ref<boolean>
}

interface WorldTreeNode {
  _root?: {
    type?: string
    children?: TreeItemComponentModel[]
  }
}

export function useElementsData({
  isInitialized
}: ElementsDataOptions): ElementsDataReturn {
  const {
    metadata: { worldTree }
  } = useInjectedViewer()

  const scheduleData = ref<ElementData[]>([])
  const availableHeaders = ref<AvailableHeaders>({
    parent: [],
    child: []
  })

  // Use predefined categories from config
  const availableCategories = ref<{
    parent: Set<string>
    child: Set<string>
  }>({
    parent: new Set(defaultParentCategories),
    child: new Set(defaultChildCategories)
  })

  function processElements(nodes: TreeItemComponentModel[]): ElementData[] {
    const result: ElementData[] = []

    function processNode(node: TreeItemComponentModel): void {
      const raw = node.rawNode?.raw as BIMNodeRaw | undefined
      debug.log(DebugCategories.DATA, 'Processing raw node:', {
        timestamp: new Date().toISOString(),
        hasRawNode: !!node.rawNode,
        hasRaw: !!raw,
        speckleType: raw?.speckle_type,
        id: raw?.id,
        mark: raw?.['Identity Data']?.Mark || raw?.Tag,
        category: raw?.Other?.Category,
        host: raw?.Constraints?.Host,
        childCount: node.children?.length || 0
      })

      if (raw) {
        // Create element from raw data
        if (raw.speckle_type?.startsWith('IFC')) {
          const parameters: Record<string, ParameterValue> = {}

          // Add basic parameters
          BASIC_PARAMETERS.forEach((param) => {
            const rawValue = getNestedValue(raw, param.path) as string | undefined
            const value = rawValue
              ? String(rawValue)
              : (raw[param.fallback] as string | undefined) || ''
            if (value) {
              parameters[param.name] = value
            }
          })

          const category = (raw.Other?.Category as string) || 'Uncategorized'
          const mark =
            (raw['Identity Data']?.Mark as string) || (raw.Tag as string) || ''

          const element: ElementData = {
            id: raw.id || '',
            type: raw.speckle_type || 'Unknown',
            mark,
            category,
            host: (raw.Constraints?.Host as string) || '',
            parameters,
            details: [] // Will be populated with child elements later
          }

          // Add to result array
          result.push(element)
          debug.log(DebugCategories.DATA, 'Processed element:', {
            timestamp: new Date().toISOString(),
            element,
            parameters: Object.keys(parameters),
            hasRequiredFields: !!(element.id && element.mark && element.category)
          })
        }
      }

      // Process children recursively
      if (node.children?.length) {
        node.children.forEach((child) => processNode(child))
      }
    }

    debug.log(DebugCategories.DATA, 'Starting node processing:', {
      timestamp: new Date().toISOString(),
      nodeCount: nodes.length,
      firstNodeType: nodes[0]?.rawNode?.raw?.speckle_type
    })
    nodes.forEach((node) => processNode(node))

    debug.log(DebugCategories.DATA, 'Processing complete:', {
      timestamp: new Date().toISOString(),
      total: result.length,
      elements: result.map((el) => ({
        id: el.id,
        type: el.type,
        mark: el.mark,
        category: el.category,
        parameterCount: Object.keys(el.parameters || {}).length
      }))
    })

    return result
  }

  async function updateCategories(
    parentCategories: string[],
    childCategories: string[]
  ): Promise<void> {
    debug.log(DebugCategories.CATEGORIES, 'Updating category visibility:', {
      timestamp: new Date().toISOString(),
      selectedParent: parentCategories,
      selectedChild: childCategories,
      currentDataCount: scheduleData.value.length
    })

    // Update visibility based on selected categories
    // Don't reload data, just update visibility flags
    scheduleData.value = scheduleData.value.map((item) => ({
      ...item,
      _visible: parentCategories.includes(item.category),
      details:
        item.details?.filter((child) => childCategories.includes(child.category)) || []
    }))

    debug.log(DebugCategories.CATEGORIES, 'Category visibility updated:', {
      timestamp: new Date().toISOString(),
      visibleItems: scheduleData.value.filter((item) => item._visible).length,
      totalItems: scheduleData.value.length,
      itemsWithDetails: scheduleData.value.filter(
        (item) => (item.details?.length ?? 0) > 0
      ).length
    })

    await nextTick()
  }

  // Only watch worldTree for initial data load
  const stopWorldTreeWatch = watch(
    () => worldTree.value as WorldTreeNode | undefined,
    async (newWorldTree) => {
      // Only process if we don't have data yet
      if (scheduleData.value.length === 0 && newWorldTree?._root?.children) {
        debug.log(DebugCategories.DATA, 'Initial world tree data load:', {
          timestamp: new Date().toISOString(),
          hasTree: !!newWorldTree,
          hasRoot: !!newWorldTree?._root,
          initialized: isInitialized?.value,
          rootType: newWorldTree?._root?.type,
          childCount: newWorldTree?._root?.children?.length || 0
        })

        const children = newWorldTree._root.children
        const processedData = processElements(children)
        scheduleData.value = processedData
        debug.log(DebugCategories.DATA, 'Initial schedule data loaded:', {
          timestamp: new Date().toISOString(),
          count: scheduleData.value.length,
          itemsWithParameters: scheduleData.value.filter(
            (item) => Object.keys(item.parameters || {}).length > 0
          ).length
        })
        await nextTick()
      }
    },
    { deep: true }
  )

  async function initializeData(): Promise<void> {
    debug.log(DebugCategories.INITIALIZATION, 'Starting initialization')

    // Wait for WorldTree to be available
    let retryCount = 0
    while (!worldTree.value?._root?.children && retryCount < 50) {
      await new Promise((resolve) => setTimeout(resolve, 100))
      retryCount++
      if (retryCount % 10 === 0) {
        debug.log(DebugCategories.INITIALIZATION, 'Waiting for world tree:', {
          timestamp: new Date().toISOString(),
          retryCount,
          hasTree: !!worldTree.value,
          hasRoot: !!worldTree.value?._root
        })
      }
    }

    const tree = worldTree.value as WorldTreeNode | undefined
    if (!tree?._root?.children) {
      debug.warn(DebugCategories.ERROR, 'No WorldTree data available')
      return
    }

    // Only load initial data if we don't have any
    if (scheduleData.value.length === 0) {
      const children = tree._root.children
      debug.log(DebugCategories.DATA, 'World tree found:', {
        timestamp: new Date().toISOString(),
        rootType: tree._root.type,
        childCount: children.length,
        firstChildType: children[0]?.rawNode?.raw?.speckle_type
      })

      const processedData = processElements(children)
      scheduleData.value = processedData
      debug.log(DebugCategories.DATA, 'Initial schedule data:', {
        timestamp: new Date().toISOString(),
        count: scheduleData.value.length,
        itemsWithParameters: scheduleData.value.filter(
          (item) => Object.keys(item.parameters || {}).length > 0
        ).length,
        firstItem: scheduleData.value[0]
      })
      await nextTick()
    }
  }

  return {
    scheduleData,
    availableHeaders,
    availableCategories,
    updateCategories,
    initializeData,
    stopWorldTreeWatch: () => stopWorldTreeWatch()
  }
}
