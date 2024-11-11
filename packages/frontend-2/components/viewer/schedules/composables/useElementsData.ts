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
  // DO NOT MODIFY: Raw Data Collection Section
  // This section logs raw BIM data from WorldTree
  // Note: Using any types intentionally to log raw data structure
  function processElements(nodes: TreeItemComponentModel[]): ElementData[] {
    const result: ElementData[] = []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function processNode(node: any): void {
      // Log raw node data
      debug.log('📦 Node:', node)

      if (node.model?.raw) {
        const raw = node.model.raw
        debug.log('🔍 Model:', node.model)
        debug.log('📄 Raw:', raw)

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
          debug.log('✨ Created Element:', element)
        }
      }

      // Process children recursively
      if (node.children?.length) {
        node.children.forEach((child: any) => processNode(child))
      }
    }

    debug.log('🌳 Starting Node Processing')
    nodes.forEach((node) => processNode(node))
    debug.log('✅ Finished Processing:', {
      total: result.length,
      elements: result
    })

    return result
  }
  // =============================================
  // END Raw Data Collection Section
  // =============================================

  async function updateCategories(
    parentCategories: string[],
    childCategories: string[]
  ): Promise<void> {
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
    await nextTick()
  }

  const stopWorldTreeWatch = watch(
    () => worldTree.value as WorldTreeNode | undefined,
    async (newWorldTree) => {
      debug.log('🌳 WorldTree Update:', {
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
      debug.log('📊 Schedule Data Updated:', {
        count: scheduleData.value.length,
        items: scheduleData.value
      })
      await nextTick()
    },
    { deep: true }
  )

  async function initializeData(): Promise<void> {
    debug.log('🚀 Starting initialization')

    // Wait for WorldTree to be available
    let retryCount = 0
    while (!worldTree.value?._root?.children && retryCount < 50) {
      await new Promise((resolve) => setTimeout(resolve, 100))
      retryCount++
      debug.log('⏳ Waiting for WorldTree...', { retryCount })
    }

    const tree = worldTree.value as WorldTreeNode | undefined
    if (!tree?._root?.children) {
      debug.warn('❌ No WorldTree data available')
      return
    }

    const children = tree._root.children
    debug.log('🌳 Found WorldTree:', {
      rootType: tree._root.type,
      childCount: children.length
    })

    const processedData = processElements(children)
    scheduleData.value = processedData
    debug.log('📊 Initial Schedule Data:', {
      count: scheduleData.value.length,
      items: scheduleData.value
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
