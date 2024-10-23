<template>
  <div>
    <ViewerLayoutPanel @close="$emit('close')">
      <template #title>Datasets</template>
      <div class="p-4">
        <DataTable
          :data="schedules"
          :columns="tableColumns"
          :detail-columns="detailColumns"
        />
      </div>
    </ViewerLayoutPanel>
  </div>
</template>

<script setup lang="ts">
// import { ViewerEvent } from '@speckle/viewer'
import { ref } from 'vue'
// import { ref, computed, watch, getCurrentInstance } from 'vue'
// import { ref, computed, watch, onMounted, getCurrentInstance } from 'vue'
// import { useViewerEventListener } from '~~/lib/viewer/composables/viewer'
// import { useRootNodes } from '~/components/viewer/composables/useRootNodes'
// import {
//   useInjectedViewerLoadedResources,
//   useInjectedViewer
// } from '~~/lib/viewer/composables/setup'

// import { LayoutDialog, FormButton } from '@speckle/ui-components'
import DataTable from '~/components/viewer/tables/DataTable.vue'

// Define emits
defineEmits(['close'])

// Define columns configuration
const tableColumns = [
  { field: 'name', header: 'Name', visible: true },
  { field: 'startDate', header: 'Start Date', visible: true },
  { field: 'endDate', header: 'End Date', visible: true }
]

const detailColumns = [
  { field: 'description', header: 'Description' },
  { field: 'assignee', header: 'Assignee' },
  { field: 'priority', header: 'Priority' },
  { field: 'status', header: 'Status' }
]

// Sample data
const schedules = ref([
  {
    name: 'Schedule 1',
    startDate: '2024-01-01',
    endDate: '2024-01-10',
    details: [
      {
        description: 'Task 1',
        assignee: 'John Doe',
        priority: 'High',
        status: 'In Progress'
      },
      {
        description: 'Task 2',
        assignee: 'Jane Smith',
        priority: 'Medium',
        status: 'Pending'
      }
    ]
  },
  {
    name: 'Schedule 2',
    startDate: '2024-02-01',
    endDate: '2024-02-10',
    details: [
      {
        description: 'Task 3',
        assignee: 'Alice Johnson',
        priority: 'Low',
        status: 'Completed'
      },
      {
        description: 'Task 4',
        assignee: 'Bob Wilson',
        priority: 'High',
        status: 'In Progress'
      }
    ]
  }
])

//<<<<<<<<<<<<

// // Row expansion handlers
// const onRowExpand = (event) => {
//   console.log('Row expanded:', event.data)
// }

// const onRowCollapse = (event) => {
//   console.log('Row collapsed:', event.data)
// }

// // Injected viewer state and resources
// const { modelsAndVersionIds } = useInjectedViewerLoadedResources()
// const {
//   metadata: { worldTree, availableFilters: allFilters }
// } = useInjectedViewer()

// // State variables
// const manualExpandLevel = ref(-1)
// const showRaw = ref(false)
// const refhack = ref(1)
// const searchTerm = ref('')
// const selectedModelId = ref(null) // New state to track selected model

// // Viewer event listener
// useViewerEventListener(ViewerEvent.Busy, (isBusy: boolean) => {
//   if (!isBusy) refhack.value++
// })

// // Use root nodes composable
// const { rootNodes, expandLevel } = useRootNodes()

// // Handle collapsing of nodes
// const collapse = () => {
//   if (expandLevel.value > -1) expandLevel.value--
//   if (manualExpandLevel.value > -1) manualExpandLevel.value--
// }

// function flattenNodeTree(node: any, depth = 0): any[] {
//   if (depth > 15 || !node) return []

//   if (typeof node === 'object' && node !== null) {
//     if (isBuildingElement(node)) {
//       return [processNode(node)]
//     }

//     return Object.values(node).flatMap((value) => flattenNodeTree(value, depth + 1))
//   }

//   return []
// }

// function isBuildingElement(node: any): boolean {
//   const buildingElementTypes = [
//     'IFCWALL',
//     'IFCWALLSTANDARDCASE',
//     'IFCSLAB',
//     'IFCBEAM',
//     'IFCCOLUMN',
//     'IFCDOOR',
//     'IFCWINDOW',
//     'IFCROOF',
//     'IFCSTAIR',
//     'IFCRAILING',
//     'IFCMEMBER',
//     'IFCSITE',
//     'IFCPROJECT'
//   ]
//   return (
//     node &&
//     (buildingElementTypes.includes(node.type || node.speckle_type) || node.ObjectType)
//   )
// }

// function processNode(node: any): any {
//   const {
//     id,
//     type,
//     speckle_type,
//     Name,
//     ObjectType,
//     GlobalId,
//     Dimensions,
//     Pset_WallCommon,
//     Pset_ProductRequirements,
//     ...additionalProperties
//   } = node

//   return {
//     id: id || GlobalId || 'N/A',
//     type: type || 'Unknown',
//     speckle_type: speckle_type || 'N/A',
//     name: Name || node.name || 'Unnamed',
//     category: ObjectType || Pset_ProductRequirements?.Category || 'N/A',
//     dimensions: Dimensions
//       ? `L: ${Dimensions.Length}, W: ${Dimensions.Width || 'N/A'}, H: ${
//           Dimensions.Height || 'N/A'
//         }`
//       : 'N/A',
//     isExternal: Pset_WallCommon?.IsExternal || 'N/A',
//     additionalProperties: JSON.stringify(additionalProperties)
//   }
// }

// // Open the Speckle Viewer with the selected model ID
// function openViewer(modelId: string) {
//   selectedModelId.value = modelId
// }

// // Computed property for table data
// const elementsData = computed(() => {
//   const data = rootNodes.value.flatMap((node) => flattenNodeTree(node))
//   return data
// })

// const filteredElementsData = computed(() => {
//   const term = searchTerm.value.toLowerCase()
//   return elementsData.value.filter(
//     (element) =>
//       element.name.toLowerCase().includes(term) ||
//       element.type.toLowerCase().includes(term) ||
//       element.speckle_type.toLowerCase().includes(term) ||
//       element.id.toLowerCase().includes(term) ||
//       element.category.toLowerCase().includes(term)
//   )
// })

// // Watch for changes in rootNodes
// watch(rootNodes, (newValue) => {
//   console.log('rootNodes updated:', JSON.stringify(newValue, null, 2))
// })

// // Watch on elementsData
// watch(elementsData, (newValue) => {
//   console.log('elementsData updated:', JSON.stringify(newValue, null, 2))
// })
</script>

<style scoped>
.random {
  display: none;
}
</style>
