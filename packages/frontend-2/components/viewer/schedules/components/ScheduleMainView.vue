<template>
  <TableLayout class="viewer-container">
    <template #controls>
      <div class="flex items-center gap-4">
        <slot name="table-controls" />
      </div>
    </template>

    <template #actions>
      <div class="flex items-center gap-2">
        <slot name="table-actions" />
      </div>
    </template>

    <LoadingState
      :is-loading="unref(isComponentLoading)"
      :error="errorState"
      loading-message="Loading schedule data..."
    >
      <div class="schedule-table-container">
        <template>
          <!-- Parameter Manager -->
          <ParameterManager
            v-if="showParameterManager"
            :selected-parent-categories="store.selectedParentCategories.value"
            :selected-child-categories="store.selectedChildCategories.value"
            :available-parent-parameters="
              parameters.parentParameters.available.bim.value
            "
            :available-child-parameters="parameters.childParameters.available.bim.value"
            :selected-parent-parameters="parameters.parentParameters.selected.value"
            :selected-child-parameters="parameters.childParameters.selected.value"
            :can-create-parameters="true"
            @parameter-visibility-change="handleParameterVisibilityChange"
            @parameter-edit="handleParameterEdit"
            @parameter-create="handleParameterCreate"
            @parameter-select="handleParameterSelect"
            @parameter-deselect="handleParameterDeselect"
            @error="handleError"
          />

          <!-- Data Table -->
          <BaseDataTable
            :table-id="selectedTableId"
            :table-name="tableName"
            :data="tableData"
            :columns="parameters.parentParameters.columns.value"
            :detail-columns="parameters.childParameters.columns.value"
            :loading="isLoading"
            :error="error"
            @row-expand="events.handleRowExpand"
            @row-collapse="events.handleRowCollapse"
            @column-visibility-change="handleColumnVisibilityChange"
            @column-reorder="handleColumnReorder"
            @column-resize="handleColumnResize"
            @error="events.handleError"
            @retry="() => events.handleRetry({ timestamp: Date.now() })"
          />

          <DebugPanel
            v-if="isTestMode"
            :schedule-data="scheduleData"
            :evaluated-data="evaluatedData"
            :table-data="tableData"
            :parent-elements="parentElements"
            :child-elements="childElements"
            :parent-columns="parameters.parentParameters.columns.value"
            :child-columns="parameters.childParameters.columns.value"
            :is-test-mode="isTestMode"
            @update:is-test-mode="(value: boolean) => events.handleTestModeUpdate({ value })"
          />
        </template>
      </div>
    </LoadingState>
  </TableLayout>
</template>

<script setup lang="ts">
import { computed, watch, onMounted, unref } from 'vue'
import type { PropType } from 'vue'
import type {
  NamedTableConfig,
  TableEmits,
  ScheduleEmits,
  ElementData,
  ColumnDef
} from '~/composables/core/types'
import { useParameters } from '~/composables/core/parameters/next/useParameters'
import type {
  SelectedParameter,
  AvailableParameter
} from '~/composables/core/types/parameters/parameter-states'
import { createSelectedParameter } from '~/composables/core/types/parameters/parameter-states'
import BaseDataTable from '~/components/core/tables/BaseDataTable.vue'
import ParameterManager from '~/components/core/parameters/next/ParameterManager.vue'
import LoadingState from '~/components/core/LoadingState.vue'
import TableLayout from '~/components/core/tables/TableLayout.vue'
import DebugPanel from '~/components/core/debug/DebugPanel.vue'
import { useDebug, DebugCategories } from '~/composables/core/utils/debug'
import { useElementsData } from '~/composables/core/tables/state/useElementsData'
import { useScheduleEvents } from '~/composables/core/tables/events/useScheduleEvents'
import { useTableFlow } from '~/composables/core/tables/state/useTableFlow'
import { useStore } from '~/composables/core/store'
import { useBIMElements } from '~/composables/core/tables/state/useBIMElements'
import { useParameterStore } from '~/composables/core/parameters/store'

const debug = useDebug()
const store = useStore()
const bimElements = useBIMElements()

// Define props
const props = defineProps({
  selectedTableId: {
    type: String,
    required: true
  },
  currentTable: {
    type: Object as PropType<NamedTableConfig | null>,
    default: null
  },
  tableName: {
    type: String,
    default: ''
  },
  showParameterManager: {
    type: Boolean,
    default: false
  },
  isTestMode: {
    type: Boolean,
    default: false
  },
  isLoadingAdditionalData: {
    type: Boolean,
    default: false
  }
})

// Define emit types using the built-in event payloads
type ExtendedEmits = TableEmits & ScheduleEmits

const emit = defineEmits<ExtendedEmits>()

// Initialize core functionality first
const { scheduleData, tableData, initializeData, isLoading, state } = useElementsData({
  selectedParentCategories: computed(() => store.selectedParentCategories.value),
  selectedChildCategories: computed(() => store.selectedChildCategories.value)
})

// Initialize parameter system for UI interactions
const parameters = useParameters({
  selectedParentCategories: computed(() => store.selectedParentCategories.value),
  selectedChildCategories: computed(() => store.selectedChildCategories.value)
})

// Initialize table flow
const {
  initialize: initializeTable,
  isInitialized,
  error: tableError
} = useTableFlow({
  currentTable: computed(() => props.currentTable),
  defaultConfig: {
    id: props.selectedTableId,
    name: props.tableName,
    displayName: props.tableName,
    parentColumns: [],
    childColumns: [],
    categoryFilters: {
      selectedParentCategories: [],
      selectedChildCategories: []
    },
    selectedParameterIds: [],
    lastUpdateTimestamp: Date.now()
  }
})

// Initialize events
const events = useScheduleEvents({
  onError: (error) => emit('error', { error }),
  onRetry: () => emit('retry', { timestamp: Date.now() })
})

// Computed loading state
const isComponentLoading = computed(() => {
  return (
    isLoading.value ||
    parameters.isProcessing.value ||
    !isInitialized.value ||
    bimElements.isLoading.value
  )
})

// Error handling
interface ErrorWithDetails extends Error {
  details?: string
}

function toErrorWithDetails(error: Error | null): ErrorWithDetails | null {
  if (!error) return null
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    details: error instanceof Error ? error.stack : undefined
  }
}

// Base error state
const error = computed(() => {
  return (
    tableError.value ||
    state.value?.error ||
    bimElements.hasError.value ||
    parameters.hasError.value ||
    null
  )
})

// Converted error state for LoadingState component
const errorState = computed(() => {
  if (error.value === true) {
    return {
      name: 'Error',
      message: 'An unknown error occurred',
      details: undefined
    } as ErrorWithDetails
  }
  return toErrorWithDetails(error.value instanceof Error ? error.value : null)
})

// Event handlers
function handleParameterVisibilityChange(param: SelectedParameter) {
  parameters.updateParameterVisibility(param.id, param.visible, param.kind === 'bim')
  emit('parameter-visibility-change', { parameter: param })
}

function handleColumnVisibilityChange(event: { column: ColumnDef; visible: boolean }) {
  parameters.updateParameterVisibility(
    event.column.field,
    event.visible,
    event.column.kind === 'bim'
  )
  emit('column-visibility-change', event)
}

function handleParameterSelect(param: AvailableParameter, isParent: boolean) {
  // Get parameter store instance
  const parameterStore = useParameterStore()

  // Create selected parameter using utility function
  const selectedParam = createSelectedParameter(
    param,
    isParent
      ? parameterStore.parentSelectedParameters.value.length
      : parameterStore.childSelectedParameters.value.length
  )

  // Get current selected parameters
  const currentParams = isParent
    ? parameterStore.parentSelectedParameters.value
    : parameterStore.childSelectedParameters.value

  // Update parameter store with new selection
  parameterStore.updateSelectedParameters([...currentParams, selectedParam], isParent)
  emit('parameter-select', { parameter: selectedParam })
}

function handleParameterDeselect(param: AvailableParameter, isParent: boolean) {
  // Get parameter store instance
  const parameterStore = useParameterStore()

  // Get current selected parameters
  const currentParams = isParent
    ? parameterStore.parentSelectedParameters.value
    : parameterStore.childSelectedParameters.value

  // Remove parameter from selected parameters
  const selectedParams = currentParams.filter((p) => p.id !== param.id)
  parameterStore.updateSelectedParameters(selectedParams, isParent)
  emit('parameter-deselect', { parameter: param })
}

function handleColumnReorder(event: { dragIndex: number; dropIndex: number }) {
  // Get the columns array based on context (parent/child)
  const isParent = true // Parent columns are the default
  const columns = isParent
    ? parameters.parentParameters.columns.value
    : parameters.childParameters.columns.value

  // Get parameter ID from dragIndex
  const draggedColumn = columns[event.dragIndex]
  if (!draggedColumn) {
    debug.warn(
      DebugCategories.PARAMETERS,
      'Failed to reorder columns - invalid drag index',
      {
        dragIndex: event.dragIndex,
        columnsLength: columns.length
      }
    )
    return
  }

  // Update parameter order using ID and new index
  parameters.updateParameterOrder(draggedColumn.id, event.dropIndex, isParent)
  emit('column-reorder', event)
}

function handleColumnResize(event: { element: HTMLElement; delta: number }) {
  emit('column-resize', event)
}

function handleParameterCreate() {
  emit('create-parameter', { timestamp: Date.now() })
}

function handleParameterEdit(param: SelectedParameter) {
  // Convert SelectedParameter to BaseItem
  const baseParam = {
    id: param.id,
    name: param.name,
    field: param.id,
    header: param.name,
    visible: param.visible,
    removable: param.kind === 'user',
    order: param.order,
    category: param.category,
    description: param.description
  }
  emit('parameter-click', { parameter: baseParam })
}

function handleError(err: Error) {
  emit('error', { error: err })
}

// Safe computed properties from state
const parentElements = computed<ElementData[]>(() => {
  if (!state.value) return []
  return state.value.parentElements || []
})

const childElements = computed<ElementData[]>(() => {
  if (!state.value) return []
  return state.value.childElements || []
})

const evaluatedData = computed(() => store.evaluatedData.value || [])

// Initialize on mount
onMounted(async () => {
  try {
    debug.startState(DebugCategories.INITIALIZATION, 'Initializing schedule view')

    // First wait for store to be initialized by parent
    if (!store.initialized.value) {
      debug.log(DebugCategories.INITIALIZATION, 'Waiting for store initialization')
      await new Promise<void>((resolve) => {
        const unwatch = watch(
          () => store.initialized.value,
          (initialized) => {
            if (initialized) {
              unwatch()
              resolve()
            }
          },
          { immediate: true }
        )
      })
    }

    // Initialize data - this will handle BIM elements and parameter processing
    debug.startState(DebugCategories.PARAMETERS, 'Processing parameters')
    await initializeData()

    // Log parameter processing state
    const parameterStore = useParameterStore()
    const parameterState = {
      raw: {
        parent: parameterStore.parentRawParameters.value?.length || 0,
        child: parameterStore.childRawParameters.value?.length || 0,
        parentGroups: Array.from(
          new Set(
            parameterStore.parentRawParameters.value?.map((p) => p.sourceGroup) || []
          )
        ),
        childGroups: Array.from(
          new Set(
            parameterStore.childRawParameters.value?.map((p) => p.sourceGroup) || []
          )
        )
      },
      available: {
        parent: {
          bim: parameterStore.parentAvailableBimParameters.value?.length || 0,
          user: parameterStore.parentAvailableUserParameters.value?.length || 0
        },
        child: {
          bim: parameterStore.childAvailableBimParameters.value?.length || 0,
          user: parameterStore.childAvailableUserParameters.value?.length || 0
        }
      },
      selected: {
        parent: parameterStore.parentSelectedParameters.value?.length || 0,
        child: parameterStore.childSelectedParameters.value?.length || 0
      }
    }

    debug.log(DebugCategories.PARAMETERS, 'Parameters processed', parameterState)

    // Initialize table with processed parameters
    await initializeTable()
    debug.log(DebugCategories.INITIALIZATION, 'Table initialized')

    // Wait for Vue to update the DOM
    await new Promise((resolve) => requestAnimationFrame(resolve))

    debug.completeState(DebugCategories.INITIALIZATION, 'Schedule view initialized')
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    debug.error(DebugCategories.ERROR, 'Failed to initialize schedule view:', error)
    events.handleError({ error })
  }
})

defineExpose({
  handleError,
  handleParameterVisibilityChange,
  handleColumnVisibilityChange
})
</script>

<style scoped>
.viewer-container {
  width: 100%;
  height: 100%;
  min-height: 400px;
}

.schedule-table-container {
  display: block;
}
</style>
