import { ref, watch, nextTick } from 'vue'
import type { Ref } from 'vue'
import type {
  ElementData,
  TreeItemComponentModel,
  AvailableHeaders,
  ElementsDataReturn,
  ParameterValue
} from '../types'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import { useInjectedViewer } from '~~/lib/viewer/composables/setup'
import { debug } from '../utils/debug'
import { BASIC_PARAMETERS, getNestedValue } from '../config/parameters'

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

  const availableCategories = ref<{
    parent: Set<string>
    child: Set<string>
  }>({
    parent: new Set(['Uncategorized']),
    child: new Set(['Uncategorized'])
  })

  // =============================================
  // Raw Data Collection Section
  function processElements(nodes: TreeItemComponentModel[]): ElementData[] {
    const result: ElementData[] = []

    function processNode(node: any): void {
      // Log raw node data for debugging
      console.log('🔍 IMPORTANT RAW NODE:', {
        timestamp: new Date().toISOString(),
        hasModel: !!node.model,
        hasRaw: !!node.model?.raw,
        speckleType: node.model?.raw?.speckle_type,
        id: node.model?.raw?.id,
        mark: node.model?.raw?.['Identity Data']?.Mark || node.model?.raw?.Tag,
        category: node.model?.raw?.['Other']?.Category,
        host: node.model?.raw?.['Constraints']?.Host,
        childCount: node.children?.length || 0
      })

      if (node.model?.raw) {
        const raw = node.model.raw

        // Create element from raw data
        if (raw.speckle_type?.startsWith('IFC')) {
          const parameters: Record<string, ParameterValue> = {}

          // Add basic parameters
          BASIC_PARAMETERS.forEach((param) => {
            const value = getNestedValue(raw, param.path) || raw[param.fallback] || ''
            if (value) {
              parameters[param.name] = value.toString()
            }
          })

          const element: ElementData = {
            id: raw.id || '',
            type: raw.speckle_type || 'Unknown',
            mark: getNestedValue(raw, ['Identity Data', 'Mark']) || raw.Tag || '',
            category: getNestedValue(raw, ['Other', 'Category']) || 'Uncategorized',
            host: getNestedValue(raw, ['Constraints', 'Host']) || '',
            parameters,
            details: [] // Will be populated with child elements later
          }

          // Add to result array
          result.push(element)
          console.log('🔍 IMPORTANT PROCESSED ELEMENT:', {
            timestamp: new Date().toISOString(),
            element,
            parameters: Object.keys(parameters),
            hasRequiredFields: !!(element.id && element.mark && element.category)
          })
        }
      }

      // Process children recursively
      if (node.children?.length) {
        node.children.forEach((child: any) => processNode(child))
      }
    }

    console.log('🔍 IMPORTANT STARTING NODE PROCESSING:', {
      timestamp: new Date().toISOString(),
      nodeCount: nodes.length,
      firstNodeType: nodes[0]?.model?.raw?.speckle_type
    })
    nodes.forEach((node) => processNode(node))
    console.log('🔍 IMPORTANT PROCESSING COMPLETE:', {
      timestamp: new Date().toISOString(),
      total: result.length,
      elements: result.map((el) => ({
        id: el.id,
        type: el.type,
        mark: el.mark,
        category: el.category,
        parameterCount: Object.keys(el.parameters).length
      }))
    })

    return result
  }

  async function updateCategories(
    parentCategories: string[],
    childCategories: string[]
  ): Promise<void> {
    console.log('🔍 IMPORTANT UPDATING CATEGORIES:', {
      timestamp: new Date().toISOString(),
      parentCategories,
      childCategories,
      currentDataCount: scheduleData.value.length
    })

    scheduleData.value = scheduleData.value.map((item) => ({
      ...item,
      details:
        item.details?.filter(
          (child) =>
            childCategories.length === 0 || childCategories.includes(child.category)
        ) || [],
      _visible:
        parentCategories.length === 0 || parentCategories.includes(item.category)
    }))

    console.log('🔍 IMPORTANT CATEGORIES UPDATED:', {
      timestamp: new Date().toISOString(),
      visibleItems: scheduleData.value.filter((item) => item._visible).length,
      totalItems: scheduleData.value.length,
      itemsWithDetails: scheduleData.value.filter((item) => item.details.length > 0)
        .length
    })

    await nextTick()
  }

  const stopWorldTreeWatch = watch(
    () => worldTree.value as WorldTreeNode | undefined,
    async (newWorldTree) => {
      console.log('🔍 IMPORTANT WORLD TREE UPDATE:', {
        timestamp: new Date().toISOString(),
        hasTree: !!newWorldTree,
        hasRoot: !!newWorldTree?._root,
        initialized: isInitialized?.value,
        rootType: newWorldTree?._root?.type,
        childCount: newWorldTree?._root?.children?.length || 0
      })

      if (!isInitialized?.value || !newWorldTree?._root?.children) return

      const children = newWorldTree._root.children
      const processedData = processElements(children)
      scheduleData.value = processedData
      console.log('🔍 IMPORTANT SCHEDULE DATA UPDATED:', {
        timestamp: new Date().toISOString(),
        count: scheduleData.value.length,
        categories: Array.from(
          new Set(scheduleData.value.map((item) => item.category))
        ),
        itemsWithParameters: scheduleData.value.filter(
          (item) => Object.keys(item.parameters).length > 0
        ).length
      })
      await nextTick()
    },
    { deep: true }
  )

  async function initializeData(): Promise<void> {
    console.log('🔍 IMPORTANT STARTING INITIALIZATION')

    // Wait for WorldTree to be available
    let retryCount = 0
    while (!worldTree.value?._root?.children && retryCount < 50) {
      await new Promise((resolve) => setTimeout(resolve, 100))
      retryCount++
      if (retryCount % 10 === 0) {
        console.log('🔍 IMPORTANT WAITING FOR WORLD TREE:', {
          timestamp: new Date().toISOString(),
          retryCount,
          hasTree: !!worldTree.value,
          hasRoot: !!worldTree.value?._root
        })
      }
    }

    const tree = worldTree.value as WorldTreeNode | undefined
    if (!tree?._root?.children) {
      console.warn('❌ No WorldTree data available')
      return
    }

    const children = tree._root.children
    console.log('🔍 IMPORTANT WORLD TREE FOUND:', {
      timestamp: new Date().toISOString(),
      rootType: tree._root.type,
      childCount: children.length,
      firstChildType: children[0]?.model?.raw?.speckle_type
    })

    const processedData = processElements(children)
    scheduleData.value = processedData
    console.log('🔍 IMPORTANT INITIAL SCHEDULE DATA:', {
      timestamp: new Date().toISOString(),
      count: scheduleData.value.length,
      categories: Array.from(new Set(scheduleData.value.map((item) => item.category))),
      itemsWithParameters: scheduleData.value.filter(
        (item) => Object.keys(item.parameters).length > 0
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
