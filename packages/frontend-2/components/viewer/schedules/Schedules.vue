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
          <table class="table-auto w-full border-collapse border border-gray-400">
            <thead class="bg-gray-200">
              <tr>
                <th class="p-2 border border-gray-400">ID</th>
                <th>Type</th>
                <th>Speckle Type</th>
                <th>Name</th>
                <th>Category</th>
                <th>Dimensions</th>
                <th>Is External</th>
                <th>Additional Properties</th>
                <th>View 3D Model</th>
                <!-- New column -->
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, index) in filteredElementsData"
                :key="index"
                class="hover:bg-gray-100"
              >
                <td class="p-2 border border-gray-400">{{ item.id }}</td>
                <td>{{ item.type }}</td>
                <td>{{ item.speckle_type }}</td>
                <td>{{ item.name }}</td>
                <td>{{ item.category }}</td>
                <td>{{ item.dimensions }}</td>
                <td>{{ item.isExternal }}</td>
                <td>{{ item.additionalProperties }}</td>
                <td>
                  <button @click="openViewer(item.id)">View</button>
                  <!-- New button -->
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else>No data available to display.</p>
      </div>

      <!-- Speckle Viewer -->
      <SpeckleViewer v-if="selectedModelId" :model-id="selectedModelId" />
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
const selectedModelId = ref(null) // New state to track selected model

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
  if (depth > 15 || !node) return []

  if (typeof node === 'object' && node !== null) {
    if (isBuildingElement(node)) {
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
    'IFCPROJECT'
  ]
  return (
    node &&
    (buildingElementTypes.includes(node.type || node.speckle_type) || node.ObjectType)
  )
}

function processNode(node: any): any {
  const {
    id,
    type,
    speckle_type,
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
    type: type || 'Unknown',
    speckle_type: speckle_type || 'N/A',
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

// Open the Speckle Viewer with the selected model ID
function openViewer(modelId: string) {
  selectedModelId.value = modelId
}

// Computed property for table data
const elementsData = computed(() => {
  const data = rootNodes.value.flatMap((node) => flattenNodeTree(node))
  return data
})

const filteredElementsData = computed(() => {
  const term = searchTerm.value.toLowerCase()
  return elementsData.value.filter(
    (element) =>
      element.name.toLowerCase().includes(term) ||
      element.type.toLowerCase().includes(term) ||
      element.speckle_type.toLowerCase().includes(term) ||
      element.id.toLowerCase().includes(term) ||
      element.category.toLowerCase().includes(term)
  )
})

// Watch for changes in rootNodes
watch(rootNodes, (newValue) => {
  console.log('rootNodes updated:', JSON.stringify(newValue, null, 2))
})

// Watch on elementsData
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

/* Viewer styles */
:deep(.viewer-layout-panel) {
  max-height: 80vh;
  overflow-y: auto;
}
</style>
