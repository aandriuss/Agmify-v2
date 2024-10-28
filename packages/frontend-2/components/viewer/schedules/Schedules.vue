<template>
  <div>
    <ViewerLayoutPanel :initial-width="400" @close="$emit('close')">
      <template #title>Elements Schedule</template>
      <div class="p-4">
        <DataTable
          :key="tableKey"
          v-model:expandedRows="expandedRows"
          :table-id="TABLE_ID"
          :data="scheduleData"
          :columns="tableColumns"
          :detail-columns="detailColumns"
          :expand-button-aria-label="'Expand row'"
          :collapse-button-aria-label="'Collapse row'"
          data-key="id"
          @update:columns="handleParentColumnsUpdate"
          @update:detail-columns="handleChildColumnsUpdate"
          @update:both-columns="handleBothColumnsUpdate"
          @column-reorder="handleColumnReorder"
        />
      </div>
    </ViewerLayoutPanel>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useUserSettings } from '~/composables/useUserSettings'
import { useElementsData } from '~/composables/useElementsData'
import DataTable from '~/components/viewer/tables/DataTable.vue'

const emit = defineEmits(['close'])
const TABLE_ID = 'elements-schedule'
const { settings, loading, saveSettings, loadSettings } = useUserSettings(TABLE_ID)
const { scheduleData } = useElementsData()

const defaultParentColumns = [
  { field: 'id', header: 'ID', visible: true, order: 0 },
  { field: 'category', header: 'Category', visible: true, order: 1 },
  { field: 'mark', header: 'Mark', visible: true, order: 2 },
  { field: 'host', header: 'Host', visible: true, order: 3 },
  { field: 'comment', header: 'Comment', visible: true, order: 4 }
]

const defaultChildColumns = [
  { field: 'id', header: 'ID', visible: true, order: 0 },
  { field: 'category', header: 'Category', visible: true, order: 1 },
  { field: 'mark', header: 'Mark', visible: true, order: 2 },
  { field: 'host', header: 'Host', visible: true, order: 3 },
  { field: 'comment', header: 'Comment', visible: true, order: 4 }
]

// Table columns with settings
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
    if (!newColumns?.length) {
      console.error('No columns provided to update')
      return
    }

    const columnsToSave = newColumns.map((col, index) => ({
      ...col,
      order: index,
      visible: col.visible ?? true,
      header:
        col.header || defaultParentColumns.find((c) => c.field === col.field)?.header,
      field: col.field
    }))

    console.log('Saving reordered parent columns:', columnsToSave)
    await saveSettings({
      parentColumns: columnsToSave
    })
  } catch (error) {
    console.error('Failed to save parent columns:', error)
  }
}

const handleChildColumnsUpdate = async (newColumns) => {
  try {
    if (!newColumns?.length) {
      console.error('No columns provided to update')
      return
    }

    const columnsToSave = newColumns.map((col, index) => ({
      ...col,
      order: index,
      visible: col.visible ?? true,
      // Preserve other properties that might be lost in reordering
      header:
        col.header || defaultChildColumns.find((c) => c.field === col.field)?.header,
      field: col.field
    }))

    console.log('Saving reordered child columns:', columnsToSave)
    await saveSettings({
      childColumns: columnsToSave
    })
  } catch (error) {
    console.error('Failed to save child columns:', error)
  }
}

const handleBothColumnsUpdate = async (updates: {
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
}) => {
  try {
    const { parentColumns, childColumns } = updates

    const parentColumnsToSave = parentColumns?.map((col, index) => ({
      ...col,
      order: index,
      visible: col.visible ?? true
    }))

    const childColumnsToSave = childColumns?.map((col, index) => ({
      ...col,
      order: index,
      visible: col.visible ?? true
    }))

    await saveSettings({
      parentColumns: parentColumnsToSave,
      childColumns: childColumnsToSave
    })
  } catch (error) {
    console.error('Failed to save column updates:', error)
  }
}

const handleColumnReorder = async (event) => {
  console.log('Column reorder started')
  const dataTable = event.target.closest('.p-datatable')
  const isChildTable = dataTable.classList.contains('nested-table')

  // Get headers and build reordered columns list
  const headers = Array.from(dataTable.querySelectorAll('th[data-field]'))
  const reorderedColumns = headers
    .map((header, index) => {
      const field = header.getAttribute('data-field')
      const sourceColumns = isChildTable ? detailColumns.value : tableColumns.value
      const existingColumn = sourceColumns.find((col) => col.field === field)

      return {
        ...existingColumn,
        order: index,
        visible: true,
        header: existingColumn.header,
        field: existingColumn.field
      }
    })
    .filter(Boolean)

  console.log('Reordered columns before save:', reorderedColumns)

  try {
    // Save directly to db using saveSettings
    await saveSettings({
      [isChildTable ? 'childColumns' : 'parentColumns']: reorderedColumns
    })

    console.log('Columns saved successfully')

    // Force a table refresh by updating the key
    tableKey.value = Date.now().toString()
  } catch (error) {
    console.error('Failed to save reordered columns:', error)
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

  const currentSettings = {
    isLoading: loading.value,
    settings: settings.value,
    parentColumns: settings.value?.tables?.[TABLE_ID]?.parentColumns,
    childColumns: settings.value?.tables?.[TABLE_ID]?.childColumns,
    tableColumns: tableColumns.value,
    detailColumns: detailColumns.value
  }
  console.log('Component mounted with:', currentSettings)

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
</script>

<style scoped>
.random {
  display: none;
}
</style>
