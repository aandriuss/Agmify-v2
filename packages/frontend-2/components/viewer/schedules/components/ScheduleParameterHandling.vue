<template>
  <div></div>
  <!-- This component doesn't render anything, it just handles parameter management -->
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { debug, DebugCategories } from '../debug/useDebug'
import type {
  ElementData,
  Parameter,
  ColumnDef,
  StoreParameterValue,
  StoreParameterDefinition,
  BimValueType,
  UserParameter,
  BimParameter
} from '~/composables/core/types'
import {
  convertToStoreParameterValue,
  convertToStoreParameterDefinition,
  validateElementDataArray,
  isUserParameter,
  isBimParameter,
  createBimParameter,
  isPrimitiveValue
} from '~/composables/core/types'
import type { ParameterDefinition } from '~/components/viewer/components/tables/DataTable/composables/parameters/parameterManagement'

// Import new core functionality
import { useStore } from '../core/store'
import { discoverParameters } from '../features/parameters/discovery'
import { processElementParameters } from '../features/parameters/processing'

// Convert discovered parameter to BIM parameter
function convertToBimParameter(def: ParameterDefinition): BimParameter {
  return createBimParameter({
    id: def.field,
    field: def.field,
    name: def.name,
    type: def.type as BimValueType,
    header: def.header,
    visible: def.visible ?? true,
    removable: def.removable ?? true,
    value: null,
    sourceValue: null,
    fetchedGroup: def.category ?? 'Parameters',
    currentGroup: def.category ?? 'Parameters'
  })
}

// Create BIM parameter from value
function createBimParameterFromValue(
  field: string,
  value: unknown,
  type: BimValueType
): BimParameter {
  return createBimParameter({
    id: field,
    field,
    name: field,
    type,
    header: field,
    visible: true,
    removable: true,
    value: isPrimitiveValue(value) ? value : null,
    sourceValue: null,
    fetchedGroup: 'Parameters',
    currentGroup: 'Parameters'
  })
}

// Type guard for parameters object
function isParametersObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// Type guard for store parameter value
function isStoreParameterValue(value: unknown): value is StoreParameterValue {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    'type' in value &&
    'value' in value &&
    'isValid' in value
  )
}

// Create error with safe message
class ParameterError extends Error {
  readonly _tag = 'ParameterError' as const

  constructor(message: string) {
    super(message)
    this.name = 'ParameterError'
  }

  static fromError(error: Error): ParameterError {
    return new ParameterError(error.message)
  }

  static fromString(message: string): ParameterError {
    return new ParameterError(message)
  }
}

const props = defineProps<{
  scheduleData: ElementData[]
  customParameters: UserParameter[]
  selectedParentCategories: string[]
  selectedChildCategories: string[]
  availableHeaders: {
    parent: Parameter[]
    child: Parameter[]
  }
  isInitialized: boolean
}>()

const emit = defineEmits<{
  'update:parameterColumns': [value: ColumnDef[]]
  'update:evaluatedData': [value: ElementData[]]
  'update:mergedParentParameters': [value: UserParameter[]]
  'update:mergedChildParameters': [value: UserParameter[]]
  error: [error: ParameterError]
}>()

// Initialize store
const store = useStore()

// State for processed data
const processedData = ref<ElementData[]>([])

// Process parameters
async function processParameters() {
  if (!props.isInitialized || !validateElementDataArray(props.scheduleData)) return

  try {
    // Discover parameters
    const discoveredParams = await discoverParameters(props.scheduleData, {
      sampleSize: 100,
      minFrequency: 0.1,
      excludeParams: new Set(props.customParameters.map((p) => p.field))
    })

    // Convert discovered parameters to BIM parameters
    const bimParams = discoveredParams.map(convertToBimParameter)

    // Process data with all parameters
    const processed = await processElementParameters(props.scheduleData, [
      ...discoveredParams,
      ...props.customParameters
    ])

    processedData.value = processed

    // Update store with both processed data and parameter definitions
    const safeProcessedParameters: Record<string, StoreParameterValue> = {}
    const safeParamDefinitions: Record<string, StoreParameterDefinition> = {}

    // Safely process parameters
    processed.forEach((item) => {
      const params = item.parameters as Record<string, unknown>
      if (isParametersObject(params)) {
        for (const [key, value] of Object.entries(params)) {
          if (typeof key === 'string' && value !== undefined) {
            // Create a BIM parameter from the value
            const param = createBimParameterFromValue(key, value, 'string')
            const result = convertToStoreParameterValue(param)
            if (result && isStoreParameterValue(result)) {
              safeProcessedParameters[key] = result
            }
          }
        }
      }
    })

    // Safely process definitions
    const allParams = [...bimParams, ...props.customParameters]
    allParams.forEach((param) => {
      if (isUserParameter(param) || isBimParameter(param)) {
        const converted = convertToStoreParameterDefinition(param)
        if (converted) {
          safeParamDefinitions[param.field] = converted
        }
      }
    })

    await store.lifecycle.update({
      ...store.state.value,
      evaluatedData: processed,
      processedParameters: safeProcessedParameters,
      parameterDefinitions: safeParamDefinitions
    })
  } catch (err) {
    const error =
      err instanceof Error
        ? ParameterError.fromError(err)
        : ParameterError.fromString('Parameter processing failed')
    debug.error(DebugCategories.PARAMETERS, 'Parameter processing error:', error)
    emit('error', error)
  }
}

// Create parameter columns from parameter definitions
const parameterColumns = computed<ColumnDef[]>(() => {
  const paramDefs = store.state.value.parameterDefinitions
  return Object.values(paramDefs).map(
    (def) =>
      ({
        id: def.field,
        name: def.name,
        field: `parameters.${def.field}`,
        header: def.header ?? def.name,
        type: def.type,
        visible: def.visible ?? true,
        order: def.order ?? 0,
        removable: def.removable ?? true,
        category: def.category,
        currentGroup: def.category ?? 'Parameters',
        parameterRef: def.field
      } satisfies ColumnDef)
  )
})

// Helper function to safely get parameter field
function getParameterField(param: Parameter): string | null {
  if (isUserParameter(param)) return param.field
  if (isBimParameter(param)) return param.field
  return null
}

// Split parameters by category
const parentParameters = computed(() =>
  props.customParameters.filter((param) =>
    props.availableHeaders.parent.some((header) => {
      const field = getParameterField(header)
      return field !== null && field === param.field
    })
  )
)

const childParameters = computed(() =>
  props.customParameters.filter((param) =>
    props.availableHeaders.child.some((header) => {
      const field = getParameterField(header)
      return field !== null && field === param.field
    })
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
