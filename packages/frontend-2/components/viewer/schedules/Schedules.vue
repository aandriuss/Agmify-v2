<template>
  <ViewerLayoutPanel @close="$emit('close')">
    <template #title>Datasets</template>
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
        :is-loading="isLoading"
        :error="error"
        loading-message="Loading schedule data..."
      >
        <div class="schedule-container">
          <ScheduleMainView
            :selected-table-id="store.selectedTableId.value || ''"
            :current-table="_currentTable"
            :is-initialized="isInitialized"
            :table-name="store.tableName.value || ''"
            :current-table-id="store.currentTableId.value || ''"
            :table-key="store.tableKey.value || '0'"
            :error="error"
            :parent-base-columns="store.parentBaseColumns.value || []"
            :parent-available-columns="store.parentAvailableColumns.value || []"
            :parent-visible-columns="store.parentVisibleColumns.value || []"
            :child-base-columns="store.childBaseColumns.value || []"
            :child-available-columns="store.childAvailableColumns.value || []"
            :child-visible-columns="store.childVisibleColumns.value || []"
            :schedule-data="store.scheduleData.value || []"
            :evaluated-data="store.evaluatedData.value || []"
            :table-data="store.tableData.value || []"
            :is-loading="isLoading"
            :is-loading-additional-data="isUpdating"
            :has-selected-categories="categories.hasSelectedCategories.value"
            :selected-parent-categories="categories.selectedParentCategories.value"
            :selected-child-categories="categories.selectedChildCategories.value"
            :show-parameter-manager="_interactions.showParameterManager.value"
            :parent-elements="parentElements"
            :child-elements="childElements"
            :is-test-mode="false"
            @error="handleError"
            @table-updated="handleTableDataUpdate"
            @update:both-columns="_interactions.handleBothColumnsUpdate"
            @column-visibility-change="handleColumnVisibilityChange"
          />
        </div>
      </LoadingState>
    </TableLayout>
  </ViewerLayoutPanel>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useDebug, DebugCategories } from '~/composables/core/utils/debug'
import { useStore } from '~/composables/core/store'
import { useElementsData } from '~/composables/core/tables/state/useElementsData'
import { useTableInteractions } from '~/composables/core/tables/interactions/useTableInteractions'
import { useTableInitialization } from '~/composables/core/tables/initialization/useTableInitialization'
import { useTableCategories } from '~/composables/core/tables/categories/useTableCategories'
import type { NamedTableConfig, ElementData, ColumnDef } from '~/composables/core/types'
import type { ParameterValue } from '~/composables/core/types/parameters'
import { useTablesState } from '~/composables/settings/tables/useTablesState'
import TableLayout from '~/components/core/tables/TableLayout.vue'
import LoadingState from '~/components/core/LoadingState.vue'
import ScheduleMainView from './components/ScheduleMainView.vue'
import { defaultTable } from './config/defaultColumns'

// Initialize debug system
const debug = useDebug()

// Initialize refs
const error = ref<Error | null>(null)

// Initialize core composables
const store = useStore()
const tablesState = useTablesState()

// Get current table from tablesState
const _currentTable = computed(() => {
  const selectedId = store.selectedTableId.value
  if (!selectedId) return null

  return (
    Object.values(tablesState.state.value?.tables || {}).find(
      (table): table is NamedTableConfig => table.id === selectedId
    ) || null
  )
})

// Initialize core composables
const { initComponent } = useTableInitialization({
  store,
  initialState: {
    selectedTableId: '',
    tableName: '',
    currentTableColumns: [],
    currentDetailColumns: [],
    selectedParentCategories: defaultTable.categoryFilters.selectedParentCategories,
    selectedChildCategories: defaultTable.categoryFilters.selectedChildCategories
  },
  onError: handleError
})

const _interactions = useTableInteractions({
  store,
  state: {
    selectedTableId: '',
    tableName: '',
    currentTable: null,
    selectedParentCategories: [],
    selectedChildCategories: [],
    currentTableColumns: [],
    currentDetailColumns: []
  },
  initComponent,
  updateCurrentColumns: async (parentColumns, childColumns) => {
    await store.lifecycle.update({
      currentTableColumns: parentColumns,
      currentDetailColumns: childColumns,
      mergedTableColumns: parentColumns,
      mergedDetailColumns: childColumns
    })
  },
  handleError
})

const categories = useTableCategories({
  initialState: {
    selectedParentCategories: defaultTable.categoryFilters.selectedParentCategories,
    selectedChildCategories: defaultTable.categoryFilters.selectedChildCategories
  },
  onUpdate: async (state) => {
    await store.lifecycle.update({
      selectedParentCategories: state.selectedParentCategories,
      selectedChildCategories: state.selectedChildCategories
    })
  },
  onError: handleError
})

// Initialize data composables with new category refs
const elementsData = useElementsData({
  selectedParentCategories: categories.selectedParentCategories,
  selectedChildCategories: categories.selectedChildCategories
})

// Loading state - only show loading when we have no data
const isLoading = computed(() => {
  if (store.scheduleData.value?.length > 0) return false
  if (store.tableData.value?.length > 0) return false
  if (elementsData.processingState?.isProcessingElements) return true
  return true
})

const isInitialized = computed(() => store.initialized.value ?? false)

const isUpdating = computed(() => {
  return elementsData.processingState?.isProcessingElements ?? false
})

// Type guard for raw table data
interface RawTableData extends Omit<ElementData, 'parameters'> {
  id: string
  name: string
  field: string
  header: string
  visible: boolean
  removable: boolean
  type: string
  isChild: boolean
  parameters: Record<string, ParameterValue>
  details?: ElementData[]
  metadata?: Record<string, unknown>
}

function isValidTableData(value: unknown): value is RawTableData {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'name' in value &&
    typeof value.name === 'string' &&
    'field' in value &&
    typeof value.field === 'string' &&
    'header' in value &&
    typeof value.header === 'string' &&
    'visible' in value &&
    typeof value.visible === 'boolean' &&
    'removable' in value &&
    typeof value.removable === 'boolean' &&
    'type' in value &&
    typeof value.type === 'string' &&
    'isChild' in value &&
    typeof value.isChild === 'boolean' &&
    'parameters' in value &&
    typeof value.parameters === 'object'
  )
}

// Computed properties for relationship data
const parentElements = computed<ElementData[]>(() => {
  const data = store.scheduleData.value || []
  return data
    .filter((el): el is RawTableData => isValidTableData(el) && !el.isChild)
    .map((raw) => ({
      ...raw,
      parameters: raw.parameters as Record<string, ParameterValue>,
      id: String(raw.id),
      name: String(raw.name),
      field: String(raw.field),
      header: String(raw.header),
      type: String(raw.type),
      isChild: Boolean(raw.isChild),
      visible: Boolean(raw.visible),
      removable: Boolean(raw.removable)
    }))
})

const childElements = computed<ElementData[]>(() => {
  const data = store.scheduleData.value || []
  return data
    .filter((el): el is RawTableData => isValidTableData(el) && el.isChild)
    .map((raw) => ({
      ...raw,
      parameters: raw.parameters as Record<string, ParameterValue>,
      id: String(raw.id),
      name: String(raw.name),
      field: String(raw.field),
      header: String(raw.header),
      type: String(raw.type),
      isChild: Boolean(raw.isChild),
      visible: Boolean(raw.visible),
      removable: Boolean(raw.removable)
    }))
})

// Handler functions
function handleTableDataUpdate() {
  error.value = null
}

async function handleColumnVisibilityChange(column: ColumnDef) {
  try {
    debug.log(DebugCategories.COLUMNS, 'Column visibility changed', {
      field: column.field,
      visible: column.visible
    })

    // Update parent columns
    const updatedParentColumns = (store.parentVisibleColumns.value || []).map((col) =>
      col.field === column.field ? { ...col, visible: column.visible } : col
    )

    // Update child columns
    const updatedChildColumns = (store.childVisibleColumns.value || []).map((col) =>
      col.field === column.field ? { ...col, visible: column.visible } : col
    )

    // Update store
    await store.lifecycle.update({
      parentVisibleColumns: updatedParentColumns,
      childVisibleColumns: updatedChildColumns
    })

    debug.log(DebugCategories.COLUMNS, 'Column visibility updated in store')
  } catch (err) {
    handleError(err)
  }
}

function handleError(err: Error | unknown): void {
  const safeError =
    err instanceof Error
      ? err
      : new Error(typeof err === 'string' ? err : 'Unknown error occurred')
  error.value = safeError

  debug.error(DebugCategories.ERROR, 'Schedule error:', {
    name: err instanceof Error ? err.name : 'Error',
    message: safeError.message,
    stack: err instanceof Error && typeof err.stack === 'string' ? err.stack : undefined
  })
}

onMounted(async () => {
  try {
    debug.startState(DebugCategories.INITIALIZATION, 'Initializing schedules')

    await tablesState.loadTables()

    const tables = Object.values(tablesState.state.value?.tables || {})
      .filter((table): table is NamedTableConfig => {
        if (!table || typeof table !== 'object') return false
        return 'id' in table && table.id !== 'defaultTable'
      })
      .map((table) => ({
        id: table.id,
        name: table.name || 'Unnamed Table'
      }))

    await store.lifecycle.update({
      tablesArray: tables
    })

    const lastSelectedId = localStorage.getItem('speckle:lastSelectedTableId')
    const tableIdToSelect =
      lastSelectedId && tables.some((table) => table.id === lastSelectedId)
        ? lastSelectedId
        : tables.length > 0
        ? tables[0].id
        : 'default'

    await initComponent.update({ selectedTableId: tableIdToSelect })
    await elementsData.initializeData()

    debug.completeState(DebugCategories.INITIALIZATION, 'Schedules initialized')
  } catch (err) {
    handleError(err)
  }
})

onBeforeUnmount(() => {
  elementsData.stopWorldTreeWatch()
})

// Expose necessary functions
defineExpose({
  handleError,
  handleTableDataUpdate,
  handleColumnVisibilityChange
})
</script>

<style scoped>
.viewer-container {
  width: 100%;
  height: 100%;
  min-height: 400px;
}

.schedule-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
}
</style>
