<template>
  <div>
    <ViewerLayoutPanel :initial-width="400" @close="$emit('close')">
      <template #title>Datasets</template>
      <div class="p-4">
        <DataTable
          :key="tableKey"
          v-model:expandedRows="expandedRows"
          :table-id="TABLE_ID"
          :data="schedules"
          :columns="tableColumns"
          :detail-columns="detailColumns"
          :expand-button-aria-label="'Expand row'"
          :collapse-button-aria-label="'Collapse row'"
          data-key="id"
          @update:columns="handleParentColumnsUpdate"
          @update:detail-columns="handleChildColumnsUpdate"
        ></DataTable>
      </div>
    </ViewerLayoutPanel>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useUserSettings } from '~/composables/useUserSettings'
import DataTable from '~/components/viewer/tables/DataTable.vue'

// Define emits
defineEmits(['close'])

const TABLE_ID = 'schedules-table'
// Use single instance of useUserSettings
const {
  parentTableConfig,
  childTableConfig,
  settings,
  loading,
  saveSettings,
  updateSettings
} = useUserSettings(TABLE_ID)

const defaultParentColumns = [
  { field: 'name', header: 'Name', visible: true, order: 0 },
  {
    field: 'startDate',
    header: 'Start Date',
    visible: true,

    order: 1
  },
  { field: 'endDate', header: 'End Date', visible: true, order: 2 }
]

const defaultChildColumns = [
  {
    field: 'description',
    header: 'Description',
    visible: true,
    order: 0
  },
  { field: 'assignee', header: 'Assignee', visible: true, order: 1 },
  { field: 'priority', header: 'Priority', visible: true, order: 2 },
  { field: 'status', header: 'Status', visible: true, order: 3 }
]

// Table columns
const tableColumns = computed(() => {
  const savedColumns = settings.value?.tables?.[TABLE_ID]?.parentColumns
  if (savedColumns?.length > 0) {
    return [...savedColumns].sort((a, b) => a.order - b.order)
  }
  return defaultParentColumns
})

const detailColumns = computed(() => {
  const savedColumns = settings.value?.tables?.[TABLE_ID]?.childColumns
  if (savedColumns?.length > 0) {
    return [...savedColumns].sort((a, b) => a.order - b.order)
  }
  return defaultChildColumns
})

const expandedRows = ref([])

// Sample data
const schedules = ref([
  {
    id: 1,
    name: 'Schedule 1',
    startDate: '2024-01-01',
    endDate: '2024-01-10',
    details: [
      {
        id: '1-1',
        description: 'Task 1',
        assignee: 'John Doe',
        priority: 'High',
        status: 'In Progress'
      },
      {
        id: '1-2',
        description: 'Task 2',
        assignee: 'Jane Smith',
        priority: 'Medium',
        status: 'Pending'
      }
    ]
  },
  {
    id: 2,
    name: 'Schedule 2',
    startDate: '2024-02-01',
    endDate: '2024-02-10',
    details: [
      {
        id: '2-1',
        description: 'Task 1',
        assignee: 'John Doe',
        priority: 'High',
        status: 'In Progress'
      },
      {
        id: '2-2',
        description: 'Task 2',
        assignee: 'Jane Smith',
        priority: 'Medium',
        status: 'Pending'
      }
    ]
  }
])

//TODO make this work without the need for a key
// Refresh key
const tableKey = computed(() => {
  return JSON.stringify({
    parent: settings.value?.tables?.[TABLE_ID]?.parentColumns,
    child: settings.value?.tables?.[TABLE_ID]?.childColumns
  })
})

// Watch for initial load AND subsequent changes
watch(
  () => settings.value?.tables?.[TABLE_ID]?.parentColumns,
  (newColumns) => {
    console.log('Parent columns loaded:', newColumns)
  },
  { immediate: true }
)

watch(
  () => settings.value?.tables?.[TABLE_ID]?.childColumns,
  (newColumns) => {
    console.log('Child columns loaded:', newColumns)
  },
  { immediate: true }
)

const handleParentColumnsUpdate = async (newColumns) => {
  try {
    if (!newColumns) {
      console.error('No columns provided to update')
      return
    }

    const columnsToSave = newColumns.map((col, index) => ({
      ...col,
      order: index
    }))

    // Log the update attempt
    console.log('Attempting to save parent columns:', columnsToSave)

    await saveSettings({
      parentColumns: columnsToSave
    })
  } catch (error) {
    console.error('Failed to save parent columns:', error)
  }
}

const handleChildColumnsUpdate = async (newColumns) => {
  try {
    if (!newColumns) {
      console.error('No columns provided to update')
      return
    }

    const columnsToSave = newColumns.map((col, index) => ({
      ...col,
      order: index
    }))

    // Log the update attempt
    console.log('Attempting to save child columns:', columnsToSave)

    await saveSettings({
      childColumns: columnsToSave
    })
  } catch (error) {
    console.error('Failed to save child columns:', error)
  }
}

onMounted(async () => {
  // Load initial settings
  await loadSettings()

  // If no settings exist, initialize with defaults
  if (!settings.value?.tables?.[TABLE_ID]) {
    console.log('Initializing default settings')
    await saveSettings({
      parentColumns: defaultParentColumns,
      childColumns: defaultChildColumns
    })
  }

  // Debug logging
  watch(
    () => settings.value?.tables?.[TABLE_ID],
    (newSettings) => {
      console.log('Table settings changed:', {
        parentColumns: newSettings?.parentColumns,
        childColumns: newSettings?.childColumns
      })
    },
    { deep: true }
  )
})

// Debug mount
onMounted(() => {
  loadSettings()
  const currentSettings = {
    isLoading: loading.value,
    settings: settings.value,
    parentColumns: settings.value?.tables?.[TABLE_ID]?.parentColumns,
    childColumns: settings.value?.tables?.[TABLE_ID]?.childColumns,
    tableColumns: tableColumns.value,
    detailColumns: detailColumns.value
  }
  console.log('Component mounted with:', currentSettings)

  // Initialize settings if they don't exist
  if (!settings.value?.tables?.[TABLE_ID]) {
    const initialSettings = {
      tables: {
        [TABLE_ID]: {
          parentColumns: defaultParentColumns,
          childColumns: defaultChildColumns
        }
      }
    }
    saveSettings(initialSettings)
  }
})
</script>

<style scoped>
.random {
  display: none;
}
</style>
