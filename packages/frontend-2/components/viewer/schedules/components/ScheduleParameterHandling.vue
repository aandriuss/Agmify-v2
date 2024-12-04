<template>
  <div></div>
  <!-- This component doesn't render anything, it just handles parameter management -->
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { debug, DebugCategories } from '../debug/useDebug'
import type {
  CustomParameter,
  ElementData,
  ProcessedHeader,
  ColumnDef,
  ParameterDefinition,
  RawParameterValue,
  RawParameterDefinition
} from '~/composables/core/types'
import {
  convertParameterMap,
  convertDefinitionMap,
  createColumnDef
} from '~/composables/core/types'

// Import new core functionality
import { useStore } from '../core/store'
import { discoverParameters } from '../features/parameters/discovery'
import { processElementParameters } from '../features/parameters/processing'
import { createParameterDefinition } from '../features/parameters/validation'

// Type guard for parameter definitions
function isParameterDefinition(value: unknown): value is ParameterDefinition {
  if (!value || typeof value !== 'object') return false
  const def = value as Record<string, unknown>
  return (
    typeof def.field === 'string' &&
    typeof def.name === 'string' &&
    typeof def.type === 'string' &&
    typeof def.header === 'string'
  )
}

// Validate and filter parameter definitions
function validateParameterDefinitionArray(
  arr: readonly unknown[]
): ParameterDefinition[] {
  if (!Array.isArray(arr)) return []

  return arr.reduce<ParameterDefinition[]>((acc, item) => {
    if (isParameterDefinition(item)) {
      acc.push({
        field: item.field,
        name: item.name,
        type: item.type,
        header: item.header,
        category: item.category,
        removable: true,
        visible: true
      })
    }
    return acc
  }, [])
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

// Initialize store
const store = useStore()

// State for processed data
const processedData = ref<ElementData[]>([])

// Process parameters
async function processParameters() {
  if (!props.isInitialized) return

  try {
    // Discover parameters
    const discoveredParams = await discoverParameters(props.scheduleData, {
      sampleSize: 100,
      minFrequency: 0.1,
      excludeParams: new Set(props.customParameters.map((p) => p.field))
    })

    // Create parameter definitions from custom parameters
    const customParamDefs = props.customParameters.map((param) => ({
      ...createParameterDefinition(param.field, param.name, {
        type: param.type,
        rules: []
      }),
      header: param.name // Add header field
    }))

    // Ensure type safety of discovered parameters
    const safeDiscoveredParams = Array.isArray(discoveredParams)
      ? validateParameterDefinitionArray(discoveredParams)
      : []
    const safeCustomParams = Array.isArray(customParamDefs)
      ? validateParameterDefinitionArray(customParamDefs)
      : []

    // Combine discovered and custom parameters
    const allParams = [...safeDiscoveredParams, ...safeCustomParams]

    // Process data with all parameters
    const processed = await processElementParameters(props.scheduleData, allParams)

    processedData.value = processed

    // Update store with both processed data and parameter definitions
    const safeProcessedParameters = Object.fromEntries(
      processed.flatMap((item) =>
        Object.entries(item.parameters || {}).filter(
          ([_, value]) => value !== undefined
        )
      )
    ) as Record<string, RawParameterValue>

    const safeParamDefinitions = Object.fromEntries(
      allParams.map((param) => [param.field, param])
    ) as Record<string, RawParameterDefinition>

    await store.lifecycle.update({
      ...store.state.value,
      evaluatedData: processed,
      processedParameters: convertParameterMap(safeProcessedParameters),
      parameterDefinitions: convertDefinitionMap(safeParamDefinitions)
    })
  } catch (err) {
    // Create a new error with a safe message
    const safeError = new Error(
      typeof err === 'string' ? err : 'Parameter processing failed'
    )
    debug.error(DebugCategories.PARAMETERS, 'Parameter processing error:', safeError)
    emit('error', safeError)
  }
}

// Create parameter columns from parameter definitions
const parameterColumns = computed<ColumnDef[]>(() => {
  const paramDefs = store.state.value.parameterDefinitions
  return Object.values(paramDefs).filter(isParameterDefinition).map(createColumnDef)
})

// Split parameters by category
const parentParameters = computed(() =>
  props.customParameters.filter((param) =>
    props.availableHeaders.parent.some((header) => header.field === param.field)
  )
)

const childParameters = computed(() =>
  props.customParameters.filter((param) =>
    props.availableHeaders.child.some((header) => header.field === param.field)
  )
)

// Watch for changes that require reprocessing
watch(
  [() => props.scheduleData, () => props.customParameters, () => props.isInitialized],
  async () => {
    await processParameters()
  },
  { immediate: true }
)

// Watch for parameter changes to emit updates
watch(
  [processedData, parameterColumns, parentParameters, childParameters],
  ([newProcessedData, newParamCols, newParentParams, newChildParams]) => {
    debug.log(DebugCategories.PARAMETERS, 'Parameter state updated', {
      parameterColumns: newParamCols.length,
      processedData: newProcessedData.length,
      parentParameters: newParentParams.length,
      childParameters: newChildParams.length,
      timestamp: new Date().toISOString()
    })

    emit('update:parameterColumns', newParamCols)
    emit('update:evaluatedData', newProcessedData)
    emit('update:mergedParentParameters', newParentParams)
    emit('update:mergedChildParameters', newChildParams)
  },
  { immediate: true }
)

// Update parameter visibility
async function updateParameterVisibility(parameterId: string, visible: boolean) {
  const currentColumns = parameterColumns.value
  const columnIndex = currentColumns.findIndex(
    (col) => col.parameterRef === parameterId
  )

  if (columnIndex !== -1) {
    const updatedColumns = [...currentColumns]
    updatedColumns[columnIndex] = {
      ...updatedColumns[columnIndex],
      visible
    }
    await Promise.resolve() // Ensure function is async
    emit('update:parameterColumns', updatedColumns)
  }
}

// Expose necessary functions and state
defineExpose({
  parameterColumns,
  evaluatedData: computed(() => processedData.value),
  availableParentParameters: computed(() => props.availableHeaders.parent),
  availableChildParameters: computed(() => props.availableHeaders.child),
  mergedParentParameters: parentParameters,
  mergedChildParameters: childParameters,
  updateParameterVisibility
})
</script>
