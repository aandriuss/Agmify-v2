<template>
  <ViewerLayoutPanel :initial-width="400" @close="handleClose">
    <template #title>Datasets</template>

    <template #actions>
      <div class="flex items-center justify-between w-full">
        <ScheduleHeader
          :selected-table-id="store.selectedTableId.value || ''"
          :table-name="store.tableName.value || ''"
          :tables="store.tablesArray.value || []"
          :show-category-options="showCategoryOptions"
          :has-changes="hasChanges"
          @update:selected-table-id="handleSelectedTableIdUpdate"
          @update:table-name="handleTableNameUpdate"
          @table-change="handleTableChange"
          @save="handleSaveTable"
          @toggle-category-options="toggleCategoryOptions"
        />
        <FormButton
          text
          size="sm"
          color="primary"
          :disabled="!store.selectedTableId.value"
          @click="toggleParameterManager"
        >
          Manage Parameters
        </FormButton>
      </div>
    </template>

    <div class="flex flex-col">
      <!-- Category Filters -->
      <div
        v-if="showCategoryOptions && !isLoading"
        class="sticky top-10 px-2 py-2 flex flex-col justify-start text-left border-b-2 border-primary-muted bg-foundation"
      >
        <ScheduleCategoryFilters
          :show-category-options="showCategoryOptions"
          :parent-categories="parentCategories"
          :child-categories="childCategories"
          :selected-parent-categories="categories.selectedParentCategoriesValue"
          :selected-child-categories="categories.selectedChildCategoriesValue"
          :is-updating="categories.isUpdating.value"
          @toggle-category="categories.handleCategoryToggle"
        />
      </div>

      <div v-if="isLoading" class="flex items-center justify-center h-full">
        <div class="text-center">
          <div class="text-lg font-semibold mb-2">Loading schedule data...</div>
          <div class="text-sm text-gray-500">
            Please wait while we prepare your data
          </div>
        </div>
      </div>

      <div v-else-if="error" class="flex items-center justify-center h-full">
        <div class="text-center">
          <div class="text-lg font-semibold mb-2 text-red-500">
            {{ error?.message }}
          </div>
          <FormButton
            class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            @click="handleRetry"
          >
            Retry
          </FormButton>
        </div>
      </div>

      <div
        v-else
        ref="viewerContainer"
        class="viewer-container"
        style="width: 100%; height: 100%; min-height: 400px"
      >
        <TestDataTable v-if="isTestMode" />

        <template v-else>
          <div class="schedule-table-container">
            <ScheduleTableView
              v-if="!isLoading"
              :selected-table-id="store.selectedTableId.value || ''"
              :current-table="null"
              :is-initialized="isInitialized"
              :table-name="store.tableName.value || ''"
              :current-table-id="store.currentTableId.value || ''"
              :table-key="store.tableKey.value || '0'"
              :loading-error="error"
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
              :no-categories-selected="!hasSelectedCategories"
              :selected-parent-categories="categories.selectedParentCategories.value"
              :selected-child-categories="categories.selectedChildCategories.value"
              @update:both-columns="handleBothColumnsUpdate"
              @table-updated="handleTableDataUpdate"
              @column-visibility-change="handleColumnVisibilityChange"
              @row-expand="handleRowExpand"
              @row-collapse="handleRowCollapse"
              @error="handleError"
            />

            <ScheduleDataManagement
              v-if="!isLoading"
              ref="dataComponent"
              :schedule-data="store.scheduleData.value || []"
              :evaluated-data="store.evaluatedData.value || []"
              :custom-parameters="store.customParameters.value || []"
              :merged-table-columns="store.parentAvailableColumns.value || []"
              :merged-detail-columns="store.childAvailableColumns.value || []"
              :selected-parent-categories="categories.selectedParentCategoriesValue"
              :selected-child-categories="categories.selectedChildCategoriesValue"
              :is-initialized="isInitialized"
              @update:table-data="handleTableDataUpdate"
              @error="handleError"
            />

            <ScheduleParameterHandling
              v-if="!isLoading"
              ref="parameterComponent"
              :schedule-data="store.scheduleData.value || []"
              :custom-parameters="store.customParameters.value || []"
              :selected-parent-categories="categories.selectedParentCategoriesValue"
              :selected-child-categories="categories.selectedChildCategoriesValue"
              :available-headers="processedHeaders"
              :is-initialized="isInitialized"
              @update:parameter-columns="handleParameterColumnsUpdate"
              @update:evaluated-data="handleEvaluatedDataUpdate"
              @update:merged-parent-parameters="handleMergedParentParametersUpdate"
              @update:merged-child-parameters="handleMergedChildParametersUpdate"
              @error="handleError"
            />

            <ScheduleColumnManagement
              v-if="!isLoading"
              ref="columnComponent"
              :current-table-columns="store.parentVisibleColumns.value || []"
              :current-detail-columns="store.childVisibleColumns.value || []"
              :parameter-columns="store.parentBaseColumns.value || []"
              :is-initialized="isInitialized"
              @update:merged-table-columns="handleMergedTableColumnsUpdate"
              @update:merged-detail-columns="handleMergedDetailColumnsUpdate"
              @column-visibility-change="handleColumnVisibilityChange"
              @column-order-change="handleColumnOrderChange"
              @error="handleError"
            />

            <ScheduleParameterManagerModal
              v-if="showParameterManager"
              :show="showParameterManager"
              :table-id="store.currentTableId.value || ''"
              @update:show="toggleParameterManager"
              @update="handleParameterUpdate"
              @update:visibility="handleParameterVisibility"
              @update:order="handleParameterOrder"
            />

            <DebugPanel
              :schedule-data="store.scheduleData.value || []"
              :evaluated-data="store.evaluatedData.value || []"
              :table-data="store.tableData.value || []"
              :parent-elements="parentElements"
              :child-elements="childElements"
              :parent-parameter-columns="store.parentAvailableColumns.value || []"
              :child-parameter-columns="store.childAvailableColumns.value || []"
              :available-parent-headers="availableParentHeaders"
              :available-child-headers="availableChildHeaders"
              :is-test-mode="isTestMode"
              @update:is-test-mode="isTestMode = $event"
            />
          </div>
        </template>
      </div>
    </div>
  </ViewerLayoutPanel>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { isEqual } from 'lodash-es'
import { useDebug, DebugCategories } from './debug/useDebug'
import { useStore } from './core/store'
import { useProcessedHeaders } from './composables/useProcessedHeaders'
import { useElementsData } from './composables/useElementsData'
import { parentCategories, childCategories } from './config/categories'
import { defaultTable } from './config/defaultColumns'
import { useUnifiedParameters } from './composables/useUnifiedParameters'
import { useScheduleInteractions } from './composables/useScheduleInteractions'
import { useScheduleCategories } from './composables/useScheduleCategories'
import DebugPanel from './debug/DebugPanel.vue'
import TestDataTable from './components/test/TestDataTable.vue'

// Types
import type {
  ScheduleDataManagementExposed,
  ScheduleParameterHandlingExposed,
  ScheduleColumnManagementExposed,
  ElementData,
  TableRow,
  ScheduleInitializationInstance,
  TableConfig
} from './types'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'

// Components
import ScheduleHeader from './components/ScheduleTableHeader.vue'
import ScheduleDataManagement from './components/ScheduleDataManagement.vue'
import ScheduleParameterHandling from './components/ScheduleParameterHandling.vue'
import ScheduleColumnManagement from './components/ScheduleColumnManagement.vue'
import ScheduleParameterManagerModal from './components/ScheduleParameterManagerModal.vue'
import ScheduleCategoryFilters from './components/ScheduleCategoryFilters.vue'
import { ScheduleTableView } from './components/table'

// Define emits
const emit = defineEmits<{
  close: []
  'update:table-data': [data: unknown]
  'update:both-columns': [
    updates: { parentColumns: ColumnDef[]; childColumns: ColumnDef[] }
  ]
  'column-visibility-change': []
  'row-expand': [row: TableRow | ElementData]
  'row-collapse': [row: TableRow | ElementData]
  error: [err: Error | unknown]
}>()

// Initialize debug system
const debug = useDebug()

// Add test mode state
const isTestMode = ref(false)

// Initialize refs
const error = ref<Error | null>(null)
const viewerContainer = ref<HTMLElement | null>(null)

const categories = useScheduleCategories({
  initialState: {
    selectedParentCategories: defaultTable.categoryFilters.selectedParentCategories,
    selectedChildCategories: defaultTable.categoryFilters.selectedChildCategories
  },
  onUpdate: async (state) => {
    await store.lifecycle.update({
      selectedParentCategories: state.selectedParentCategories,
      selectedChildCategories: state.selectedChildCategories
    })
  }
})

// Component refs
const dataComponent = ref<ScheduleDataManagementExposed | null>(null)
const parameterComponent = ref<ScheduleParameterHandlingExposed | null>(null)
const columnComponent = ref<ScheduleColumnManagementExposed | null>(null)

// Initialize core composables
const store = useStore()
const { settings, loadSettings } = useUserSettings()

const initComponent = ref<ScheduleInitializationInstance>({
  initialize: async () => {
    debug.log(DebugCategories.INITIALIZATION, 'Initializing schedule component')
    await store.lifecycle.init()
  },
  createNamedTable: async (name: string, config: Omit<TableConfig, 'id' | 'name'>) => {
    debug.log(DebugCategories.TABLE_UPDATES, 'Creating new table', {
      name,
      config
    })

    // Create new table with store
    await store.lifecycle.update({
      tableName: name,
      parentBaseColumns: config.parentColumns,
      childBaseColumns: config.childColumns,
      parentVisibleColumns: config.parentColumns,
      childVisibleColumns: config.childColumns,
      selectedParentCategories: config.categoryFilters?.selectedParentCategories || [],
      selectedChildCategories: config.categoryFilters?.selectedChildCategories || [],
      customParameters: config.customParameters || []
    })

    // Return table config
    const tableConfig: TableConfig = {
      id: store.currentTableId.value,
      name,
      parentColumns: config.parentColumns,
      childColumns: config.childColumns,
      categoryFilters: config.categoryFilters,
      customParameters: config.customParameters
    }

    return tableConfig
  },
  updateNamedTable: async (id: string, config: Partial<TableConfig>) => {
    debug.log(DebugCategories.TABLE_UPDATES, 'Updating table', {
      id,
      config
    })

    // Update table with store
    await store.lifecycle.update({
      currentTableId: id,
      tableName: config.name,
      ...(config.parentColumns && {
        parentBaseColumns: config.parentColumns,
        parentVisibleColumns: config.parentColumns
      }),
      ...(config.childColumns && {
        childBaseColumns: config.childColumns,
        childVisibleColumns: config.childColumns
      }),
      ...(config.categoryFilters && {
        selectedParentCategories: config.categoryFilters.selectedParentCategories,
        selectedChildCategories: config.categoryFilters.selectedChildCategories
      }),
      ...(config.customParameters && {
        customParameters: config.customParameters
      })
    })

    // Return updated table config
    const tableConfig: TableConfig = {
      id,
      name: config.name || store.tableName.value,
      parentColumns: config.parentColumns || store.parentVisibleColumns.value || [],
      childColumns: config.childColumns || store.childVisibleColumns.value || [],
      categoryFilters: config.categoryFilters || {
        selectedParentCategories: categories.selectedParentCategories.value,
        selectedChildCategories: categories.selectedChildCategories.value
      },
      customParameters: config.customParameters || store.customParameters.value || []
    }

    return tableConfig
  }
})

// Initialize interactions with proper initialization component
const interactions = useScheduleInteractions({
  state: {
    selectedTableId: store.selectedTableId.value || '',
    tableName: store.tableName.value || '',
    currentTable: null,
    selectedParentCategories: categories.selectedParentCategories.value,
    selectedChildCategories: categories.selectedChildCategories.value,
    currentTableColumns: store.parentVisibleColumns.value || [],
    currentDetailColumns: store.childVisibleColumns.value || []
  },
  initComponent,
  updateCurrentColumns: async (parentColumns, childColumns) => {
    await store.setColumns(parentColumns, childColumns, 'available')
    // Also update visible columns
    await store.setColumns(parentColumns, childColumns, 'visible')
  },
  handleError: (err: unknown) => {
    const error = err instanceof Error ? err : new Error('Unknown error occurred')
    handleError(error)
  },
  emit
})

const {
  showCategoryOptions,
  showParameterManager,
  toggleCategoryOptions,
  toggleParameterManager,
  handleClose,
  handleSaveTable,
  handleBothColumnsUpdate,
  state: interactionsState
} = interactions

// Initialize data composables with new category refs
const elementsData = useElementsData({
  selectedParentCategories: categories.selectedParentCategoriesValue,
  selectedChildCategories: categories.selectedChildCategoriesValue
})

// Loading state - only show loading when we have no data
const isLoading = computed(() => {
  // If we have data, don't show loading
  if (store.scheduleData.value?.length > 0) return false
  // If we have table data, don't show loading
  if (store.tableData.value?.length > 0) return false
  // If we're still processing elements, show loading
  if (elementsData.processingState.value?.isProcessingElements) return true
  // Otherwise show loading
  return true
})

const isInitialized = computed(() => store.initialized.value)

const isUpdating = computed(() => {
  const state = elementsData.processingState.value
  return state?.isProcessingElements || false
})

const hasSelectedCategories = computed(() => categories.hasSelectedCategories.value)

const hasChanges = computed(() => {
  // Get the current table settings from settings
  const currentTableId = store.selectedTableId.value
  const currentSettings = settings.value?.namedTables?.[currentTableId]

  if (!currentTableId || !currentSettings) {
    // If we're creating a new table or no settings exist, check if we have any data
    return !!(
      store.tableName.value ||
      categories.selectedParentCategories.value.length > 0 ||
      categories.selectedChildCategories.value.length > 0 ||
      store.parentVisibleColumns.value?.length > 0 ||
      store.childVisibleColumns.value?.length > 0
    )
  }

  // Compare current state with saved settings
  return (
    // Check table name changes
    currentSettings.name !== store.tableName.value ||
    // Check category changes
    !isEqual(
      currentSettings.categoryFilters?.selectedParentCategories || [],
      categories.selectedParentCategories.value // Changed
    ) ||
    !isEqual(
      currentSettings.categoryFilters?.selectedChildCategories || [],
      categories.selectedChildCategories.value // Changed
    ) ||
    // Check column changes
    !isEqual(currentSettings.parentColumns || [], store.parentVisibleColumns.value) ||
    !isEqual(currentSettings.childColumns || [], store.childVisibleColumns.value) ||
    // Check custom parameters changes
    !isEqual(currentSettings.customParameters || [], store.customParameters.value)
  )
})

// Process headers
const { processedHeaders } = useProcessedHeaders({
  headers: computed(() => store.availableHeaders.value)
})

// Parameter handling - this will automatically update the store
useUnifiedParameters({
  discoveredParameters: computed(
    () => store.availableHeaders.value || { parent: [], child: [] }
  ),
  customParameters: computed(() => store.customParameters.value || [])
})

// Helper to apply table settings to store
async function applyTableSettings(tableId: string) {
  try {
    debug.startState(DebugCategories.INITIALIZATION, 'Applying table settings')

    const tableSettings = settings.value?.namedTables?.[tableId]

    if (tableSettings) {
      await store.lifecycle.update({
        selectedTableId: tableId,
        currentTableId: tableId,
        tableName: tableSettings.name,
        parentBaseColumns: tableSettings.parentColumns || [],
        childBaseColumns: tableSettings.childColumns || [],
        parentVisibleColumns: tableSettings.parentColumns || [],
        childVisibleColumns: tableSettings.childColumns || []
      })

      // Update categories using new composable
      await categories.loadCategories(
        tableSettings.categoryFilters?.selectedParentCategories || [],
        tableSettings.categoryFilters?.selectedChildCategories || []
      )
    } else {
      await store.lifecycle.update({
        selectedTableId: tableId,
        currentTableId: tableId,
        tableName: 'Default Table',
        parentBaseColumns: defaultTable.parentColumns,
        childBaseColumns: defaultTable.childColumns,
        parentVisibleColumns: defaultTable.parentColumns,
        childVisibleColumns: defaultTable.childColumns
      })

      // Load default categories
      await categories.loadCategories(
        defaultTable.categoryFilters.selectedParentCategories,
        defaultTable.categoryFilters.selectedChildCategories
      )
    }
  } catch (error) {
    debug.error(DebugCategories.ERROR, 'Error applying table settings:', error)
    handleError(error)
  }
}

// Computed properties for available headers with required ColumnDef properties
const availableParentHeaders = computed(
  () =>
    store.parentAvailableColumns.value?.map((col) => ({
      ...col,
      type: col.type || 'string',
      source: col.source || 'Parameters',
      category: col.category || 'Uncategorized',
      description: col.description || '',
      visible: col.visible ?? true,
      removable: col.removable ?? true,
      order: col.order ?? 0
    })) || []
)

const availableChildHeaders = computed(
  () =>
    store.childAvailableColumns.value?.map((col) => ({
      ...col,
      type: col.type || 'string',
      source: col.source || 'Parameters',
      category: col.category || 'Uncategorized',
      description: col.description || '',
      visible: col.visible ?? true,
      removable: col.removable ?? true,
      order: col.order ?? 0
    })) || []
)

// Computed properties for relationship data
const parentElements = computed(() => {
  return (store.scheduleData.value || []).filter((el): el is ElementData => {
    return !el.isChild
  })
})

const childElements = computed(() => {
  return (store.scheduleData.value || []).filter((el): el is ElementData => {
    return !!el.isChild
  })
})

// Handler functions
function handleTableDataUpdate() {
  try {
    error.value = null
  } catch (err) {
    handleError(err)
  }
}

async function handleRetry() {
  try {
    error.value = null
    await elementsData.initializeData()
  } catch (err) {
    handleError(err)
  }
}

function handleParameterColumnsUpdate() {
  try {
    error.value = null
  } catch (err) {
    handleError(err)
  }
}

function handleMergedParentParametersUpdate() {
  error.value = null
}

function handleMergedChildParametersUpdate() {
  error.value = null
}

function handleMergedTableColumnsUpdate() {
  error.value = null
}

function handleMergedDetailColumnsUpdate() {
  error.value = null
}

async function handleSelectedTableIdUpdate(value: string) {
  try {
    debug.startState(DebugCategories.TABLE_UPDATES, 'Updating selected table')

    // Apply settings for selected table
    await applyTableSettings(value)

    // Update elements with new categories
    await elementsData.updateCategories(
      categories.selectedParentCategories.value,
      categories.selectedChildCategories.value
    )

    debug.completeState(DebugCategories.TABLE_UPDATES, 'Table selection updated')
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Error updating selected table:', err)
    handleError(err)
  }
}

// Watch for store changes to update interactions state
watch(
  [
    () => store.selectedTableId.value,
    () => store.tableName.value,
    () => store.parentVisibleColumns.value,
    () => store.childVisibleColumns.value,
    () => categories.selectedParentCategories.value,
    () => categories.selectedChildCategories.value
  ],
  ([
    selectedTableId,
    tableName,
    parentColumns,
    childColumns,
    parentCategories,
    childCategories
  ]) => {
    debug.log(DebugCategories.STATE, 'Store state changed, updating interactions', {
      selectedTableId,
      tableName,
      parentColumnsCount: parentColumns?.length,
      childColumnsCount: childColumns?.length,
      currentInteractionsState: interactionsState.value
    })

    // Ensure we have a valid table name
    const newTableName = tableName || ''

    // Update interactions state
    interactionsState.value = {
      selectedTableId: selectedTableId || '',
      tableName: newTableName,
      currentTable: null,
      selectedParentCategories: parentCategories,
      selectedChildCategories: childCategories,
      currentTableColumns: parentColumns || [],
      currentDetailColumns: childColumns || []
    }

    debug.log(DebugCategories.STATE, 'Updated interactions state', {
      newState: interactionsState.value
    })
  },
  { immediate: true, deep: true }
)

function handleTableNameUpdate(value: string) {
  try {
    debug.log(DebugCategories.TABLE_UPDATES, 'Updating table name', {
      value,
      currentStoreName: store.tableName.value,
      currentInteractionsName: interactionsState.value.tableName
    })

    // Update store
    store.setTableInfo({ tableName: value })

    // Ensure interactions state is updated
    interactionsState.value = {
      ...interactionsState.value,
      tableName: value
    }

    debug.log(DebugCategories.TABLE_UPDATES, 'Table name updated', {
      newStoreName: store.tableName.value,
      newInteractionsName: interactionsState.value.tableName
    })
  } catch (err) {
    handleError(err)
  }
}

function handleColumnVisibilityChange() {
  error.value = null
}

function handleColumnOrderChange() {
  error.value = null
}

function handleParameterVisibility() {
  error.value = null
}

function handleParameterOrder() {
  error.value = null
}

function handleEvaluatedDataUpdate() {
  try {
    error.value = null
  } catch (err) {
    handleError(err)
  }
}

async function handleParameterUpdate() {
  try {
    debug.startState(DebugCategories.PARAMETERS, 'Updating parameters')
    error.value = null

    // Reload settings to get updated parameters
    const { settings, loadSettings } = useUserSettings()
    await loadSettings()

    // Get custom parameters from settings
    const customParams =
      settings.value?.namedTables?.[store.currentTableId.value]?.customParameters || []

    // Update store with custom parameters
    await store.lifecycle.update({
      customParameters: customParams
    })

    // Close modal
    showParameterManager.value = false

    debug.completeState(DebugCategories.PARAMETERS, 'Parameters updated', {
      parameterCount: customParams.length,
      tableId: store.currentTableId.value
    })
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Error updating parameters:', err)
    handleError(err)
  }
}

function handleTableChange() {
  try {
    error.value = null
  } catch (err) {
    handleError(err)
  }
}

onMounted(async () => {
  try {
    debug.startState(DebugCategories.INITIALIZATION, 'Initializing schedules')

    // Load settings first
    await loadSettings()

    // Extract tables info and update store
    const tables = settings.value?.namedTables
      ? Object.entries(settings.value.namedTables).map(([id, table]) => ({
          id,
          name: table.name || 'Unnamed Table'
        }))
      : []

    await store.lifecycle.update({
      tablesArray: tables
    })

    // Get default table ID
    const defaultTableId = tables.length > 0 ? tables[0].id : 'default'

    // Apply settings for default table
    await applyTableSettings(defaultTableId)

    // Initialize elements data
    await elementsData.initializeData()

    debug.completeState(DebugCategories.INITIALIZATION, 'Schedules initialized')
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Error initializing schedules:', err)
    handleError(err)
  }
})

// Clean up
onBeforeUnmount(() => {
  elementsData.stopWorldTreeWatch()
})

function handleRowExpand(row: TableRow | ElementData) {
  debug.log(DebugCategories.TABLE_DATA, 'Row expanded', {
    id: row.id,
    type: row.type,
    isChild: row.isChild,
    hasDetails: 'details' in row && Array.isArray(row.details)
  })
  emit('row-expand', row)
}

function handleRowCollapse(row: TableRow | ElementData) {
  debug.log(DebugCategories.TABLE_DATA, 'Row collapsed', {
    id: row.id,
    type: row.type,
    isChild: row.isChild,
    hasDetails: 'details' in row && Array.isArray(row.details)
  })
  emit('row-collapse', row)
}

// Error handling with type safety
function handleError(err: Error | unknown): void {
  // Type guard for Error objects
  function isError(value: unknown): value is Error {
    return value instanceof Error
  }

  // Create a safe error object
  const safeError = isError(err)
    ? err
    : new Error(typeof err === 'string' ? err : 'Unknown error occurred')

  // Set error state
  error.value = safeError

  // Safe error logging with type guards
  const errorDetails = {
    name: isError(err) ? err.name : 'Error',
    message: safeError.message,
    stack: isError(err) && typeof err.stack === 'string' ? err.stack : undefined
  }

  debug.error(DebugCategories.ERROR, 'Schedule error:', errorDetails)
}

// Expose necessary functions with type safety
defineExpose({
  handleError: (err: Error | unknown) => handleError(err),
  handleParameterUpdate: () => handleParameterUpdate(),
  handleBothColumnsUpdate: (updates: {
    parentColumns: ColumnDef[]
    childColumns: ColumnDef[]
  }) => handleBothColumnsUpdate(updates),
  handleTableDataUpdate: () => handleTableDataUpdate()
})
</script>

<style scoped>
.flex {
  display: flex;
}

.flex-col {
  flex-direction: column;
}

.p-4 {
  padding: 1rem;
}

.text-red-500 {
  color: rgb(239 68 68);
}

.text-gray-500 {
  color: rgb(107 114 128);
}

.mt-2 {
  margin-top: 0.5rem;
}

.viewer-container {
  position: relative;
  overflow: hidden;
}

.schedule-table-container {
  display: block;
}

.px-4 {
  padding-left: 1rem;
  padding-right: 1rem;
}

.py-2 {
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}

.bg-blue-500 {
  background-color: rgb(59 130 246);
}

.hover-bg-blue-600:hover {
  background-color: rgb(37 99 235);
}

.text-white {
  color: rgb(255 255 255);
}

.rounded {
  border-radius: 0.25rem;
}

.ml-2 {
  margin-left: 0.5rem;
}

.sticky {
  position: sticky;
}

.top-10 {
  top: 2.5rem;
}

.border-b-2 {
  border-bottom-width: 2px;
}

.border-primary-muted {
  border-color: var(--color-primary-muted);
}

.bg-foundation {
  background-color: var(--color-foundation);
}
</style>
