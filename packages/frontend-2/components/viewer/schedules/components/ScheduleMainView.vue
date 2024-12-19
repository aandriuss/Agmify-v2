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
        <TestDataTable v-if="isTestMode" />

        <template v-else>
          <!-- Parameter Manager -->
          <ParameterManager
            v-if="showParameterManager"
            :selected-parent-categories="store.selectedParentCategories.value"
            :selected-child-categories="store.selectedChildCategories.value"
            :can-create-parameters="true"
            @parameter-visibility-change="handleParameterVisibilityChange"
            @parameter-edit="handleParameterEdit"
            @parameter-create="handleParameterCreate"
            @error="handleError"
          />

          <!-- Data Table -->
          <BaseDataTable
            :table-id="selectedTableId"
            :table-name="tableName"
            :data="tableData"
            :columns="parameterStore.parentColumnDefinitions.value"
            :detail-columns="parameterStore.childColumnDefinitions.value"
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
            :parent-columns="parameterStore.parentColumnDefinitions.value"
            :child-columns="parameterStore.childColumnDefinitions.value"
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
import { useParameterStore } from '~/composables/core/parameters/store'
import type { SelectedParameter } from '@/composables/core/parameters/store/types'
import BaseDataTable from '~/components/core/tables/BaseDataTable.vue'
import ParameterManager from '~/components/core/parameters/next/ParameterManager.vue'
import LoadingState from '~/components/core/LoadingState.vue'
import TableLayout from '~/components/core/tables/TableLayout.vue'
import DebugPanel from '~/components/core/debug/DebugPanel.vue'
import TestDataTable from './test/TestDataTable.vue'
import { useDebug, DebugCategories } from '~/composables/core/utils/debug'
import { useElementsData } from '~/composables/core/tables/state/useElementsData'
import { useScheduleEvents } from '~/composables/core/tables/events/useScheduleEvents'
import { useTableFlow } from '~/composables/core/tables/state/useTableFlow'
import { useStore } from '~/composables/core/store'
import { useBIMElements } from '~/composables/core/tables/state/useBIMElements'

const debug = useDebug()
const store = useStore()
const parameterStore = useParameterStore()
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

// Define emits
const emit = defineEmits<TableEmits & ScheduleEmits>()

// Initialize core functionality first
const { scheduleData, tableData, initializeData, isLoading, state } = useElementsData({
  selectedParentCategories: computed(() => store.selectedParentCategories.value),
  selectedChildCategories: computed(() => store.selectedChildCategories.value)
})

// Initialize parameter system for UI interactions only
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
    bimElements.isLoading.value ||
    parameterStore.state.value.isProcessing
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
    parameterStore.state.value.error ||
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
  parameterStore.updateParameterVisibility(
    param.id,
    param.visible,
    param.kind === 'bim'
  )
  emit('parameter-visibility-change', { parameter: param })
}

function handleColumnVisibilityChange(event: { column: ColumnDef; visible: boolean }) {
  parameterStore.updateParameterVisibility(
    event.column.field,
    event.visible,
    event.column.kind === 'bim'
  )
  emit('column-visibility-change', event)
}

function handleColumnReorder(event: { dragIndex: number; dropIndex: number }) {
  // Determine if we're reordering parent or child columns based on current context
  const isParent = true // Parent columns are the default
  parameterStore.reorderParameters(event.dragIndex, event.dropIndex, isParent)
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

    // Initialize table to get configuration
    await initializeTable()
    debug.log(DebugCategories.INITIALIZATION, 'Table initialized')

    // Initialize BIM elements
    await bimElements.initializeElements()
    debug.log(DebugCategories.INITIALIZATION, 'BIM elements initialized')

    // Initialize data (this will also process parameters)
    await initializeData()
    debug.log(DebugCategories.INITIALIZATION, 'Initial data loaded')

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
