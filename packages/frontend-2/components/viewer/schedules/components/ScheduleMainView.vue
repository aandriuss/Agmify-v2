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
          <template v-if="hasParameters">
            <BaseDataTable
              :table-id="selectedTableId"
              :table-name="tableName"
              :data="tableData as ViewerTableRow[]"
              :columns="tableStore.currentTable.value?.parentColumns || []"
              :detail-columns="tableStore.currentTable.value?.childColumns || []"
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
          </template>
          <template v-else>
            <div class="p-4 text-center text-gray-500">
              <div class="flex flex-col items-center gap-2">
                <span>Loading parameters...</span>
              </div>
            </div>
          </template>

          <DebugPanel
            v-if="isTestMode"
            :schedule-data="scheduleData"
            :evaluated-data="evaluatedData"
            :table-data="tableData"
            :parent-elements="parentElements"
            :child-elements="childElements"
            :parent-columns="tableStore.currentTable.value?.parentColumns || []"
            :child-columns="tableStore.currentTable.value?.childColumns || []"
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
  ElementData,
  ViewerTableRow,
  WorldTreeRoot,
  ViewerNode
} from '~/composables/core/types'
import { useInjectedViewerState } from '~~/lib/viewer/composables/setup'
import type { TableSettings } from '~/composables/core/tables/store/types'
import type { TableColumn } from '~/composables/core/types/tables/table-column'
import type { ScheduleEmits } from '~/composables/core/types/tables/table-events'
import { useParameters } from '~/composables/core/parameters/useParameters'
import type {
  SelectedParameter,
  AvailableParameter
} from '~/composables/core/types/parameters/parameter-states'
import {
  createSelectedParameter,
  createAvailableBimParameter,
  isRawParameter,
  isSelectedParameter
} from '~/composables/core/types/parameters/parameter-states'
import BaseDataTable from '~/components/core/tables/BaseDataTable.vue'
import ParameterManager from '~/components/core/parameters/next/ParameterManager.vue'
import LoadingState from '~/components/core/LoadingState.vue'
import TableLayout from '~/components/core/tables/TableLayout.vue'
import DebugPanel from '~/components/core/debug/DebugPanel.vue'
import { useDebug, DebugCategories } from '~/composables/core/utils/debug'
import { useTableStore } from '~/composables/core/tables/store/store'
import { useSelectedElementsData } from '~/composables/core/tables/state/useSelectedElementsData'
import { useScheduleEvents } from '~/composables/core/tables/events/useScheduleEvents'
import { useTableFlow } from '~/composables/core/tables/state/useTableFlow'
import { useStore } from '~/composables/core/store'
import { useBIMElements } from '~/composables/core/tables/state/useBIMElements'
import { useParameterStore } from '~/composables/core/parameters/store'
import { useTableParameters } from '~/composables/core/tables/useTableParameters'
import { defaultSelectedParameters } from '~/composables/core/tables/config/defaults'

const debug = useDebug()
const store = useStore()
// Get viewer state with type safety
const viewerState = useInjectedViewerState()
const worldTree = computed(() => viewerState.viewer.metadata.worldTree)

// Initialize stores
const parameterStore = useParameterStore()
const tableStore = useTableStore()
const tableParameters = useTableParameters()

// Create reactive categories
const selectedChildCategories = computed(
  () => store.selectedChildCategories.value || []
)

// Initialize BIM elements with reactive categories
const {
  allElements: bimElements,
  isLoading: isLoadingBim,
  hasError: hasBimError,
  initializeElements
} = useBIMElements({
  childCategories: unref(selectedChildCategories)
})

// Watch for category changes to update BIM elements
watch(selectedChildCategories, async (newCategories) => {
  debug.log(DebugCategories.DATA, 'Child categories updated', {
    categories: newCategories
  })
  if (bimElements.value?.length) {
    // Get current world tree
    const currentTree = worldTree.value
    if (isValidWorldTree(currentTree)) {
      // Update categories and process elements
      await initializeElements(currentTree)
      await processElements()

      // Log debug state
      debug.log(DebugCategories.DATA, 'Categories updated', {
        tree: {
          valid: true,
          childCount: currentTree._root.children.length
        },
        parameters: {
          raw: {
            parent: parameterStore.parentRawParameters.value?.length || 0,
            child: parameterStore.childRawParameters.value?.length || 0
          },
          available: {
            parent: parameterStore.parentAvailableBimParameters.value?.length || 0,
            child: parameterStore.childAvailableBimParameters.value?.length || 0
          }
        },
        elements: {
          total: bimElements.value?.length || 0,
          parent: parentElements.value?.length || 0,
          child: childElements.value?.length || 0
        }
      })
    } else {
      debug.warn(DebugCategories.DATA, 'Invalid world tree for category update')
    }
  }
})

// Watch for world tree changes
watch(worldTree, async (newTree) => {
  if (isValidWorldTree(newTree)) {
    debug.log(DebugCategories.DATA, 'World tree updated, reinitializing elements')
    await initializeElements(newTree)
    await processElements()
    debug.log(DebugCategories.DATA, 'Elements and parameters reinitialized')
  }
})

// Watch for category changes
watch(
  [
    () => store.selectedParentCategories.value,
    () => store.selectedChildCategories.value
  ],
  async ([parentCategories, childCategories]) => {
    debug.log(DebugCategories.PARAMETERS, 'Categories changed', {
      parent: parentCategories,
      child: childCategories
    })

    try {
      // Process elements with new categories
      await processElements()

      // Get parameter store
      const parameterStore = useParameterStore()

      // Log debug information with store data
      debug.log(DebugCategories.DATA, 'BIM Data', {
        elementCounts: {
          raw: bimElements.value?.length || 0,
          parent: parentElements.value?.length || 0,
          child: childElements.value?.length || 0
        },
        categories: {
          parent: parentCategories,
          child: childCategories
        },
        parameters: {
          raw: {
            parent: parameterStore.parentRawParameters.value?.length || 0,
            child: parameterStore.childRawParameters.value?.length || 0
          },
          available: {
            parent: parameterStore.parentAvailableBimParameters.value?.length || 0,
            child: parameterStore.childAvailableBimParameters.value?.length || 0
          },
          selected: {
            parent: parameterStore.parentSelectedParameters.value?.length || 0,
            child: parameterStore.childSelectedParameters.value?.length || 0
          }
        },
        table: {
          columns: {
            parent: tableStore.currentTable.value?.parentColumns?.length || 0,
            child: tableStore.currentTable.value?.childColumns?.length || 0
          }
        }
      })
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to process elements:', err)
      handleError(err)
    }
  }
)

// Type guard for world tree
function isValidWorldTree(tree: unknown): tree is WorldTreeRoot {
  if (!tree || typeof tree !== 'object') return false
  const candidate = tree as { _root?: { children?: ViewerNode[] } }
  return !!(
    candidate._root?.children &&
    Array.isArray(candidate._root.children) &&
    candidate._root.children.every(
      (node) => node && typeof node === 'object' && 'id' in node && 'model' in node
    )
  )
}

// Define props
const props = defineProps({
  selectedTableId: {
    type: String,
    required: true
  },
  currentTable: {
    type: Object as PropType<TableSettings | null>,
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

// Define emit types with generic row type
const emit = defineEmits<ScheduleEmits<ElementData>>()

// Initialize selected elements processing
const {
  scheduleData,
  tableData,
  processElements,
  isLoading: isLoadingSelected,
  state
} = useSelectedElementsData({
  elements: computed(() => bimElements.value || []),
  selectedParentCategories: computed(() => store.selectedParentCategories.value),
  selectedChildCategories: computed(() => store.selectedChildCategories.value)
})

// Combined loading state
const isLoading = computed(() => isLoadingBim.value || isLoadingSelected.value)

// Initialize parameter system with store sync
const parameters = useParameters({
  selectedParentCategories: computed(() => store.selectedParentCategories.value),
  selectedChildCategories: computed(() => store.selectedChildCategories.value)
})

// Initialize table flow with parameter sync
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
      selectedParentCategories: store.selectedParentCategories.value || [],
      selectedChildCategories: store.selectedChildCategories.value || []
    },
    selectedParameters: defaultSelectedParameters,
    lastUpdateTimestamp: Date.now()
  }
})

// Watch for raw parameter changes
watch(
  [
    () => parameters.parentParameters.raw.value,
    () => parameters.childParameters.raw.value
  ],
  ([parentRawParams, childRawParams]) => {
    if (parentRawParams?.length || childRawParams?.length) {
      debug.log(DebugCategories.PARAMETERS, 'Raw parameters received', {
        parent: parentRawParams?.length || 0,
        child: childRawParams?.length || 0
      })

      // Update raw parameters
      parameterStore.setRawParameters(parentRawParams || [], true)
      parameterStore.setRawParameters(childRawParams || [], false)

      // Process and update available parameters
      const parentAvailable =
        parentRawParams
          ?.filter(isRawParameter)
          .map((param) =>
            createAvailableBimParameter(param, 'string', String(param.value))
          ) || []
      const childAvailable =
        childRawParams
          ?.filter(isRawParameter)
          .map((param) =>
            createAvailableBimParameter(param, 'string', String(param.value))
          ) || []

      // Update available parameters
      parameterStore.setAvailableBimParameters(parentAvailable, true)
      parameterStore.setAvailableUserParameters([], true)
      parameterStore.setAvailableBimParameters(childAvailable, false)
      parameterStore.setAvailableUserParameters([], false)
    }
  }
)

// Watch for table changes
watch(tableStore.currentTable, async (newTable) => {
  if (newTable?.selectedParameters) {
    debug.log(DebugCategories.PARAMETERS, 'Table parameters received', {
      parent: newTable.parentColumns.length,
      child: newTable.childColumns.length
    })

    // Convert table parameters to selected parameters and filter by kind
    const selectedParams = Array.isArray(newTable.selectedParameters)
      ? newTable.selectedParameters.filter(isSelectedParameter)
      : []

    // Split parameters by kind and update store
    await Promise.all([
      // Update parent parameters (BIM)
      parameterStore.updateSelectedParameters(
        selectedParams.filter((p): p is SelectedParameter => p.kind === 'bim'),
        true
      ),
      // Update child parameters (User)
      parameterStore.updateSelectedParameters(
        selectedParams.filter((p): p is SelectedParameter => p.kind === 'user'),
        false
      )
    ])
  }
})

// Initialize events
const events = useScheduleEvents({
  onError: (error) => emit('error', { error }),
  onRetry: () => emit('retry', { timestamp: Date.now() })
})

// Computed states
const hasParameters = computed(() => {
  const parentParams = tableStore.currentTable.value?.parentColumns?.length ?? 0
  const childParams = tableStore.currentTable.value?.childColumns?.length ?? 0
  return parentParams > 0 || childParams > 0
})

const isComponentLoading = computed(() => {
  return (
    isLoading.value ||
    parameters.isProcessing.value ||
    !isInitialized.value ||
    isLoadingBim.value ||
    !hasParameters.value
  )
})

// Error state
const error = computed(() => {
  if (tableError.value) return tableError.value
  if (state.value?.error) return state.value.error
  if (hasBimError.value) {
    debug.error(DebugCategories.ERROR, 'BIM elements error')
    return new Error('Failed to load BIM elements')
  }
  if (parameters.hasError.value) {
    debug.error(DebugCategories.ERROR, 'Parameters error')
    return new Error('Failed to process parameters')
  }
  return null
})

// Error state for LoadingState component
const errorState = computed(() => {
  const currentError = error.value
  if (!currentError) return null
  return {
    message: currentError.message,
    name: currentError.name,
    stack: currentError.stack
  }
})

// Event handlers
function handleParameterVisibilityChange(param: SelectedParameter) {
  parameters.updateParameterVisibility(param.id, param.visible, param.kind === 'bim')
  emit('parameter-visibility-change', { parameter: param })
}

function handleColumnVisibilityChange(event: {
  column: TableColumn
  visible: boolean
}) {
  if (event.column.parameter) {
    parameters.updateParameterVisibility(
      event.column.parameter.id,
      event.visible,
      event.column.parameter.kind === 'bim'
    )
    emit('column-visibility-change', event)
  } else {
    debug.warn(
      DebugCategories.PARAMETERS,
      'Failed to update column visibility - missing field',
      { column: event.column }
    )
  }
}

function handleParameterSelect(param: AvailableParameter, isParent: boolean) {
  try {
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
  } catch (err) {
    handleError(err)
  }
}

function handleParameterDeselect(param: AvailableParameter, isParent: boolean) {
  try {
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
  } catch (err) {
    handleError(err)
  }
}

function handleColumnReorder(event: { dragIndex: number; dropIndex: number }) {
  try {
    const currentTable = tableStore.currentTable.value
    if (!currentTable) {
      debug.warn(DebugCategories.PARAMETERS, 'No current table found')
      return
    }

    // Get parent columns (default)
    const parentColumns = [...(currentTable.parentColumns || [])]
    const childColumns = [...(currentTable.childColumns || [])]

    // Move column in parent array
    const [movedParentColumn] = parentColumns.splice(event.dragIndex, 1)
    parentColumns.splice(event.dropIndex, 0, movedParentColumn)

    // Move column in child array
    const [movedChildColumn] = childColumns.splice(event.dragIndex, 1)
    childColumns.splice(event.dropIndex, 0, movedChildColumn)

    // Update columns in table store
    tableStore.updateColumns(parentColumns, childColumns)

    // Also update parameter order to keep in sync
    if (movedParentColumn?.parameter) {
      parameters.updateParameterOrder(
        movedParentColumn.parameter.id,
        event.dropIndex,
        true
      )
    }
    if (movedChildColumn?.parameter) {
      parameters.updateParameterOrder(
        movedChildColumn.parameter.id,
        event.dropIndex,
        false
      )
    }

    emit('column-reorder', event)
  } catch (err) {
    handleError(err)
  }
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

interface AppError extends Error {
  code?: string
  details?: unknown
}

function isAppError(error: unknown): error is AppError {
  return error instanceof Error
}

function createAppError(err: unknown): AppError {
  if (isAppError(err)) return err
  return new Error(typeof err === 'string' ? err : 'Unknown error')
}

function handleError(err: unknown): void {
  const error = createAppError(err)
  debug.error(DebugCategories.ERROR, 'Error in schedule view:', error)
  emit('error', { error })
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
    const parameterStore = useParameterStore()

    debug.startState(DebugCategories.INITIALIZATION, 'Initializing schedule view')

    // First wait for store and world tree to be initialized
    debug.log(DebugCategories.INITIALIZATION, 'Waiting for initialization')
    await Promise.all([
      // Wait for store initialization
      new Promise<void>((resolve) => {
        if (store.initialized.value) {
          resolve()
          return
        }
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
      }),
      // Wait for BIM elements and element data to be ready
      new Promise<void>((resolve) => {
        if (bimElements.value?.length > 0 && state.value?.parentElements?.length > 0) {
          resolve()
          return
        }
        const unwatch = watch(
          [() => bimElements.value, () => state.value?.parentElements],
          ([elements, parentElements]) => {
            if (
              elements?.length > 0 &&
              Array.isArray(parentElements) &&
              parentElements.length > 0
            ) {
              unwatch()
              resolve()
            }
          },
          { immediate: true }
        )
      })
    ])

    debug.log(DebugCategories.INITIALIZATION, 'Core systems initialized')

    try {
      // Initialize parameter store and wait for processing
      debug.startState(DebugCategories.PARAMETERS, 'Initializing parameter store')
      await parameterStore.init()

      // Wait for parameter store to finish processing
      await new Promise<void>((resolve) => {
        const unwatch = watch(
          () => parameterStore.isProcessing.value,
          (isProcessing) => {
            if (!isProcessing) {
              unwatch()
              resolve()
            }
          },
          { immediate: true }
        )
      })

      debug.log(DebugCategories.PARAMETERS, 'Parameter store state after init', {
        raw: {
          parent: parameterStore.parentRawParameters.value?.length || 0,
          child: parameterStore.childRawParameters.value?.length || 0
        },
        available: {
          parent: parameterStore.parentAvailableBimParameters.value?.length || 0,
          child: parameterStore.childAvailableBimParameters.value?.length || 0
        }
      })

      // Initialize table
      debug.startState(DebugCategories.INITIALIZATION, 'Initializing table')
      await initializeTable()

      // Wait for table to be fully initialized
      if (!props.currentTable) {
        debug.log(DebugCategories.INITIALIZATION, 'Waiting for table data')
        await new Promise<void>((resolve) => {
          const unwatch = watch(
            () => props.currentTable,
            (table) => {
              if (table) {
                unwatch()
                resolve()
              }
            },
            { immediate: true }
          )
        })
      }

      debug.log(DebugCategories.INITIALIZATION, 'Table initialized', {
        tableId: props.selectedTableId,
        settings: props.currentTable
      })

      // Initialize table parameters
      debug.startState(DebugCategories.PARAMETERS, 'Initializing table parameters')
      await tableParameters.initializeTableParameters()

      // Process data with parameters
      debug.startState(DebugCategories.PARAMETERS, 'Processing data')
      await processElements()
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to initialize component:', err)
      throw err
    }

    // Log parameter state after initialization
    debug.log(DebugCategories.PARAMETERS, 'Parameter state after initialization', {
      parentSelected: parameterStore.parentSelectedParameters.value.length,
      childSelected: parameterStore.childSelectedParameters.value.length
    })

    // Verify parameters were initialized
    if (
      !parameterStore.parentSelectedParameters.value.length &&
      !parameterStore.childSelectedParameters.value.length
    ) {
      debug.warn(
        DebugCategories.PARAMETERS,
        'No parameters selected after initialization',
        {
          tableId: props.selectedTableId,
          settings: props.currentTable
        }
      )

      // Use default parameters
      debug.log(DebugCategories.PARAMETERS, 'Using default parameters')
      tableStore.updateSelectedParameters(defaultSelectedParameters)
    }

    // Log final parameter state
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

    // Wait for Vue to update the DOM
    await new Promise((resolve) => requestAnimationFrame(resolve))

    debug.completeState(DebugCategories.INITIALIZATION, 'Schedule view initialized')
  } catch (err) {
    handleError(err)
  }
})

// Watch for table changes
watch(
  () => props.selectedTableId,
  async (newTableId) => {
    if (newTableId) {
      try {
        debug.startState(
          DebugCategories.PARAMETERS,
          'Table changed, reinitializing parameters'
        )
        await tableParameters.initializeTableParameters()
        debug.completeState(DebugCategories.PARAMETERS, 'Parameters reinitialized')
      } catch (err) {
        handleError(err)
      }
    }
  }
)

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
