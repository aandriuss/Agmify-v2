<template>
  <div>
    <ViewerLayoutPanel @close="$emit('close')">
      <template #title>Datasets</template>

      <template #actions>
        <div class="flex items-center justify-between w-full">
          <div v-if="!showRaw" class="flex items-center gap-1">
            <FormButton
              size="sm"
              color="primary"
              text
              :icon-left="BarsArrowDownIcon"
              @click="expandLevel++"
            >
              Unfold
            </FormButton>
            <FormButton
              size="sm"
              color="primary"
              text
              :icon-left="BarsArrowUpIcon"
              :disabled="expandLevel <= -1 && manualExpandLevel <= -1"
              @click="collapse()"
            >
              Collapse
            </FormButton>
          </div>
          <div v-else>
            <h4 class="font-medium whitespace-normal text-body-2xs ml-1">Dev mode</h4>
          </div>

          <FormButton
            v-tippy="showRaw ? 'Switch back' : 'Switch to Dev Mode'"
            size="sm"
            class="-mr-1"
            color="subtle"
            @click="showRaw = !showRaw"
          >
            <CodeBracketIcon
              class="size-4 sm:size-3"
              :class="showRaw ? 'text-primary' : 'text-foreground'"
            />
          </FormButton>
        </div>
      </template>
      <div
        v-if="!showRaw && rootNodes.length !== 0"
        class="relative flex flex-col gap-y-2 py-2"
      >
        <div v-for="(rootNode, idx) in rootNodes" :key="idx" class="rounded-xl">
          <ViewerExplorerTreeItem
            :tree-item="rootNode"
            :sub-header="'Model version'"
            :debug="false"
            :expand-level="expandLevel"
            :manual-expand-level="manualExpandLevel"
            @expanded="(e) => (manualExpandLevel < e ? (manualExpandLevel = e) : '')"
          />
        </div>
      </div>

      <ViewerDataviewerPanel v-if="showRaw" class="pointer-events-auto" />
    </ViewerLayoutPanel>

    <ViewerLayoutPanel @close="$emit('close')">
      <template #title>User Table</template>

      <template #actions>
        <div class="flex items-center justify-between w-full">
          <div v-if="!showRaw" class="flex items-center gap-1">
            <FormButton
              size="sm"
              color="primary"
              text
              :icon-left="BarsArrowDownIcon"
              @click="expandLevel++"
            >
              Unfold
            </FormButton>
            <FormButton
              size="sm"
              color="primary"
              text
              :icon-left="BarsArrowUpIcon"
              :disabled="expandLevel <= -1 && manualExpandLevel <= -1"
              @click="collapse()"
            >
              Collapse
            </FormButton>
          </div>
          <div v-else>
            <h4 class="font-medium whitespace-normal text-body-2xs ml-1">Dev mode</h4>
          </div>

          <FormButton
            v-tippy="showRaw ? 'Switch back' : 'Switch to Dev Mode'"
            size="sm"
            class="-mr-1"
            color="subtle"
            @click="showRaw = !showRaw"
          >
            <CodeBracketIcon
              class="size-4 sm:size-3"
              :class="showRaw ? 'text-primary' : 'text-foreground'"
            />
          </FormButton>
        </div>
      </template>
      <div
        v-if="!showRaw && restructuredNodes.length !== 0"
        class="relative flex flex-col gap-y-2 py-2"
      >
        <div v-for="(rootNode, idx) in restructuredNodes" :key="idx" class="rounded-xl">
          <ViewerExplorerTreeItem
            :tree-item="rootNode"
            :sub-header="'Model version'"
            :debug="false"
            :expand-level="expandLevel"
            :manual-expand-level="manualExpandLevel"
            @expanded="(e) => (manualExpandLevel < e ? (manualExpandLevel = e) : '')"
          />
        </div>
      </div>
      <div v-else>No data available</div>

      <ViewerDataviewerPanel v-if="showRaw" class="pointer-events-auto" />
    </ViewerLayoutPanel>

    <ViewerExplorerFilters :filters="allFilters || []" />
  </div>
</template>

<script setup lang="ts">
import {
  BarsArrowUpIcon,
  BarsArrowDownIcon,
  CodeBracketIcon
} from '@heroicons/vue/24/solid'
import { ViewerEvent } from '@speckle/viewer'
import type {
  ExplorerNode,
  TreeItemComponentModel
} from '~~/lib/viewer/helpers/sceneExplorer'
import {
  useInjectedViewer,
  useInjectedViewerLoadedResources,
  useInjectedViewerState
} from '~~/lib/viewer/composables/setup'
import { useViewerEventListener } from '~~/lib/viewer/composables/viewer'
import { sortBy, flatten } from 'lodash-es'

import { ref, computed, watch } from 'vue'

// import { UseRootNodes } from '../composables/useRootNodes'
import { useRootNodes } from '~/components/viewer/composables/useRootNodes'

// Define the types for ExplorerNode and TreeItemComponentModel
interface ExplorerNode {
  raw: {
    id: string
    type: string
    Mark?: string
    Name?: string
    Constraints?: {
      Host?: string
    }
    [key: string]: any
  }
  children: ExplorerNode[]
}

interface TreeItemComponentModel {
  rawNode: ExplorerNode
}

defineEmits(['close'])

const { modelsAndVersionIds } = useInjectedViewerLoadedResources()
const {
  resources: {
    response: { resourceItems }
  }
} = useInjectedViewerState()
const {
  metadata: { worldTree, availableFilters: allFilters }
} = useInjectedViewer()

// const expandLevel = ref(-1)
const manualExpandLevel = ref(-1)

const collapse = () => {
  if (expandLevel.value > -1) expandLevel.value--
  if (manualExpandLevel.value > -1) manualExpandLevel.value--
}

const showRaw = ref(false)

// Reactive reference for triggering updates
const refhack = ref(1)
useViewerEventListener(ViewerEvent.Busy, (isBusy: boolean) => {
  if (isBusy) return
  refhack.value++
})

// Compute the root nodes from the viewer's world tree
const { rootNodes, expandLevel } = useRootNodes()

// const rootNodes = computed(() => {
//   refhack.value

//   if (!worldTree.value) return []
//   expandLevel.value = -1
//   const rootNodes = worldTree.value._root.children as ExplorerNode[]

//   const results: Record<number, ExplorerNode[]> = {}
//   const unmatchedNodes: ExplorerNode[] = []

//   for (const node of rootNodes) {
//     const objectId = ((node.model as Record<string, unknown>).id as string)
//       .split('/')
//       .reverse()[0] as string
//     const resourceItemIdx = resourceItems.value.findIndex(
//       (res) => res.objectId === objectId
//     )
//     const resourceItem =
//       resourceItemIdx !== -1 ? resourceItems.value[resourceItemIdx] : null

//     const raw = node.model?.raw as Record<string, unknown>
//     if (resourceItem?.modelId) {
//       const model = modelsAndVersionIds.value.find(
//         (item) => item.model.id === resourceItem.modelId
//       )?.model
//       raw.name = model?.name
//       raw.type = model?.id
//     } else {
//       raw.name = 'Object'
//       raw.type = 'Single object'
//     }

//     const res = node.model as ExplorerNode
//     if (resourceItem) {
//       ;(results[resourceItemIdx] = results[resourceItemIdx] || []).push(res)
//     } else {
//       unmatchedNodes.push(res)
//     }
//   }

//   const nodes = [
//     ...flatten(sortBy(Object.entries(results), (i) => i[0]).map((i) => i[1])),
//     ...unmatchedNodes
//   ]

//   return nodes.map(
//     (n): TreeItemComponentModel => ({
//       rawNode: markRaw(n)
//     })
//   )
// })

// Utility function to safely stringify objects
function safeStringify(obj: any, depth = 0): string {
  const maxDepth = 3
  const indent = '  '.repeat(depth)

  if (depth > maxDepth) return '{ ... }'

  if (typeof obj !== 'object' || obj === null) {
    return JSON.stringify(obj)
  }

  const pairs = Object.entries(obj).map(([key, value]) => {
    if (key === 'children' || key === 'rawNode') {
      return `${indent}  "${key}": [Array or Object]`
    }
    return `${indent}  "${key}": ${safeStringify(value, depth + 1)}`
  })

  return `{\n${pairs.join(',\n')}\n${indent}}`
}

const restructuredNodes = ref<TreeItemComponentModel[]>([])

// Watch for changes in rootNodes and update restructuredNodes accordingly
watch(
  rootNodes,
  (newRootNodes) => {
    if (!newRootNodes) {
      console.error('No rootNodes found.')
      return
    }

    const wallsMap = new Map<string, ExplorerNode>()

    // Step 1: Collect all wall nodes in a map for quick lookup
    function collectWalls(node: ExplorerNode, level = 0) {
      const rawNode = node.raw ?? { id: 'placeholder', type: 'Unknown' }
      if (
        rawNode &&
        rawNode.type === 'IFCWALLSTANDARDCASE' &&
        (rawNode.Name || rawNode.Mark)
      ) {
        const identifier = rawNode.Name || rawNode.Mark || rawNode.id
        if (identifier) {
          wallsMap.set(identifier, node)
        }
      }
      if (node.children) {
        node.children.forEach((child) => collectWalls(child, level + 1))
      }
    }

    // Collect wall nodes into wallsMap
    newRootNodes.forEach((node) => collectWalls(node))

    // Step 2: Restructure the rootNodes and group beams under walls
    restructuredNodes.value = traverseAndGroup(
      newRootNodes.map((n) => ({
        raw: n.rawNode.raw || { id: 'unknown', type: 'Unknown' },
        children: n.rawNode.children || []
      })),
      wallsMap
    )

    // Optional: Log elements for verification
    findAndLogElements(restructuredNodes.value)
  },
  { immediate: true }
)

// Data for the elements table
const elementsData = computed(() => {
  return restructuredNodes.value.flatMap((node) => {
    const { id, type, Name, ...additionalProperties } = node.rawNode.raw
    return {
      id,
      type,
      Name,
      additionalProperties
    }
  })
})

// console.log('elementsData:', JSON.stringify(elementsData))

function findAndLogElements(nodes: ExplorerNode[], depth = 0, visited = new WeakSet()) {
  if (depth > 10) {
    console.warn('Max depth reached, stopping traversal')
    return
  }

  if (!Array.isArray(nodes)) {
    console.error('Expected an array of nodes, but received:', typeof nodes)
    return
  }

  // console.log(`Searching at depth ${depth}:`, safeStringify(nodes, 0))

  nodes.forEach((node, index) => {
    if (!node || visited.has(node)) {
      console.warn('Skipping null/undefined node or already visited node')
      return
    }
    visited.add(node)

    const rawNode = node.raw ?? { id: `placeholder_${index}`, type: 'Unknown' }
    node.raw = rawNode

    const { type, Mark, Constraints } = rawNode
    if (type === 'IFCWALLSTANDARDCASE') {
      console.log('Found Wall:', { Mark, id: rawNode.id })
    } else if (type === 'IFCBEAM' && Constraints) {
      console.log('Found Beam:', { Host: Constraints.Host, id: rawNode.id })
    }

    // Recursively search children
    if (Array.isArray(node.children)) {
      findAndLogElements(node.children, depth + 1, visited)
    }
  })
}

/**
 * Traverse and group nodes, associating beams under corresponding walls.
 */
function traverseAndGroup(
  nodes: ExplorerNode[],
  wallsMap: Map<string, ExplorerNode>
): ExplorerNode[] {
  return nodes
    .map((node, index) => {
      if (!node || !node.raw) {
        node = {
          ...node,
          raw: {
            id: `placeholder_${index}`,
            type: 'Unknown',
            message: 'Placeholder node due to missing raw property'
          }
        }
      }

      const rawNode = node.raw ?? { id: `placeholder_${index}`, type: 'Unknown' }

      if (rawNode.type === 'IFCBEAM' && rawNode.Constraints?.Host) {
        const hostWall = wallsMap.get(rawNode.Constraints.Host)
        if (hostWall) {
          hostWall.children = hostWall.children || []
          hostWall.children.push(node)
          return null
        }
      }

      if (node.children && node.children.length > 0) {
        node.children = traverseAndGroup(node.children, wallsMap).filter(Boolean)
      }

      return node
    })
    .filter(Boolean) as ExplorerNode[]
}
</script>
