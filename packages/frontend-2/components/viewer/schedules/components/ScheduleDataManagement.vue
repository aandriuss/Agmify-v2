<template>
  <div></div>
  <!-- This component doesn't render anything, it just handles data management -->
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useScheduleDataTransform } from '../composables/useScheduleDataTransform'
import { useDataOrganization } from '../composables/useDataOrganization'
import { debug, DebugCategories } from '../utils/debug'
import type { CustomParameter } from '~/composables/useUserSettings'
import type { ElementData, TableRowData } from '../types'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'

const props = defineProps<{
  scheduleData: ElementData[]
  evaluatedData: ElementData[]
  customParameters: CustomParameter[]
  mergedTableColumns: ColumnDef[]
  mergedDetailColumns: ColumnDef[]
  isInitialized: boolean
}>()

const emit = defineEmits<{
  'update:tableData': [value: TableRowData[]]
  error: [error: Error]
}>()

// Data Organization
const { updateRootNodes } = useDataOrganization()

// Initialize data transform
const { tableData } = useScheduleDataTransform({
  scheduleData: computed(() => props.scheduleData),
  evaluatedData: computed(() => props.evaluatedData),
  customParameters: computed(() => props.customParameters),
  mergedTableColumns: computed(() => props.mergedTableColumns),
  mergedDetailColumns: computed(() => props.mergedDetailColumns),
  isInitialized: computed(() => props.isInitialized)
})

// Watch for table data changes
watch(
  () => tableData.value,
  (newData) => {
    debug.log(DebugCategories.DATA_TRANSFORM, 'Table data updated', {
      count: newData?.length || 0,
      timestamp: new Date().toISOString()
    })
    emit('update:tableData', newData || [])
  },
  { immediate: true }
)

// Expose necessary functions and state
defineExpose({
  tableData,
  updateRootNodes
})
</script>
