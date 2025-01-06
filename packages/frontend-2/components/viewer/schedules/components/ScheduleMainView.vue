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
      :loading-message="loadingMessage"
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
          <template>
            <div v-if="debug.isEnabled.value" class="mb-2 p-2 bg-gray-100">
              <pre class="text-xs">{{
                {
                  tableId: selectedTableId,
                  tableName,
                  dataLength: unref(tableData)?.length || 0,
                  columnsLength: tableColumns?.length || 0,
                  detailColumnsLength: detailColumns?.length || 0,
                  isTableReady,
                  error: error?.message
                }
              }}</pre>
            </div>
            <BaseDataTable
              :table-id="selectedTableId"
              :table-name="tableName"
              :data="unref(tableData)"
              :columns="tableColumns"
              :detail-columns="detailColumns"
              :loading="!isTableReady"
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

          <!-- Debug Panel -->
          <DebugPanel
            v-if="debug.isEnabled.value"
            :schedule-data="store.scheduleData.value"
            :evaluated-data="store.evaluatedData.value"
            :table-data="store.tableData.value"
            :parent-elements="unref(parentElements)"
            :child-elements="unref(childElements)"
            :parent-columns="tableStore.currentTable.value?.parentColumns || []"
            :child-columns="tableStore.currentTable.value?.childColumns || []"
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
import type { ElementData } from '~/composables/core/types/elements/elements-base'
import { toViewerTableRow } from '~/composables/core/types/elements/elements-base'
import type { TableSettings } from '~/composables/core/tables/store/types'
import type { TableColumn } from '~/composables/core/types/tables/table-column'
import type { ScheduleEmits } from '~/composables/core/types/tables/table-events'
import { useParameters } from '~/composables/core/parameters/useParameters'
import type {
  SelectedParameter,
  AvailableParameter,
  ViewerTableRow
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

// Define emit types with generic row type
const emit = defineEmits<ScheduleEmits<ElementData>>()

// Initialize stores and composables
const tableStore = useTableStore()
const tableParameters = useTableParameters()

// Define props for data passed from parent
const props = withDefaults(
  defineProps<{
    selectedTableId: string
    currentTable: TableSettings | null
    tableName: string
    showParameterManager: boolean
    isLoadingAdditionalData: boolean
  }>(),
  {}
)

// Computed properties for table data
const tableColumns = computed(() => tableStore.currentTable.value?.parentColumns || [])
const detailColumns = computed(() => tableStore.currentTable.value?.childColumns || [])

// Cache for transformed data
const transformedData = ref<ViewerTableRow[]>([])

// Transform elements to table rows
function transformElements(
  elements: ElementData[],
  columns: TableColumn[]
): ViewerTableRow[] {
  debug.log(DebugCategories.DATA_TRANSFORM, 'Starting data transformation', {
    elementCount: elements.length,
    sampleElement: elements[0],
    columns: columns.map((c) => ({ id: c.id, field: c.field }))
  })

  const rows = elements
    .map((element) => {
      // Skip invalid elements
      if (!element?.id) {
        debug.warn(DebugCategories.DATA_TRANSFORM, 'Invalid element', { element })
        return null
      }

      // Ensure base properties exist
      const baseElement: ElementData = {
        ...element,
        id: element.id,
        name: element.name || element.mark || element.id,
        type: element.type || 'Unknown',
        category: element.category || 'Uncategorized',
        parameters: element.parameters || {},
        field: element.field || element.id,
        header: element.header || element.name || '',
        visible: element.visible ?? true,
        order: element.order ?? 0,
        removable: element.removable ?? true
      }

      return toViewerTableRow(baseElement)
    })
    .filter((row): row is ViewerTableRow => row !== null)

  debug.log(DebugCategories.DATA_TRANSFORM, 'Data transformation complete', {
    inputCount: elements.length,
    outputCount: rows.length,
    sampleRow: rows[0]
  })

  return rows
}

// Watch for data or column changes
watch(
  [() => store.evaluatedData.value, tableColumns],
  ([newData, columns]) => {
    if (!newData?.length) {
      debug.log(DebugCategories.DATA_TRANSFORM, 'No data to transform')
      transformedData.value = []
      return
    }

    transformedData.value = transformElements(newData, columns)
  },
  { immediate: true }
)

// Computed property for table data
const tableData = computed(() => transformedData.value)

// Table readiness state
const isTableReady = computed(() => {
  if (!tableData.value || !tableColumns.value || !detailColumns.value) return false
  return (
    tableData.value.length > 0 &&
    (tableColumns.value.length > 0 || detailColumns.value.length > 0)
  )
})

// Setup watchers after initialization
onMounted(() => {
  // Watch column changes for logging
  watch(
    [tableColumns, detailColumns],
    ([parent, child], _) => {
      // Skip if not initialized
      if (!parent || !child) return

      // Only log if columns actually changed
      debug.log(DebugCategories.COLUMNS, 'Column configuration:', {
        parent: {
          count: parent.length,
          columns: parent.map((c) => ({ id: c.id, field: c.field, visible: c.visible }))
        },
        child: {
          count: child.length,
          columns: child.map((c) => ({ id: c.id, field: c.field, visible: c.visible }))
        }
      })
    },
    { deep: true }
  )

  // Watch table readiness for logging
  watch(
    [() => tableData.value?.length, tableColumns, detailColumns],
    ([dataCount, parent, child], _) => {
      // Skip if not initialized
      if (!parent || !child) return

      debug.log(DebugCategories.STATE, 'Table readiness:', {
        hasData: (dataCount || 0) > 0,
        hasColumns: parent.length > 0 || child.length > 0,
        dataCount: dataCount || 0,
        columnCounts: {
          parent: parent.length,
          child: child.length
        }
      })
    }
  )
})

// Initialize parameter system for UI interactions
const parameters = useParameters({
  selectedParentCategories: computed(() => store.selectedParentCategories.value),
  selectedChildCategories: computed(() => store.selectedChildCategories.value)
})

// Initialize table flow
const { initialize: initializeTable, error: tableError } = useTableFlow({
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

// Initialize events
const events = useScheduleEvents({
  onError: (error) => emit('error', { error }),
  onRetry: () => emit('retry', { timestamp: Date.now() })
})

// Loading message based on current state
const loadingMessage = computed(() => {
  // Check store initialization
  const isStoreInitialized = store.initialized.value
  const isParameterStoreInitialized = parameterStore.state.value.initialized
  const isTableInitialized = tableStore.currentTable.value !== null

  // Check data presence
  const hasScheduleData = store.scheduleData.value?.length > 0
  const hasParameters =
    parameterStore.parentRawParameters.value?.length > 0 ||
    parameterStore.childRawParameters.value?.length > 0
  const hasTableData = store.tableData.value?.length > 0

  // Check processing states
  const isProcessing = parameterStore.state.value.processing.status === 'processing'
  const isTableLoading = props.isLoadingAdditionalData

  // Return appropriate message based on state
  if (!isStoreInitialized) return 'Initializing core store...'
  if (!isParameterStoreInitialized) return 'Initializing parameter store...'
  if (!isTableInitialized) return 'Initializing table...'
  if (isProcessing) return 'Processing parameters...'
  if (isTableLoading) return 'Loading additional data...'
  if (!hasScheduleData) return 'Loading BIM elements...'
  if (!hasParameters) return 'Loading parameters...'
  if (!hasTableData) return 'Preparing table data...'

  return 'Loading...'
})

// Loading state based on minimum required conditions
const isComponentLoading = computed(() => {
  // Only check essential conditions for table display
  const hasTable = tableStore.currentTable.value !== null
  const hasData = tableData.value?.length > 0
  const hasColumns = tableColumns.value.length > 0 || detailColumns.value.length > 0
  const isProcessing = parameterStore.state.value.processing.status === 'processing'

  // Debug state for troubleshooting
  debug.log(DebugCategories.STATE, 'Component loading state:', {
    hasTable,
    hasData,
    hasColumns,
    isProcessing,
    tableData: {
      length: tableData.value?.length || 0,
      sample: tableData.value?.[0],
      storeLength: store.tableData.value?.length || 0
    },
    columns: {
      parent: tableColumns.value.length,
      child: detailColumns.value.length,
      visibleParent: tableColumns.value.filter((c) => c.visible).length,
      visibleChild: detailColumns.value.filter((c) => c.visible).length
    }
  })

  // Only require table and visible columns to be ready
  return !hasTable || !hasColumns || isProcessing
})

// Error state with type safety
const error = computed<Error | null>(() => {
  if (tableError.value) return tableError.value
  if (bimElements.hasError.value) {
    debug.error(DebugCategories.ERROR, 'BIM elements error')
    return new Error('Failed to load BIM elements')
  }
  if (parameters.hasError.value) {
    debug.error(DebugCategories.ERROR, 'Parameters error')
    return new Error('Failed to process parameters')
  }
  if (tableParameters.hasError.value) {
    debug.error(DebugCategories.ERROR, 'Parameter initialization error')
    return tableParameters.error.value || new Error('Failed to initialize parameters')
  }
  if (parameterStore.state.value.processing.error) {
    debug.error(DebugCategories.ERROR, 'Parameter processing error')
    return parameterStore.state.value.processing.error
  }
  return null
})

// Error state for LoadingState component with type safety
const errorState = computed(() => {
  const currentError = error.value
  if (!currentError) return null
  return {
    message: currentError.message || 'Unknown error',
    name: currentError.name || 'Error',
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

// Safe computed properties for elements
const parentElements = computed<ElementData[]>(() => {
  return (store.scheduleData.value || []).filter((el) => el.metadata?.isParent)
})

const childElements = computed<ElementData[]>(() => {
  return (store.scheduleData.value || []).filter((el) => el.isChild)
})

// Initialize stores synchronously
onMounted(() => {
  debug.startState(DebugCategories.INITIALIZATION, 'Initializing schedule view')

  // Initialize stores if needed
  if (!store.initialized.value) {
    store.lifecycle.init().catch(handleError)
  }
  if (!parameterStore.state.value.initialized) {
    parameterStore.init().catch(handleError)
  }

  // Initialize table
  initializeTable().catch(handleError)

  debug.completeState(DebugCategories.INITIALIZATION, 'Schedule view initialized')
})

// Watch for table changes and reinitialize parameters only if needed
watch(
  () => props.selectedTableId,
  (newTableId, oldTableId) => {
    if (
      newTableId &&
      newTableId !== oldTableId &&
      parameterStore.state.value.initialized
    ) {
      debug.log(DebugCategories.PARAMETERS, 'Table changed, reinitializing parameters')
      tableParameters.initializeTableParameters().catch(handleError)
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
  min-height: 400px;
  width: 100%;
}
</style>
