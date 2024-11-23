<template>
  <div></div>
  <!-- This component doesn't render anything, it just handles data management -->
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useScheduleDataTransform } from '../composables/useScheduleDataTransform'
import { useDataOrganization } from '../composables/useDataOrganization'
import { debug, DebugCategories } from '../debug/useDebug'
import type { CustomParameter } from '~/composables/useUserSettings'
import type { ElementData, TableRow } from '../types'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'

const props = defineProps<{
  scheduleData: ElementData[]
  evaluatedData: ElementData[]
  customParameters: CustomParameter[]
  mergedTableColumns: ColumnDef[]
  mergedDetailColumns: ColumnDef[]
  selectedParentCategories: string[]
  selectedChildCategories: string[]
  isInitialized: boolean
}>()

const emit = defineEmits<{
  'update:tableData': [value: TableRow[]]
  error: [error: Error]
}>()

// Initialize data transform with selected categories
const { tableData, filteredData } = useScheduleDataTransform({
  scheduleData: computed(() => props.scheduleData),
  evaluatedData: computed(() => props.evaluatedData),
  customParameters: computed(() => props.customParameters),
  mergedTableColumns: computed(() => props.mergedTableColumns),
  mergedDetailColumns: computed(() => props.mergedDetailColumns),
  selectedParentCategories: computed(() => props.selectedParentCategories),
  selectedChildCategories: computed(() => props.selectedChildCategories),
  isInitialized: computed(() => props.isInitialized)
})

// Only initialize data organization when we have data
const { updateRootNodes } = props.isInitialized
  ? useDataOrganization()
  : { updateRootNodes: () => {} }

// Watch for data changes
watch(
  () => tableData.value,
  (newData) => {
    try {
      if (!props.isInitialized) {
        debug.warn(DebugCategories.STATE, 'Waiting for initialization')
        return
      }

      debug.log(DebugCategories.DATA_TRANSFORM, 'Table data updated', {
        count: newData?.length || 0,
        filteredCount: filteredData.value.length,
        timestamp: new Date().toISOString(),
        categories: {
          parent: props.selectedParentCategories,
          child: props.selectedChildCategories
        }
      })
      emit('update:tableData', newData || [])
    } catch (error) {
      debug.error(DebugCategories.ERROR, 'Error updating table data:', error)
      emit('error', error instanceof Error ? error : new Error(String(error)))
    }
  },
  { immediate: true }
)

// Watch for category changes
watch(
  [() => props.selectedParentCategories, () => props.selectedChildCategories],
  ([newParentCats, newChildCats]) => {
    if (!props.isInitialized) {
      debug.warn(DebugCategories.STATE, 'Waiting for initialization')
      return
    }

    debug.log(DebugCategories.CATEGORIES, 'Categories changed', {
      parent: newParentCats,
      child: newChildCats,
      timestamp: new Date().toISOString()
    })
  },
  { immediate: true }
)

// Expose necessary functions and state
defineExpose({
  tableData,
  filteredData,
  updateRootNodes
})
</script>
