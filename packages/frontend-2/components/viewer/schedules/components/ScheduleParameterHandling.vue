<template>
  <div></div>
  <!-- This component doesn't render anything, it just handles parameter management -->
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
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

// Import core functionality
import { useStore } from '../core/store'
import { processElementParameters } from '../features/parameters/processing'

// Convert discovered parameter to BIM parameter
function convertToBimParameter(
  field: string,
  value: unknown,
  category?: string
): BimParameter {
  const type = determineValueType(value)
  return createBimParameter({
    id: field,
    field,
    name: field,
    type,
    header: field,
    visible: true,
    removable: true,
    value: isPrimitiveValue(value) ? value : null,
    sourceValue: isPrimitiveValue(value) ? value : null,
    fetchedGroup: category ?? 'Parameters',
    currentGroup: category ?? 'Parameters'
  })
}

// Determine BIM value type from a value
function determineValueType(value: unknown): BimValueType {
  if (value === null || value === undefined) return 'string'
  if (typeof value === 'string') return 'string'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'boolean') return 'boolean'
  if (value instanceof Date) return 'date'
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'object') return 'object'
  return 'string'
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

  static fromError(error: unknown): ParameterError {
    if (error instanceof Error) {
      return new ParameterError(error.message)
    }
    return new ParameterError('Unknown error occurred')
  }

  static fromString(message: unknown): ParameterError {
    return new ParameterError(
      typeof message === 'string' ? message : 'Unknown error occurred'
    )
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
    // Discover parameters from data
    const discoveredParams = new Map<string, BimParameter>()

    // Process first 100 items to discover parameters
    const sampleSize = Math.min(100, props.scheduleData.length)
    for (let i = 0; i < sampleSize; i++) {
      const element = props.scheduleData[i]
      if (element && isParametersObject(element.parameters)) {
        for (const [field, value] of Object.entries(element.parameters)) {
          // Skip if already a custom parameter
          if (props.customParameters.some((p) => p.field === field)) continue

          // Create or update BIM parameter
          if (!discoveredParams.has(field)) {
            discoveredParams.set(field, convertToBimParameter(field, value))
          }
        }
      }
    }

    // Convert to array and combine with custom parameters
    const allParameters: Parameter[] = [
      ...Array.from(discoveredParams.values()),
      ...props.customParameters
    ]

    // Process data with all parameters
    const processed = await processElementParameters(props.scheduleData, allParameters)
    processedData.value = processed

    // Update store with processed data and parameter definitions
    const safeProcessedParameters: Record<string, StoreParameterValue> = {}
    const safeParamDefinitions: Record<string, StoreParameterDefinition> = {}

    // Safely process parameters
    processed.forEach((item) => {
      const params = item.parameters as Record<string, unknown>
      if (isParametersObject(params)) {
        for (const [key, value] of Object.entries(params)) {
          if (typeof key === 'string' && value !== undefined) {
            const param =
              discoveredParams.get(key) ??
              props.customParameters.find((p) => p.field === key)

            if (param) {
              const result = convertToStoreParameterValue(param)
              if (result && isStoreParameterValue(result)) {
                safeProcessedParameters[key] = result
              }
            }
          }
        }
      }
    })

    // Safely process definitions
    allParameters.forEach((param) => {
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
    const error = ParameterError.fromError(err)
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
