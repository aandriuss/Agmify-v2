<template>
  <div>
    <ViewerLayoutPanel @close="$emit('close')">
      <template #title>Datasets</template>
      <div class="p-4">
        <DataTable
          v-model:expandedRows="expandedRows"
          :table-id="TABLE_ID"
          :data="schedules"
          :columns="tableColumns"
          :detail-columns="detailColumns"
          @update:columns="handleColumnsUpdate"
        />
      </div>
    </ViewerLayoutPanel>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
// import { useViewerPreferences } from '~/lib/store/viewerPreferences'
import { useUserSettings } from '~/composables/useUserSettings'

import DataTable from '~/components/viewer/tables/DataTable.vue'

// Define emits
defineEmits(['close'])

const { updateSettings } = useUserSettings()
// const preferences = useViewerPreferences()
const TABLE_ID = 'schedules-table'
const { tableConfig, saveSettings } = useUserSettings(TABLE_ID)

// Define columns configuration
const defaultColumns = [
  { field: 'name', header: 'Name', visible: true, removable: false },
  { field: 'startDate', header: 'Start Date', visible: true, removable: false },
  { field: 'endDate', header: 'End Date', visible: true, removable: false }
]

const tableColumns = ref(defaultColumns)

// When a column configuration changes
const handleColumnsUpdate = (newColumns) => {
  tableColumns.value = newColumns
  saveSettings(newColumns)
}

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

// Initialize settings
onMounted(() => {
  if (tableConfig.value.length > 0) {
    tableColumns.value = tableConfig.value
  }
})

//<<<<<<<<<<<<
</script>

<style scoped>
.random {
  display: none;
}
</style>
