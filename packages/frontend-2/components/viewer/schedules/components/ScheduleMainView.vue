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
              parameterStore.parentAvailableBimParameters.value
            "
            :available-child-parameters="
              parameterStore.childAvailableBimParameters.value
            "
            :selected-parent-parameters="
              tableStore.currentTable.value?.selectedParameters?.parent || []
            "
            :selected-child-parameters="
              tableStore.currentTable.value?.selectedParameters?.child || []
            "
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
            :show-parameter-stats="true"
            :show-bim-data="true"
            :show-parameter-categories="true"
            :show-table-categories="true"
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
  ViewerTableRow
} from '~/composables/core/types/elements/elements-base'
import type { TableSettings } from '~/composables/core/tables/store/types'
import type { TableColumn } from '~/composables/core/types/tables/table-column'
import type { ScheduleEmits } from '~/composables/core/types/tables/table-events'
import { useParameters } from '~/composables/core/parameters/useParameters'
import type {
  SelectedParameter,
  AvailableParameter,
  RawParameter
} from '~/composables/core/types'
import { createSelectedParameter } from '~/composables/core/types'
import { createTableColumns } from '~/composables/core/types/tables/table-column'
import BaseDataTable from '~/components/core/tables/BaseDataTable.vue'
import ParameterManager from '~/components/core/parameters/next/ParameterManager.vue'
import LoadingState from '~/components/core/LoadingState.vue'
import TableLayout from '~/components/core/tables/TableLayout.vue'
import DebugPanel from '~/components/core/debug/DebugPanel.vue'
import { useDebug, DebugCategories } from '~/composables/core/utils/debug'
import { useTableStore } from '~/composables/core/tables/store/store'
import { useElementsData } from '~/composables/core/tables/state/useElementsData'
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
const bimElements = useBIMElements()
const parameterStore = useParameterStore()

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

// Initialize stores and composables
const tableStore = useTableStore()
const tableParameters = useTableParameters()

// Initialize parameter extraction
const { allElements, isLoading: isLoadingElements } = useElementsData({
  selectedParentCategories: computed(() => store.selectedParentCategories.value),
  selectedChildCategories: computed(() => store.selectedChildCategories.value)
})

// Initialize selected elements processing
const {
  scheduleData,
  tableData,
  processElements,
  isLoading: isLoadingSelected,
  state
} = useSelectedElementsData({
  elements: allElements,
  selectedParentCategories: computed(() => store.selectedParentCategories.value),
  selectedChildCategories: computed(() => store.selectedChildCategories.value)
})

// Combined loading state
const isLoading = computed(() => isLoadingElements.value || isLoadingSelected.value)

// Initialize parameter system for UI interactions
const parameters = useParameters({
  selectedParentCategories: computed(() => store.selectedParentCategories.value),
  selectedChildCategories: computed(() => store.selectedChildCategories.value)
})

// Watch for parameter changes
watch(
  [
    () => parameterStore.parentRawParameters.value,
    () => parameterStore.childRawParameters.value
  ],
  async ([newParentParams, newChildParams]) => {
    if (newParentParams?.length || newChildParams?.length) {
      debug.log(DebugCategories.PARAMETERS, 'Parameters updated', {
        parent: newParentParams?.length || 0,
        child: newChildParams?.length || 0
      })
      await tableParameters.initializeTableParameters(true)
    }
  }
)

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
    parentColumns: createTableColumns(defaultSelectedParameters.parent),
    childColumns: createTableColumns(defaultSelectedParameters.child),
    categoryFilters: {
      selectedParentCategories: store.selectedParentCategories.value,
      selectedChildCategories: store.selectedChildCategories.value
    },
    selectedParameters: defaultSelectedParameters,
    lastUpdateTimestamp: Date.now()
  }
})

// Watch for table initialization
watch(isInitialized, async (initialized) => {
  if (initialized) {
    debug.log(DebugCategories.INITIALIZATION, 'Table flow initialized')
    await tableParameters.initializeTableParameters()
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
    bimElements.isLoading.value ||
    !hasParameters.value
  )
})

// Error state
const error = computed(() => {
  if (tableError.value) return tableError.value
  if (state.value?.error) return state.value.error
  if (bimElements.hasError.value) {
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
    const currentTable = tableStore.currentTable.value
    if (!currentTable) {
      debug.warn(DebugCategories.PARAMETERS, 'No current table found')
      return
    }

    // Create selected parameter using utility function
    const selectedParam = createSelectedParameter(
      param,
      isParent
        ? currentTable.selectedParameters.parent.length
        : currentTable.selectedParameters.child.length
    )

    // Get current selected parameters
    const selectedParams = {
      parent: isParent
        ? [...currentTable.selectedParameters.parent, selectedParam]
        : currentTable.selectedParameters.parent,
      child: !isParent
        ? [...currentTable.selectedParameters.child, selectedParam]
        : currentTable.selectedParameters.child
    }

    // Update table store with new selection
    tableStore.updateSelectedParameters(selectedParams)
    emit('parameter-select', { parameter: selectedParam })
  } catch (err) {
    handleError(err)
  }
}

function handleParameterDeselect(param: AvailableParameter, isParent: boolean) {
  try {
    const currentTable = tableStore.currentTable.value
    if (!currentTable) {
      debug.warn(DebugCategories.PARAMETERS, 'No current table found')
      return
    }

    // Remove parameter from selected parameters
    const selectedParams = {
      parent: isParent
        ? currentTable.selectedParameters.parent.filter((p) => p.id !== param.id)
        : currentTable.selectedParameters.parent,
      child: !isParent
        ? currentTable.selectedParameters.child.filter((p) => p.id !== param.id)
        : currentTable.selectedParameters.child
    }

    // Update table store with new selection
    tableStore.updateSelectedParameters(selectedParams)
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
    debug.startState(DebugCategories.INITIALIZATION, 'Initializing schedule view')

    // First wait for store initialization
    debug.log(DebugCategories.INITIALIZATION, 'Waiting for store initialization')
    await new Promise<void>((resolve) => {
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
    })

    // Then wait for BIM elements with timeout
    debug.log(DebugCategories.INITIALIZATION, 'Waiting for BIM elements')
    await Promise.race([
      new Promise<void>((resolve) => {
        if (bimElements.allElements.value?.length) {
          resolve()
          return
        }
        const unwatch = watch(
          () => bimElements.allElements.value,
          (elements) => {
            if (elements?.length) {
              debug.log(DebugCategories.INITIALIZATION, 'BIM elements loaded', {
                count: elements.length,
                sample: elements[0]
                  ? {
                      id: elements[0].id,
                      category: elements[0].category,
                      parameterCount: Object.keys(elements[0].parameters || {}).length
                    }
                  : null
              })
              unwatch()
              resolve()
            }
          },
          { immediate: true }
        )
      }),
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error('BIM elements load timeout')), 10000)
      )
    ])

    debug.log(DebugCategories.INITIALIZATION, 'Core systems initialized', {
      store: {
        initialized: store.initialized.value,
        scheduleData: store.scheduleData.value?.length || 0
      },
      bimElements: {
        count: bimElements.allElements.value?.length || 0,
        loading: bimElements.isLoading.value,
        error: bimElements.hasError.value
      }
    })

    try {
      // Initialize table first to get default parameters
      debug.startState(DebugCategories.INITIALIZATION, 'Initializing table')
      await initializeTable()

      // Then wait for parameter store to be ready and parameters to be processed
      debug.startState(DebugCategories.PARAMETERS, 'Waiting for parameter store')
      await new Promise<void>((resolve) => {
        if (
          parameterStore.state.value.initialized &&
          (parameterStore.parentAvailableBimParameters.value?.length ||
            parameterStore.childAvailableBimParameters.value?.length)
        ) {
          resolve()
          return
        }
        const unwatch = watch(
          [
            () => parameterStore.state.value.initialized,
            () => parameterStore.parentAvailableBimParameters.value,
            () => parameterStore.childAvailableBimParameters.value
          ],
          ([initialized, parentBim, childBim]) => {
            if (initialized && (parentBim?.length || childBim?.length)) {
              debug.log(DebugCategories.PARAMETERS, 'Parameter store ready', {
                parentBim: parentBim?.length || 0,
                childBim: childBim?.length || 0
              })
              unwatch()
              resolve()
            }
          },
          { immediate: true }
        )
      })

      // Verify parameters were processed
      const paramState = {
        raw: {
          parent: parameterStore.parentRawParameters.value?.length || 0,
          child: parameterStore.childRawParameters.value?.length || 0
        },
        available: {
          parentBim: parameterStore.parentAvailableBimParameters.value?.length || 0,
          parentUser: parameterStore.parentAvailableUserParameters.value?.length || 0,
          childBim: parameterStore.childAvailableBimParameters.value?.length || 0,
          childUser: parameterStore.childAvailableUserParameters.value?.length || 0
        }
      }

      debug.log(DebugCategories.PARAMETERS, 'Parameters processed', paramState)

      if (!paramState.raw.parent && !paramState.raw.child) {
        throw new Error('No parameters extracted from BIM elements')
      }

      // Wait for table to be fully initialized with current data
      if (!props.currentTable) {
        debug.log(DebugCategories.INITIALIZATION, 'Waiting for table data')
        await Promise.race([
          new Promise<void>((resolve) => {
            const unwatch = watch(
              () => props.currentTable,
              (table) => {
                if (table) {
                  debug.log(DebugCategories.INITIALIZATION, 'Table data received', {
                    id: table.id,
                    parameters: {
                      parent: table.selectedParameters?.parent?.length || 0,
                      child: table.selectedParameters?.child?.length || 0
                    }
                  })
                  unwatch()
                  resolve()
                }
              },
              { immediate: true }
            )
          }),
          new Promise<void>((_, reject) =>
            setTimeout(() => reject(new Error('Table initialization timeout')), 5000)
          )
        ])
      }

      // Ensure we have parameters before proceeding
      if (
        !parameterStore.parentRawParameters.value?.length &&
        !parameterStore.childRawParameters.value?.length
      ) {
        debug.warn(
          DebugCategories.PARAMETERS,
          'No parameters available after initialization'
        )
        throw new Error('No parameters available')
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
    const currentTable = tableStore.currentTable.value
    if (currentTable) {
      debug.log(DebugCategories.PARAMETERS, 'Parameter state after initialization', {
        parentSelected: currentTable.selectedParameters.parent.length,
        childSelected: currentTable.selectedParameters.child.length
      })

      // Verify parameters were initialized
      if (
        !currentTable.selectedParameters.parent.length &&
        !currentTable.selectedParameters.child.length
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
    }

    // Log final parameter state
    const parameterState = {
      raw: {
        parent: unref(parameterStore.parentRawParameters)?.length || 0,
        child: unref(parameterStore.childRawParameters)?.length || 0,
        parentGroups: Array.from(
          new Set(
            unref(parameterStore.parentRawParameters)?.map(
              (p: RawParameter) => p.sourceGroup
            ) || []
          )
        ),
        childGroups: Array.from(
          new Set(
            unref(parameterStore.childRawParameters)?.map(
              (p: RawParameter) => p.sourceGroup
            ) || []
          )
        )
      },
      available: {
        parent: {
          bim: unref(parameterStore.parentAvailableBimParameters)?.length || 0,
          user: unref(parameterStore.parentAvailableUserParameters)?.length || 0
        },
        child: {
          bim: unref(parameterStore.childAvailableBimParameters)?.length || 0,
          user: unref(parameterStore.childAvailableUserParameters)?.length || 0
        }
      },
      selected: {
        parent: tableStore.currentTable.value?.selectedParameters?.parent?.length || 0,
        child: tableStore.currentTable.value?.selectedParameters?.child?.length || 0
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
