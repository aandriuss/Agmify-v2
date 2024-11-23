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

      <!-- Loading State -->
      <div v-if="isLoading" class="flex items-center justify-center h-full">
        <div class="text-center">
          <div class="text-lg font-semibold mb-2">Loading schedule data...</div>
          <div class="text-sm text-gray-500">
            Please wait while we prepare your data
          </div>
        </div>
      </div>

      <!-- Error State -->
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

      <!-- Content -->
      <template v-else>
        <!-- Main Content -->
        <div
          ref="viewerContainer"
          class="viewer-container"
          style="width: 100%; height: 100%; min-height: 400px"
        >
          <!-- Debug View -->
          <BIMDebugView
            :selected-parent-categories="selectedParentCategories"
            :selected-child-categories="selectedChildCategories"
            :raw-elements="elementsData?.rawElements || []"
            :parent-elements="elementsData?.parentElements || []"
            :child-elements="elementsData?.childElements || []"
            :matched-elements="elementsData?.matchedElements || []"
            :orphaned-elements="elementsData?.orphanedElements || []"
          />

          <!-- Conditional rendering of real or test data -->
          <template v-if="isTestMode">
            <TestDataTable />
          </template>
          <template v-else>
            <ScheduleTableView
              v-if="!isLoading"
              :selected-table-id="store.selectedTableId.value || ''"
              :current-table="currentTableConfig"
              :is-initialized="isInitialized"
              :table-name="store.tableName.value || ''"
              :current-table-id="store.currentTableId.value || ''"
              :table-key="store.tableKey.value || '0'"
              :loading-error="error"
              :merged-table-columns="store.mergedTableColumns.value || []"
              :merged-detail-columns="store.mergedDetailColumns.value || []"
              :available-parent-parameters="availableParentParameters"
              :available-child-parameters="availableChildParameters"
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
            />
          </template>

          <!-- Category Filters -->
          <ScheduleCategoryFilters
            v-if="!isLoading && !isTestMode"
            :show-category-options="showCategoryOptions"
            :parent-categories="parentCategories"
            :child-categories="childCategories"
            :selected-parent-categories="selectedParentCategories"
            :selected-child-categories="selectedChildCategories"
            :is-updating="isUpdating"
            @toggle-category="handleCategoryToggle"
          />

          <!-- Data Management -->
          <ScheduleDataManagement
            v-if="!isLoading && !isTestMode"
            ref="dataComponent"
            :schedule-data="store.scheduleData.value || []"
            :evaluated-data="store.evaluatedData.value || []"
            :custom-parameters="store.customParameters.value || []"
            :merged-table-columns="store.mergedTableColumns.value || []"
            :merged-detail-columns="store.mergedDetailColumns.value || []"
            :selected-parent-categories="selectedParentCategories"
            :selected-child-categories="selectedChildCategories"
            :is-initialized="isInitialized"
            @update:table-data="handleTableDataUpdate"
            @error="handleError"
          />

          <!-- Parameter Handling -->
          <ScheduleParameterHandling
            v-if="!isLoading && !isTestMode"
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

          <!-- Column Management -->
          <ScheduleColumnManagement
            v-if="!isLoading && !isTestMode"
            ref="columnComponent"
            :current-table-columns="store.currentTableColumns.value || []"
            :current-detail-columns="store.currentDetailColumns.value || []"
            :parameter-columns="store.parameterColumns.value || []"
            :is-initialized="isInitialized"
            @update:merged-table-columns="handleMergedTableColumnsUpdate"
            @update:merged-detail-columns="handleMergedDetailColumnsUpdate"
            @column-visibility-change="handleColumnVisibilityChange"
            @column-order-change="handleColumnOrderChange"
            @error="handleError"
          />

          <!-- Parameter Manager Modal -->
          <ScheduleParameterManagerModal
            v-if="!isLoading && showParameterManager && !isTestMode"
            v-model:show="showParameterManager"
            :table-id="store.currentTableId.value || ''"
            @update="handleParameterUpdate"
            @update:visibility="handleParameterVisibility"
            @update:order="handleParameterOrder"
          />
        </div>
      </template>
    </template>
  </ViewerLayoutPanel>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { debug, DebugCategories } from './utils/debug'
import { useStore } from './core/store'
import { useScheduleFlow } from './composables/useScheduleFlow'
import { useProcessedHeaders } from './composables/useProcessedHeaders'
import { useElementsData } from './composables/useElementsData'
import { useScheduleEmits } from './composables/useScheduleEmits'
import { parentCategories, childCategories } from './config/categories'
import { defaultTable } from './config/defaultColumns'
import TestDataTable from './components/test/TestDataTable.vue'

// Types
import type {
  ScheduleDataManagementExposed,
  ScheduleParameterHandlingExposed,
  ScheduleColumnManagementExposed
} from './types'
import type { NamedTableConfig } from '~/composables/useUserSettings'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'

// Components
import ScheduleHeader from './components/ScheduleTableHeader.vue'
import ScheduleDataManagement from './components/ScheduleDataManagement.vue'
import ScheduleParameterHandling from './components/ScheduleParameterHandling.vue'
import ScheduleColumnManagement from './components/ScheduleColumnManagement.vue'
import ScheduleParameterManagerModal from './components/ScheduleParameterManagerModal.vue'
import ScheduleCategoryFilters from './components/ScheduleCategoryFilters.vue'
import BIMDebugView from './components/BIMDebugView.vue'
import { ScheduleTableView } from './components/table'

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

// Emits
const emit = defineEmits<{
  close: []
}>()

// Initialize core composables first
const { handleClose } = useScheduleEmits({ emit })
const store = useStore()

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

// Wait for data to be ready before showing table
const showTable = computed(() => {
  return (
    !isLoading.value &&
    !error.value &&
    store.tableData.value?.length > 0 &&
    store.mergedTableColumns.value?.length > 0
  )
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

// Parameter handling
const availableParentParameters = computed(() => {
  const params = store.customParameters.value
  if (!Array.isArray(params)) return []

  return params
    .filter((param) => param.type === 'fixed')
    .map((param) => ({
      ...param,
      header: param.name
    }))
})

const availableChildParameters = computed(() => {
  const params = store.customParameters.value
  if (!Array.isArray(params)) return []

  return params
    .filter((param) => param.type === 'equation')
    .map((param) => ({
      ...param,
      header: param.name
    }))
})

// Handler functions
async function handleTableDataUpdate() {
  try {
    // No need to update store since data is already updated
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

async function handleParameterColumnsUpdate() {
  try {
    // No need to update store since data is already updated
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

function handleSelectedTableIdUpdate(value: string) {
  try {
    store.setTableInfo({ selectedTableId: value })
  } catch (err) {
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

async function handleEvaluatedDataUpdate() {
  try {
    // No need to update store since data is already updated
    error.value = null
  } catch (err) {
    handleError(err)
  }
}

async function handleParameterUpdate() {
  try {
    error.value = null
    showParameterManager.value = false
  } catch (err) {
    handleError(err)
  }
}

async function handleTableChange() {
  try {
    // No need to update store since data is already updated
    error.value = null
  } catch (err) {
    handleError(err)
  }
}

async function handleSaveTable() {
  try {
    // No need to update store since data is already updated
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
    await store.setMergedColumns(updates.parentColumns, updates.childColumns)
  } catch (err) {
    handleError(err)
  }
}

async function handleCategoryToggle(type: 'parent' | 'child', category: string) {
  try {
    debug.log(DebugCategories.CATEGORIES, 'Category toggle:', {
      type,
      category,
      currentState: {
        parent: selectedParentCategories.value,
        child: selectedChildCategories.value
      }
    })

    // Update categories
    const categories =
      type === 'parent' ? selectedParentCategories : selectedChildCategories
    const index = categories.value.indexOf(category)
    if (index === -1) {
      categories.value.push(category)
    } else {
      categories.value.splice(index, 1)
    }

    // Update elements with new categories
    await elementsData.updateCategories(
      selectedParentCategories.value,
      selectedChildCategories.value
    )

    debug.log(DebugCategories.CATEGORIES, 'Category update complete:', {
      newState: {
        parent: selectedParentCategories.value,
        child: selectedChildCategories.value
      }
    })
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Error updating categories:', err)
    handleError(err)
  }
}

// Clean up
onBeforeUnmount(() => {
  elementsData.stopWorldTreeWatch()
})

// Error handling with type safety
function handleError(err: Error | unknown): void {
  // Type guard for Error objects
  function isError(value: unknown): value is Error {
    return value instanceof Error
  }

  // Create a safe error object
  const errorValue = isError(err)
    ? err
    : new Error(typeof err === 'string' ? err : 'Unknown error occurred')

  // Set error state
  error.value = errorValue

  // Safe error logging with type guards
  const errorDetails = {
    name: isError(err) ? err.name : 'Error',
    message: errorValue.message,
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
