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
  _currentTableColumns: Ref<ColumnDef[]>
  _currentDetailColumns: Ref<ColumnDef[]>
}

interface WorldTreeNode {
  _root?: {
    type?: string
    children?: TreeItemComponentModel[]
  }
}

export function useElementsData({
  _currentTableColumns,
  _currentDetailColumns
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

  // Keep track of all processed elements
  const allElements = ref<ElementData[]>([])

  function processElements(nodes: TreeItemComponentModel[]): ElementData[] {
    const result: ElementData[] = []
    const processedChildren: ElementData[] = []

    function processNode(
      node: TreeItemComponentModel,
      isChild = false
    ): ElementData | null {
      const raw = node.rawNode?.raw as BIMNodeRaw | undefined
      debug.log(DebugCategories.DATA, 'Processing raw node:', {
        hasRawNode: !!node.rawNode,
        hasRaw: !!raw,
        speckleType: raw?.speckle_type,
        id: raw?.id,
        mark: raw?.['Identity Data']?.Mark || raw?.Tag,
        category: raw?.Other?.Category,
        host: raw?.Constraints?.Host,
        childCount: node.children?.length || 0,
        isChild
      })

      if (!raw || !raw.speckle_type?.startsWith('IFC')) {
        return null
      }

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
      const mark = (raw['Identity Data']?.Mark as string) || (raw.Tag as string) || ''

      const element: ElementData = {
        id: raw.id || '',
        type: raw.speckle_type || 'Unknown',
        mark,
        category,
        host: (raw.Constraints?.Host as string) || '',
        parameters,
        details: [], // Will be populated with child elements later
        _visible: true // Default to visible, will be filtered by categories later
      }

      // Store raw data for debugging
      Object.defineProperty(element, '_raw', {
        value: raw,
        enumerable: false,
        configurable: true
      })

      debug.log(DebugCategories.DATA, 'Processed element:', {
        element,
        parameters: Object.keys(parameters),
        hasRequiredFields: !!(element.id && element.mark && element.category),
        isChild
      })

      return element
    }

    // First pass: Process all nodes and collect children
    nodes.forEach((node) => {
      // Process main element
      const element = processNode(node)
      if (element) {
        result.push(element)
      }

      // Process children
      if (node.children?.length) {
        node.children.forEach((child) => {
          const childElement = processNode(child, true)
          if (childElement) {
            processedChildren.push(childElement)
          }
        })
      }
    })

    // Second pass: Match children to parents
    processedChildren.forEach((child) => {
      if (child.host) {
        const parent = result.find((p) => p.id === child.host)
        if (parent) {
          parent.details = parent.details || []
          parent.details.push(child)
        }
      }
    })

    debug.log(DebugCategories.DATA, 'Processing complete:', {
      total: result.length,
      parentElements: result.length,
      childElements: processedChildren.length,
      matchedChildren: result.reduce((acc, el) => acc + (el.details?.length || 0), 0)
    })

    return result
  }

  async function updateCategories(
    parentCategories: string[],
    childCategories: string[]
  ): Promise<void> {
    debug.log(DebugCategories.CATEGORIES, 'Updating category visibility:', {
      selectedParent: parentCategories,
      selectedChild: childCategories,
      currentDataCount: allElements.value.length
    })

    // Filter elements based on selected categories
    scheduleData.value = allElements.value
      .map((element) => {
        const isParentVisible = parentCategories.includes(element.category)
        const visibleDetails =
          element.details?.filter((child) =>
            childCategories.includes(child.category)
          ) || []

        return {
          ...element,
          _visible: isParentVisible || visibleDetails.length > 0,
          details: visibleDetails
        }
      })
      .filter((element) => element._visible)

    debug.log(DebugCategories.CATEGORIES, 'Category visibility updated:', {
      visibleItems: scheduleData.value.filter((item) => item._visible).length,
      totalItems: scheduleData.value.length,
      itemsWithDetails: scheduleData.value.filter(
        (item) => (item.details?.length ?? 0) > 0
      ).length
    })

    await nextTick()
  }

  // Watch worldTree for changes
  const stopWorldTreeWatch = watch(
    () => worldTree.value as WorldTreeNode | undefined,
    async (newWorldTree) => {
      if (newWorldTree?._root?.children) {
        debug.log(DebugCategories.DATA, 'World tree data updated:', {
          hasTree: !!newWorldTree,
          hasRoot: !!newWorldTree?._root,
          rootType: newWorldTree?._root?.type,
          childCount: newWorldTree?._root?.children?.length || 0
        })

        const children = newWorldTree._root.children
        // Store all processed elements
        allElements.value = processElements(children)
        // Initial data is unfiltered
        scheduleData.value = allElements.value
        debug.log(DebugCategories.DATA, 'Schedule data updated:', {
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
          retryCount,
          hasTree: !!worldTree.value,
          hasRoot: !!worldTree.value?._root
        })
      }
    }

    const tree = worldTree.value as WorldTreeNode | undefined
    if (!tree?._root?.children) {
      debug.warn(DebugCategories.ERROR, 'No WorldTree data available')
      // Initialize with empty data
      allElements.value = []
      scheduleData.value = []
      return
    }

    const children = tree._root.children
    debug.log(DebugCategories.DATA, 'World tree found:', {
      rootType: tree._root.type,
      childCount: children.length,
      firstChildType: children[0]?.rawNode?.raw?.speckle_type
    })

    // Store all processed elements
    allElements.value = processElements(children)
    // Initial data is unfiltered
    scheduleData.value = allElements.value
    debug.log(DebugCategories.DATA, 'Initial schedule data:', {
      count: scheduleData.value.length,
      itemsWithParameters: scheduleData.value.filter(
        (item) => Object.keys(item.parameters || {}).length > 0
      ).length,
      firstItem: scheduleData.value[0]
    })
    await nextTick()
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
