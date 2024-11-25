<template>
  <ViewerLayoutPanel :initial-width="400" v-bind="$attrs" @close="handleClose">
    <template #header>
      <div>Schedules</div>
    </template>

    <template #default>
      <div class="flex items-center justify-between w-full">
        <ScheduleHeader
          :selected-table-id="store.selectedTableId.value || ''"
          :table-name="store.tableName.value || ''"
          :tables="store.tablesArray.value || []"
          :show-category-options="showCategoryOptions"
          :has-changes="hasChanges"
          :is-test-mode="isTestMode"
          @update:selected-table-id="handleSelectedTableIdUpdate"
          @update:table-name="handleTableNameUpdate"
          @table-change="handleTableChange"
          @save="handleSaveTable"
          @manage-parameters="showParameterManager = true"
          @toggle-category-options="showCategoryOptions = !showCategoryOptions"
          @toggle-test-mode="isTestMode = !isTestMode"
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
              :selected-parent-categories="selectedParentCategories"
              :selected-child-categories="selectedChildCategories"
              @update:both-columns="handleBothColumnsUpdate"
              @table-updated="handleTableDataUpdate"
              @column-visibility-change="handleColumnVisibilityChange"
              @row-expand="handleRowExpand"
              @row-collapse="handleRowCollapse"
              @error="handleError"
            />

            <ScheduleCategoryFilters
              v-if="!isLoading"
              :show-category-options="showCategoryOptions"
              :parent-categories="parentCategories"
              :child-categories="childCategories"
              :selected-parent-categories="selectedParentCategories"
              :selected-child-categories="selectedChildCategories"
              :is-updating="isUpdating"
              @toggle-category="handleCategoryToggle"
            />

            <ScheduleDataManagement
              v-if="!isLoading"
              ref="dataComponent"
              :schedule-data="store.scheduleData.value || []"
              :evaluated-data="store.evaluatedData.value || []"
              :custom-parameters="store.customParameters.value || []"
              :merged-table-columns="store.parentAvailableColumns.value || []"
              :merged-detail-columns="store.childAvailableColumns.value || []"
              :selected-parent-categories="selectedParentCategories"
              :selected-child-categories="selectedChildCategories"
              :is-initialized="isInitialized"
              @update:table-data="handleTableDataUpdate"
              @error="handleError"
            />

            <ScheduleParameterHandling
              v-if="!isLoading"
              ref="parameterComponent"
              :schedule-data="store.scheduleData.value || []"
              :custom-parameters="store.customParameters.value || []"
              :selected-parent-categories="selectedParentCategories"
              :selected-child-categories="selectedChildCategories"
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
              v-model:show="showParameterManager"
              :table-id="store.currentTableId.value || ''"
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
            />
          </div>
        </template>
      </div>
    </template>
  </ViewerLayoutPanel>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useDebug, DebugCategories } from './debug/useDebug'
import { useStore } from './core/store'
import { useProcessedHeaders } from './composables/useProcessedHeaders'
import { useElementsData } from './composables/useElementsData'
import { useScheduleEmits } from './composables/useScheduleEmits'
import { parentCategories, childCategories } from './config/categories'
import { defaultTable } from './config/defaultColumns'
import { useUnifiedParameters } from './composables/useUnifiedParameters'
import TestDataTable from './components/test/TestDataTable.vue'
import DebugPanel from './debug/DebugPanel.vue'

// Types
import type {
  ScheduleDataManagementExposed,
  ScheduleParameterHandlingExposed,
  ScheduleColumnManagementExposed,
  ElementData,
  TableRow
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
const showCategoryOptions = ref(false)
const showParameterManager = ref(false)
const error = ref<Error | null>(null)
const viewerContainer = ref<HTMLElement | null>(null)
const selectedParentCategories = ref<string[]>(
  defaultTable.categoryFilters.selectedParentCategories
)
const selectedChildCategories = ref<string[]>(
  defaultTable.categoryFilters.selectedChildCategories
)

// Component refs
const dataComponent = ref<ScheduleDataManagementExposed | null>(null)
const parameterComponent = ref<ScheduleParameterHandlingExposed | null>(null)
const columnComponent = ref<ScheduleColumnManagementExposed | null>(null)

// Initialize core composables first
const { handleClose } = useScheduleEmits({ emit })
const store = useStore()
const { settings, loadSettings } = useUserSettings()

// Initialize data composables - we know viewer state is ready
const elementsData = useElementsData({
  selectedParentCategories,
  selectedChildCategories
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

const hasSelectedCategories = computed(
  () =>
    selectedParentCategories.value.length > 0 ||
    selectedChildCategories.value.length > 0
)

const hasChanges = computed(() => false) // TODO: Implement change tracking

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

    // Get table settings
    const tableSettings = settings.value?.namedTables?.[tableId]

    if (tableSettings) {
      debug.log(DebugCategories.INITIALIZATION, 'Found table settings', {
        tableId,
        name: tableSettings.name,
        parentColumnsCount: tableSettings.parentColumns?.length,
        childColumnsCount: tableSettings.childColumns?.length
      })

      // Update store with table settings
      await store.lifecycle.update({
        selectedTableId: tableId,
        currentTableId: tableId,
        tableName: tableSettings.name,
        // Set columns
        parentBaseColumns: tableSettings.parentColumns || [],
        childBaseColumns: tableSettings.childColumns || [],
        parentVisibleColumns: tableSettings.parentColumns || [],
        childVisibleColumns: tableSettings.childColumns || [],
        // Set categories
        selectedParentCategories:
          tableSettings.categoryFilters?.selectedParentCategories || [],
        selectedChildCategories:
          tableSettings.categoryFilters?.selectedChildCategories || []
      })

      // Update local category refs
      selectedParentCategories.value =
        tableSettings.categoryFilters?.selectedParentCategories || []
      selectedChildCategories.value =
        tableSettings.categoryFilters?.selectedChildCategories || []
    } else {
      debug.log(DebugCategories.INITIALIZATION, 'Using default settings', {
        tableId
      })

      // Apply defaults
      await store.lifecycle.update({
        selectedTableId: tableId,
        currentTableId: tableId,
        tableName: 'Default Table',
        parentBaseColumns: defaultTable.parentColumns,
        childBaseColumns: defaultTable.childColumns,
        parentVisibleColumns: defaultTable.parentColumns,
        childVisibleColumns: defaultTable.childColumns,
        selectedParentCategories: defaultTable.categoryFilters.selectedParentCategories,
        selectedChildCategories: defaultTable.categoryFilters.selectedChildCategories
      })

      // Update local category refs
      selectedParentCategories.value =
        defaultTable.categoryFilters.selectedParentCategories
      selectedChildCategories.value =
        defaultTable.categoryFilters.selectedChildCategories
    }

    debug.completeState(DebugCategories.INITIALIZATION, 'Table settings applied')
  } catch (error) {
    debug.error(DebugCategories.ERROR, 'Error applying table settings:', error)
    handleError(error)
  }
}

// Initialize on mount
onMounted(async () => {
  try {
    debug.startState(DebugCategories.INITIALIZATION, 'Initializing schedules')

    // Load settings first
    await loadSettings()

    // Get default table ID
    const defaultTableId = settings.value?.namedTables
      ? Object.keys(settings.value.namedTables)[0]
      : 'default'

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
      selectedParentCategories.value,
      selectedChildCategories.value
    )

    debug.completeState(DebugCategories.TABLE_UPDATES, 'Table selection updated')
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Error updating selected table:', err)
    handleError(err)
  }
}

function handleTableNameUpdate(value: string) {
  try {
    store.setTableInfo({ tableName: value })
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

async function handleBothColumnsUpdate(updates: {
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
}) {
  try {
    await store.setColumns(updates.parentColumns, updates.childColumns, 'available')
  } catch (err) {
    handleError(err)
  }
}

async function handleCategoryToggle(type: 'parent' | 'child', category: string) {
  try {
    // Update categories by creating new arrays
    const categories =
      type === 'parent' ? selectedParentCategories : selectedChildCategories
    const currentCategories = [...categories.value]
    const index = currentCategories.indexOf(category)

    if (index === -1) {
      currentCategories.push(category)
    } else {
      currentCategories.splice(index, 1)
    }

    // Update ref with new array
    categories.value = currentCategories

    // Update elements with new categories
    await elementsData.updateCategories(
      selectedParentCategories.value,
      selectedChildCategories.value
    )

    // Update store
    await store.lifecycle.update({
      selectedParentCategories: selectedParentCategories.value,
      selectedChildCategories: selectedChildCategories.value
    })

    debug.completeState(DebugCategories.CATEGORIES, 'Category update complete', {
      parent: selectedParentCategories.value,
      child: selectedChildCategories.value
    })
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Error updating categories:', err)
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

async function handleSaveTable() {
  try {
    debug.startState(DebugCategories.TABLE_UPDATES, 'Saving table')

    const currentTableId = store.currentTableId.value
    if (!currentTableId) {
      throw new Error('No table selected')
    }

    // Get current table state
    const tableState = {
      id: currentTableId,
      name: store.tableName.value || 'Unnamed Table',
      parentColumns: store.parentVisibleColumns.value || [],
      childColumns: store.childVisibleColumns.value || [],
      categoryFilters: {
        selectedParentCategories: selectedParentCategories.value,
        selectedChildCategories: selectedChildCategories.value
      },
      lastUpdateTimestamp: Date.now()
    }

    // Update settings
    const { settings, saveSettings } = useUserSettings()
    const currentSettings = settings.value || { namedTables: {} }

    const updatedSettings = {
      ...currentSettings,
      namedTables: {
        ...currentSettings.namedTables,
        [currentTableId]: tableState
      }
    }

    // Save to PostgreSQL
    const success = await saveSettings(updatedSettings)
    if (!success) {
      throw new Error('Failed to save table settings')
    }

    // Update store's tablesArray
    const tables = Object.entries(updatedSettings.namedTables).map(([id, table]) => ({
      id,
      name: table.name || 'Unnamed Table'
    }))

    await store.lifecycle.update({
      tablesArray: tables
    })

    debug.completeState(DebugCategories.TABLE_UPDATES, 'Table saved', {
      tableId: currentTableId,
      name: tableState.name
    })
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Error saving table:', err)
    handleError(err)
  }
}

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
  handleTableDataUpdate: () => handleTableDataUpdate(),
  handleCategoryToggle: (type: 'parent' | 'child', category: string) =>
    handleCategoryToggle(type, category)
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
</style>
