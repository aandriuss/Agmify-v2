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

// watch(
//   worldTree,
//   (newWorldTree) => {
//     console.log(
//       'Initial World Tree Structure:',
//       JSON.stringify(newWorldTree?._root?.children?.[0], null, 2)
//     )
//   },
//   { immediate: true }
// )

function getSimpleNodeInfo(node: ExplorerNode) {
  if (!node?.raw) return null
  return {
    type: node.raw.type,
    id: node.raw.id,
    mark: node.raw.Mark,
    host: node.raw.Constraints?.Host
  }
}

// Watch for changes in rootNodes and restructure the data
watch(
  rootNodes,
  (newRootNodes) => {
    if (!newRootNodes) {
      console.error('No rootNodes found.')
      return
    }

    const wallsMap = new Map<string, ExplorerNode>()

    function collectWalls(node: ExplorerNode, level = 0) {
      const rawNode = node.raw ?? { id: 'placeholder', type: 'Unknown' }

      // For walls
      if (rawNode?.type === 'IFCWALLSTANDARDCASE') {
        // Log only primitive values and necessary properties
        console.log('Wall found:', {
          type: rawNode.type,
          mark: rawNode.Mark,
          id: rawNode.id,
          name: rawNode.Name,
          revitMark: rawNode.properties?.Revit?.Mark,
          psetMark: rawNode.properties?.PSet_Revit?.Mark
        })

        // Use the first available identifier
        const identifier =
          rawNode.Mark ||
          rawNode.properties?.Revit?.Mark ||
          rawNode.properties?.PSet_Revit?.Mark ||
          rawNode.Name ||
          rawNode.id

        if (identifier) {
          console.log('Adding wall with identifier:', identifier)
          wallsMap.set(identifier, node)
        }
      }

      // For beams
      if (rawNode?.type === 'IFCBEAM') {
        console.log('Beam found:', {
          id: rawNode.id,
          host: rawNode.Constraints?.Host
        })
      }

      if (node.children) {
        node.children.forEach((child) => collectWalls(child, level + 1))
      }
    }

    // Collect wall nodes into wallsMap
    newRootNodes.forEach((node) => collectWalls(node))

    // Log wall map info without stringifying the whole objects
    console.log('Wall Map info:', {
      numberOfWalls: wallsMap.size,
      wallIdentifiers: Array.from(wallsMap.keys())
    })

    // Step 2: Restructure the rootNodes and group beams under walls
    restructuredNodes.value = traverseAndGroup(
      newRootNodes.map((n) => ({
        raw: n.rawNode.raw || { id: 'unknown', type: 'Unknown' },
        children: n.rawNode.children || []
      })),
      wallsMap
    )

    // Log final structure summary
    console.log('Restructuring complete:', {
      totalNodes: restructuredNodes.value.length,
      types: restructuredNodes.value.map((node) => node.raw.type)
    })
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

function findAndLogElements(nodes: ExplorerNode[], depth = 0, visited = new WeakSet()) {
  if (depth > 10) {
    console.warn('Max depth reached, stopping traversal')
    return
  }

  if (!Array.isArray(nodes)) {
    console.error('Expected an array of nodes, but received:', typeof nodes)
    return
  }

  nodes.forEach((node, index) => {
    if (!node || visited.has(node)) {
      return
    }
    visited.add(node)

    const rawNode = node.raw ?? { id: `placeholder_${index}`, type: 'Unknown' }
    node.raw = rawNode

    // Log only necessary properties
    if (rawNode.type === 'IFCWALLSTANDARDCASE') {
      console.log('Found Wall:', {
        id: rawNode.id,
        mark: rawNode.Mark,
        name: rawNode.Name
      })
    } else if (rawNode.type === 'IFCBEAM' && rawNode.Constraints) {
      console.log('Found Beam:', {
        id: rawNode.id,
        host: rawNode.Constraints.Host
      })
    }

    if (Array.isArray(node.children)) {
      findAndLogElements(node.children, depth + 1, visited)
    }
  })
}

// Traverse the nodes and group beams under walls
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
        const hostId = rawNode.Constraints.Host
        const hostWall = wallsMap.get(hostId)

        // Log beam-wall matching without circular references
        console.log('Beam-Wall matching:', {
          beamId: rawNode.id,
          hostId,
          wallFound: Boolean(hostWall)
        })

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
