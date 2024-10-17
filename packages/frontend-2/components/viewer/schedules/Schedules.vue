<template>
  <div>
    <ViewerLayoutPanel class="flex flex-col" @close="$emit('close')">
      <template #title>Schedules</template>
      <template #actions>
        <input
          v-model="searchTerm"
          placeholder="Search elements..."
          class="p-2 border rounded"
        />
      </template>

      <!-- Main content area -->
      <div class="flex-grow overflow-auto">
        <!-- Elements Table -->
        <div v-if="filteredElementsData.length > 0">
          <h2>Model Elements</h2>
          <table class="schedules-table" border="1" cellpadding="5" cellspacing="0">
            <thead>
              <tr>
                <th>ID</th>
                <th>Type</th>
                <th>Name</th>
                <th>Category</th>
                <th>Dimensions</th>
                <th>Is External</th>
                <th>Additional Properties</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in filteredElementsData" :key="index">
                <td>{{ item.id }}</td>
                <td>{{ item.type }}</td>
                <td>{{ item.name }}</td>
                <td>{{ item.category }}</td>
                <td>{{ item.dimensions }}</td>
                <td>{{ item.isExternal }}</td>
                <td>{{ item.additionalProperties }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else>No data available to display.</p>
      </div>
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
import { ref, computed, watch } from 'vue'
import { useViewerEventListener } from '~~/lib/viewer/composables/viewer'
import { useRootNodes } from '~/components/viewer/composables/useRootNodes'
import {
  useInjectedViewerLoadedResources,
  useInjectedViewer
} from '~~/lib/viewer/composables/setup'

// Define emits
defineEmits(['close'])

// Injected viewer state and resources
const { modelsAndVersionIds } = useInjectedViewerLoadedResources()
const {
  metadata: { worldTree, availableFilters: allFilters }
} = useInjectedViewer()

// State variables
const manualExpandLevel = ref(-1)
const showRaw = ref(false)
const refhack = ref(1)
const searchTerm = ref('')

// Viewer event listener
useViewerEventListener(ViewerEvent.Busy, (isBusy: boolean) => {
  if (!isBusy) refhack.value++
})

// Use root nodes composable
const { rootNodes, expandLevel } = useRootNodes()

// Handle collapsing of nodes
const collapse = () => {
  if (expandLevel.value > -1) expandLevel.value--
  if (manualExpandLevel.value > -1) manualExpandLevel.value--
}

function flattenNodeTree(node: any, depth = 0): any[] {
  console.log(`Depth ${depth}:`, node)

  if (depth > 15 || !node) return []

  if (typeof node === 'object' && node !== null) {
    if (isBuildingElement(node)) {
      console.log(
        `Found building element at depth ${depth}:`,
        node.type || node.speckle_type
      )
      return [processNode(node)]
    }

    return Object.values(node).flatMap((value) => flattenNodeTree(value, depth + 1))
  }

  return []
}

function isBuildingElement(node: any): boolean {
  const buildingElementTypes = [
    'IFCWALL',
    'IFCWALLSTANDARDCASE',
    'IFCSLAB',
    'IFCBEAM',
    'IFCCOLUMN',
    'IFCDOOR',
    'IFCWINDOW',
    'IFCROOF',
    'IFCSTAIR',
    'IFCRAILING',
    'IFCMEMBER',
    'IFCSITE',
    'IFCPROJECT' // Added these to capture more elements
  ]
  return (
    node &&
    (buildingElementTypes.includes(node.type || node.speckle_type) || node.ObjectType)
  )
}

function processNode(node: any): any {
  console.log('Processing node:', node)
  const {
    id,
    type,
    Name,
    ObjectType,
    GlobalId,
    Dimensions,
    Pset_WallCommon,
    Pset_ProductRequirements,
    ...additionalProperties
  } = node

  return {
    id: id || GlobalId || 'N/A',
    type: type || node.speckle_type || 'Unknown',
    name: Name || node.name || 'Unnamed',
    category: ObjectType || Pset_ProductRequirements?.Category || 'N/A',
    dimensions: Dimensions
      ? `L: ${Dimensions.Length}, W: ${Dimensions.Width || 'N/A'}, H: ${
          Dimensions.Height || 'N/A'
        }`
      : 'N/A',
    isExternal: Pset_WallCommon?.IsExternal || 'N/A',
    additionalProperties: JSON.stringify(additionalProperties)
  }
}

// Computed property for table data
const elementsData = computed(() => {
  console.log('Computing elementsData')
  console.log('Root Nodes:', JSON.stringify(rootNodes.value, null, 2))
  const data = rootNodes.value.flatMap((node) => flattenNodeTree(node))
  console.log('Processed Elements Data:', JSON.stringify(data, null, 2))
  return data
})

const filteredElementsData = computed(() => {
  console.log('Computing filteredElementsData')
  const term = searchTerm.value.toLowerCase()
  const filtered = elementsData.value.filter(
    (element) =>
      element.name.toLowerCase().includes(term) ||
      element.type.toLowerCase().includes(term) ||
      element.id.toLowerCase().includes(term) ||
      element.category.toLowerCase().includes(term)
  )
  console.log('Filtered Elements Data:', filtered)
  return filtered
})

// Watch for changes in rootNodes
watch(rootNodes, (newValue) => {
  console.log('rootNodes updated:', JSON.stringify(newValue, null, 2))
})

// New watch on elementsData
watch(elementsData, (newValue) => {
  console.log('elementsData updated:', JSON.stringify(newValue, null, 2))
})
</script>

<style scoped>
.schedules-table {
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
}

.schedules-table td {
  max-width: 200px; /* Adjust as needed */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Target the ViewerLayoutPanel - you might need to adjust the class name */
:deep(.viewer-layout-panel) {
  max-height: 80vh; /* Adjust as needed */
  overflow-y: auto;
}
</style>
