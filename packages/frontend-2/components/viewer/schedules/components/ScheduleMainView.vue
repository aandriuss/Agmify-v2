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
          <BaseDataTable
            :table-id="selectedTableId"
            :table-name="tableName"
            :data="tableData"
            :columns="parentVisibleColumns"
            :detail-columns="childVisibleColumns"
            :loading="isLoading"
            :error="error"
            @row-expand="events.handleRowExpand"
            @row-collapse="events.handleRowCollapse"
            @column-visibility-change="events.handleColumnVisibilityChange"
            @column-reorder="events.handleColumnReorder"
            @column-resize="events.handleColumnResize"
            @error="events.handleError"
            @retry="() => events.handleRetry({ timestamp: Date.now() })"
          />

          <ParameterManager
            v-if="showParameterManager"
            :parameter-groups="parameterGroups"
            :available-categories="availableCategoriesArray"
            :selected-categories="selectedCategories"
            :can-create-parameters="true"
            :selected-parameters="selectedParameters"
            :is-loading="isLoadingAdditionalData"
            @update:selected-categories="handleCategoryUpdate"
            @parameter-click="(parameter: TableParameter) => events.handleParameterClick({ parameter })"
            @create-parameter="
              () => events.handleCreateParameter({ timestamp: Date.now() })
            "
            @edit-parameters="
              () => events.handleEditParameters({ timestamp: Date.now() })
            "
            @error="(error: Error) => events.handleError({ error })"
            @retry="() => events.handleRetry({ timestamp: Date.now() })"
          />

          <DebugPanel
            v-if="isTestMode"
            :schedule-data="scheduleData"
            :evaluated-data="evaluatedData"
            :table-data="tableData"
            :parent-elements="parentElements"
            :child-elements="childElements"
            :parent-columns="parentVisibleColumns"
            :child-columns="childVisibleColumns"
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
  TableParameter,
  TableEmits,
  ScheduleEmits,
  ElementData
} from '~/composables/core/types'

import BaseDataTable from '~/components/core/tables/BaseDataTable.vue'
import ParameterManager from '~/components/core/parameters/ParameterManager.vue'
import LoadingState from '~/components/core/LoadingState.vue'
import TableLayout from '~/components/core/tables/TableLayout.vue'
import DebugPanel from '~/components/core/debug/DebugPanel.vue'
import TestDataTable from './test/TestDataTable.vue'
import { useDebug, DebugCategories } from '~/composables/core/utils/debug'
import { useElementsData } from '~/composables/core/tables/state/useElementsData'
import { useScheduleEvents } from '~/composables/core/tables/events/useScheduleEvents'
import { useTableFlow } from '~/composables/core/tables/state/useTableFlow'
import { useStore } from '~/composables/core/store'
import { useParametersState } from '~/composables/parameters/useParametersState'
import { useBIMElements } from '~/composables/core/tables/state/useBIMElements'

const debug = useDebug()
const store = useStore()
const parametersState = useParametersState()
const bimElements = useBIMElements()

// Define props first
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
  parameterGroups: {
    type: Object as PropType<Map<string, TableParameter[]>>,
    default: () => new Map()
  },
  selectedParameters: {
    type: Array as PropType<TableParameter[]>,
    default: () => []
  },
  selectedCategories: {
    type: Array as PropType<string[]>,
    default: () => []
  },
  isLoadingAdditionalData: {
    type: Boolean,
    default: false
  }
})

// Define emits with proper type
const emit = defineEmits<TableEmits<TableParameter> & ScheduleEmits<TableParameter>>()

// Initialize core functionality with refs for categories
const selectedParentCategoriesRef = computed(() => store.selectedParentCategories.value)
const selectedChildCategoriesRef = computed(() => store.selectedChildCategories.value)

const {
  scheduleData,
  tableData,
  availableCategories,
  updateCategories,
  initializeData,
  isLoading,
  state
} = useElementsData({
  selectedParentCategories: selectedParentCategoriesRef,
  selectedChildCategories: selectedChildCategoriesRef
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

// Computed loading state
const isComponentLoading = computed(() => {
  return (
    isLoading.value ||
    parametersState.loading ||
    !isInitialized.value ||
    bimElements.isLoading.value
  )
})

// Initialize events
const events = useScheduleEvents<TableParameter>({
  onError: (error) => emit('error', { error }),
  onRetry: () => emit('retry', { timestamp: Date.now() })
})

// Convert Set to Array for template
const availableCategoriesArray = computed(() => {
  return [...availableCategories.parent, ...availableCategories.child]
})

interface ErrorWithDetails extends Error {
  details?: string
}

// Convert regular Error to ErrorWithDetails
function toErrorWithDetails(error: Error | null): ErrorWithDetails | null {
  if (!error) return null
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    details: error instanceof Error ? error.stack : undefined
  }
}

function handleCategoryUpdate(categories: string[]): void {
  emit('update:selected-categories', { categories })
}

// Initialize on mount with correct sequence
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

    // Then initialize table to get configuration (categories & parameters)
    await initializeTable()
    debug.log(DebugCategories.INITIALIZATION, 'Table initialized')

    // Then initialize BIM elements to extract parameters
    await bimElements.initializeElements()
    debug.log(DebugCategories.INITIALIZATION, 'BIM elements initialized')

    // Then initialize data to get BIM elements for categories
    await initializeData()
    debug.log(DebugCategories.INITIALIZATION, 'Initial data loaded')

    // Finally load parameters to show in parameter manager
    await parametersState.loadParameters()
    debug.log(DebugCategories.INITIALIZATION, 'Parameters loaded')

    debug.completeState(DebugCategories.INITIALIZATION, 'Schedule view initialized')
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    debug.error(DebugCategories.ERROR, 'Failed to initialize schedule view:', error)
    events.handleError({ error })
  }
})

// Watch for category changes with proper error handling
watch(
  [selectedParentCategoriesRef, selectedChildCategoriesRef],
  async ([newParentCats, newChildCats]) => {
    if (!isInitialized.value) {
      debug.warn(DebugCategories.STATE, 'Waiting for initialization')
      return
    }

    try {
      // First update BIM elements with new categories
      await bimElements.initializeElements()
      debug.log(DebugCategories.INITIALIZATION, 'BIM elements updated')

      // Then update data with filtered elements and parameters
      await updateCategories(newParentCats, newChildCats)
      debug.log(DebugCategories.INITIALIZATION, 'Categories updated')
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      events.handleError({ error })
    }
  },
  { immediate: false } // Don't run immediately since we handle initialization in onMounted
)

// Computed properties from state
const parentVisibleColumns = computed(() => store.parentVisibleColumns.value || [])
const childVisibleColumns = computed(() => store.childVisibleColumns.value || [])

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

// Base error state
const error = computed(() => {
  return tableError.value || state.value?.error || bimElements.hasError.value || null
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

defineExpose({
  handleCategoryUpdate
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
