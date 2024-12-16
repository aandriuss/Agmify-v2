import { ref, computed } from 'vue'
import {
  useInjectedViewer,
  useInjectedViewerLoadedResources,
  useInjectedViewerState
} from '~~/lib/viewer/composables/setup'
import { sortBy, flatten } from 'lodash-es'
import { ViewerEvent } from '@speckle/viewer'
import { useViewerEventListener } from '~~/lib/viewer/composables/viewer'
import type {
  ExplorerNode,
  TreeItemComponentModel
} from '~~/lib/viewer/helpers/sceneExplorer'

export function useRootNodes() {
  const { modelsAndVersionIds } = useInjectedViewerLoadedResources()
  const {
    resources: {
      response: { resourceItems }
    }
  } = useInjectedViewerState()
  const {
    metadata: { worldTree }
  } = useInjectedViewer()

  const expandLevel = ref(-1)
  const refhack = ref(1)
  useViewerEventListener(ViewerEvent.Busy, (isBusy: boolean) => {
    if (isBusy) return
    refhack.value++
  })

  const rootNodes = computed(() => {
    refhack.value

    if (!worldTree.value) return []
    expandLevel.value = -1
    const rootNodes = worldTree.value._root.children as ExplorerNode[]

    const results: Record<number, ExplorerNode[]> = {}
    const unmatchedNodes: ExplorerNode[] = []

    for (const node of rootNodes) {
      const objectId = ((node.model as Record<string, unknown>).id as string)
        .split('/')
        .reverse()[0] as string
      const resourceItemIdx = resourceItems.value.findIndex(
        (res) => res.objectId === objectId
      )
      const resourceItem =
        resourceItemIdx !== -1 ? resourceItems.value[resourceItemIdx] : null

      const raw = node.model?.raw as Record<string, unknown>
      if (resourceItem?.modelId) {
        const model = modelsAndVersionIds.value.find(
          (item) => item.model.id === resourceItem.modelId
        )?.model
        raw.name = model?.name
        raw.type = model?.id
      } else {
        raw.name = 'Object'
        raw.type = 'Single object'
      }

      const res = node.model as ExplorerNode
      if (resourceItem) {
        ;(results[resourceItemIdx] = results[resourceItemIdx] || []).push(res)
      } else {
        unmatchedNodes.push(res)
      }
    }

    const nodes = [
      ...flatten(sortBy(Object.entries(results), (i) => i[0]).map((i) => i[1])),
      ...unmatchedNodes
    ]

    return nodes.map(
      (n): TreeItemComponentModel => ({
        rawNode: markRaw(n)
      })
    )
  })

  return { rootNodes, expandLevel }
}
