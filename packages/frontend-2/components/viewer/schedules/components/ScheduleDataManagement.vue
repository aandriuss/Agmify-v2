<template>
  <div></div>
  <!-- This component doesn't render anything, it just handles data management -->
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { debug, DebugCategories } from '../debug/useDebug'
import { useElementsData } from '../composables/useElementsData'
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

// Initialize data management with selected categories
const {
  tableData,
  scheduleData: filteredData,
  updateCategories,
  isLoading,
  hasError,
  processingState
} = useElementsData({
  selectedParentCategories: computed(() => props.selectedParentCategories),
  selectedChildCategories: computed(() => props.selectedChildCategories)
})

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
        },
        isLoading: isLoading.value,
        processingState: processingState.value
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
  async ([newParentCats, newChildCats]) => {
    if (!props.isInitialized) {
      debug.warn(DebugCategories.STATE, 'Waiting for initialization')
      return
    }

    try {
      debug.log(DebugCategories.CATEGORIES, 'Categories changed', {
        parent: newParentCats,
        child: newChildCats,
        timestamp: new Date().toISOString()
      })

      await updateCategories(newParentCats, newChildCats)
    } catch (error) {
      debug.error(DebugCategories.ERROR, 'Error updating categories:', error)
      emit('error', error instanceof Error ? error : new Error(String(error)))
    }
  },
  { immediate: true }
)

// Watch for errors
watch(hasError, (error) => {
  if (error) {
    emit('error', processingState.value.error || new Error('Unknown error occurred'))
  }
})

// Expose necessary state
defineExpose({
  tableData,
  filteredData,
  isLoading,
  hasError,
  processingState
})
</script>
