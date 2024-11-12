<template>
  <div></div>
  <!-- This component doesn't render anything, it just handles parameter management -->
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useParameterManagement } from '../composables/useParameterManagement'
import { useScheduleParameters } from '../composables/useScheduleParameters'
import { debug, DebugCategories } from '../utils/debug'
import type { CustomParameter } from '~/composables/useUserSettings'
import type { ElementData } from '../types'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'

interface ProcessedHeader {
  field: string
  header?: string
  category?: string
}

const props = defineProps<{
  scheduleData: ElementData[]
  customParameters: CustomParameter[]
  selectedParentCategories: string[]
  selectedChildCategories: string[]
  availableHeaders: {
    parent: ProcessedHeader[]
    child: ProcessedHeader[]
  }
  isInitialized: boolean
}>()

const emit = defineEmits<{
  'update:parameterColumns': [value: ColumnDef[]]
  'update:evaluatedData': [value: ElementData[]]
  'update:mergedParentParameters': [value: CustomParameter[]]
  'update:mergedChildParameters': [value: CustomParameter[]]
  error: [error: Error]
}>()

// Initialize parameter management
const { parameterColumns, evaluatedData, updateParameterVisibility } =
  useParameterManagement({
    parameters: computed(() => props.customParameters),
    data: computed(() => props.scheduleData),
    isInitialized: computed(() => props.isInitialized)
  })

// Initialize schedule parameters
const { mergedParentParameters, mergedChildParameters } = useScheduleParameters({
  availableHeaders: computed(() => props.availableHeaders),
  customParameters: computed(() => props.customParameters),
  selectedParentCategories: computed(() => props.selectedParentCategories),
  selectedChildCategories: computed(() => props.selectedChildCategories),
  isInitialized: computed(() => props.isInitialized)
})

// Watch for parameter changes
watch(
  [parameterColumns, evaluatedData, mergedParentParameters, mergedChildParameters],
  ([newParamCols, newEvalData, newParentParams, newChildParams]) => {
    debug.log(DebugCategories.PARAMETERS, 'Parameter state updated', {
      parameterColumns: newParamCols?.length || 0,
      evaluatedData: newEvalData?.length || 0,
      mergedParentParameters: newParentParams?.length || 0,
      mergedChildParameters: newChildParams?.length || 0,
      timestamp: new Date().toISOString()
    })

    emit('update:parameterColumns', newParamCols || [])
    emit('update:evaluatedData', newEvalData || [])
    emit('update:mergedParentParameters', newParentParams || [])
    emit('update:mergedChildParameters', newChildParams || [])
  },
  { immediate: true }
)

// Expose necessary functions and state
defineExpose({
  parameterColumns,
  evaluatedData,
  mergedParentParameters,
  mergedChildParameters,
  updateParameterVisibility
})
</script>
