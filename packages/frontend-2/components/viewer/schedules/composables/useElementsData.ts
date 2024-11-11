import { ref, watch, nextTick } from 'vue'
import type { Ref } from 'vue'
import type {
  ElementData,
  TreeItemComponentModel,
  AvailableHeaders,
  ElementsDataReturn
} from '../types'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import { useInjectedViewer } from '~~/lib/viewer/composables/setup'
import { debug } from '../utils/debug'

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

  function processElements(nodes: TreeItemComponentModel[]): ElementData[] {
    const result: ElementData[] = []

    function processNode(node: TreeItemComponentModel): void {
      // Keep raw logging
      debug.log('📦 Node:', node)

      const model = (node as any).model
      if (model?.raw) {
        debug.log('🔍 Model:', model)
        debug.log('📄 Raw:', model.raw)

        const raw = model.raw
        if (raw.speckle_type?.startsWith('IFC')) {
          const element: ElementData = {
            id: raw.id || '',
            type: raw.speckle_type || 'Unknown',
            mark: raw['Identity Data']?.Mark || raw.Tag || '',
            category: raw.Other?.Category || 'Uncategorized',
            host: raw.Constraints?.Host || '',
            details: []
          }

          // Add dimensions and other properties
          const dimensions = raw.Dimensions || {}
          const constraints = raw.Constraints || {}
          const structural = raw.Structural || {}

          element.details = [
            { name: 'Length', value: dimensions.Length?.toString() || '' },
            { name: 'Volume', value: dimensions.Volume?.toString() || '' },
            {
              name: 'Base Offset',
              value: constraints['Base Offset']?.toString() || ''
            },
            { name: 'Top Offset', value: constraints['Top Offset']?.toString() || '' },
            { name: 'Structural Usage', value: structural['Structural Usage'] || '' }
          ]

          // Add type-specific properties
          if (raw.speckle_type === 'IFCWALL') {
            element.details.push(
              { name: 'Area', value: dimensions.Area?.toString() || '' },
              { name: 'Room Bounding', value: constraints['Room Bounding'] || '' }
            )
          } else if (raw.speckle_type === 'IFCBEAM') {
            element.details.push(
              { name: 'Cut Length', value: structural['Cut Length']?.toString() || '' },
              { name: 'Host Wall', value: constraints.Host || '' }
            )
          }

          result.push(element)
          debug.log('✨ Created Element:', element)
        }
      }

      // Process children recursively
      if (node.children?.length) {
        node.children.forEach((child) => processNode(child))
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
