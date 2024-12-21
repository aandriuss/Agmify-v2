<template>
  <div></div>
  <!-- This component doesn't render anything, it just handles data management -->
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import { useElementsData } from '~/composables/core/tables/state/useElementsData'
import type {
  AvailableParameter,
  ElementData,
  TableRow,
  TableColumn,
  ElementsDataReturn
} from '~/composables/core/types'

const props = defineProps<{
  scheduleData: ElementData[]
  evaluatedData: ElementData[]
  parameters: AvailableParameter[]
  parentColumns: TableColumn[]
  childColumns: TableColumn[]
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
}: ElementsDataReturn = useElementsData({
  selectedParentCategories: computed(() => props.selectedParentCategories),
  selectedChildCategories: computed(() => props.selectedChildCategories)
})

// Watch for data changes
watch(
  () => tableData,
  (newData) => {
    try {
      if (!props.isInitialized) {
        debug.warn(DebugCategories.STATE, 'Waiting for initialization')
        return
      }

      const data = Array.isArray(newData) ? newData : []
      const filtered = Array.isArray(filteredData) ? filteredData : []

      debug.log(DebugCategories.DATA_TRANSFORM, 'Table data updated', {
        count: data.length,
        filteredCount: filtered.length,
        timestamp: new Date().toISOString(),
        categories: {
          parent: props.selectedParentCategories,
          child: props.selectedChildCategories
        },
        isLoading,
        processingState
      })
      emit('update:tableData', data)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      debug.error(DebugCategories.ERROR, 'Error updating table data:', error)
      emit('error', error)
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
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      debug.error(DebugCategories.ERROR, 'Error updating categories:', error)
      emit('error', error)
    }
  },
  { immediate: true }
)

// Watch for errors with proper type handling
watch(
  () => hasError,
  (error) => {
    if (error && processingState.error) {
      emit('error', processingState.error)
    }
  }
)

// Expose necessary state
defineExpose({
  tableData,
  filteredData,
  isLoading,
  hasError,
  processingState
})
</script>
