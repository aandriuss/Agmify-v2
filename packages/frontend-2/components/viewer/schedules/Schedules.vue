<template>
  <ViewerLayoutPanel :initial-width="400" v-bind="$attrs" @close="handleClose">
    <template #default>
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
            {{ error.message }}
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
          <!-- Core Components (always mounted) -->
          <ScheduleInitialization
            ref="initComponent"
            v-model:initialized="initialized"
            :update-root-nodes="updateRootNodes"
            :load-settings="loadSettings"
            :handle-table-selection="handleTableSelection"
            :current-table="currentTableConfig"
            :selected-table-id="storeValues?.selectedTableId || ''"
            :current-table-id="storeValues?.currentTableId || ''"
            :loading-error="error"
            :schedule-data="storeValues?.scheduleData || []"
            :root-nodes="rawTreeNodes"
            :is-initialized="initialized"
            :selected-parent-categories="selectedParentCategories"
            :selected-child-categories="selectedChildCategories"
            :project-id="viewerState.projectId.value || ''"
            @settings-loaded="handleSettingsLoaded"
            @data-initialized="handleDataInitialized"
            @error="handleError"
          />

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

          <!-- Table View -->
          <ScheduleTableView
            v-if="initialized && !isLoading"
            :selected-table-id="storeValues?.selectedTableId || ''"
            :current-table="currentTableConfig"
            :is-initialized="initialized"
            :table-name="storeValues?.tableName || ''"
            :current-table-id="storeValues?.currentTableId || ''"
            :table-key="storeValues?.tableKey || '0'"
            :loading-error="error"
            :merged-table-columns="storeValues?.mergedTableColumns || []"
            :merged-detail-columns="storeValues?.mergedDetailColumns || []"
            :available-parent-parameters="availableParentParameters"
            :available-child-parameters="availableChildParameters"
            :schedule-data="storeValues?.scheduleData || []"
            :evaluated-data="storeValues?.evaluatedData || []"
            :table-data="storeValues?.tableData || []"
            :is-loading="isLoading"
            :is-loading-additional-data="isUpdating"
            :no-categories-selected="!hasSelectedCategories"
            :selected-parent-categories="selectedParentCategories"
            :selected-child-categories="selectedChildCategories"
            @update:both-columns="handleBothColumnsUpdate"
            @table-updated="handleTableDataUpdate"
            @column-visibility-change="handleColumnVisibilityChange"
          />

          <!-- Category Filters -->
          <ScheduleCategoryFilters
            v-if="initialized && !isLoading"
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
            v-if="initialized && !isLoading"
            ref="dataComponent"
            :schedule-data="storeValues?.scheduleData || []"
            :evaluated-data="storeValues?.evaluatedData || []"
            :custom-parameters="storeValues?.customParameters || []"
            :merged-table-columns="storeValues?.mergedTableColumns || []"
            :merged-detail-columns="storeValues?.mergedDetailColumns || []"
            :selected-parent-categories="selectedParentCategories"
            :selected-child-categories="selectedChildCategories"
            :is-initialized="initialized"
            @update:table-data="handleTableDataUpdate"
            @error="handleError"
          />

          <!-- Parameter Handling -->
          <ScheduleParameterHandling
            v-if="initialized && !isLoading"
            ref="parameterComponent"
            :schedule-data="storeValues?.scheduleData || []"
            :custom-parameters="storeValues?.customParameters || []"
            :selected-parent-categories="selectedParentCategories"
            :selected-child-categories="selectedChildCategories"
            :available-headers="processedHeaders"
            :is-initialized="initialized"
            @update:parameter-columns="handleParameterColumnsUpdate"
            @update:evaluated-data="handleEvaluatedDataUpdate"
            @update:merged-parent-parameters="handleMergedParentParametersUpdate"
            @update:merged-child-parameters="handleMergedChildParametersUpdate"
            @error="handleError"
          />

          <!-- Column Management -->
          <ScheduleColumnManagement
            v-if="initialized && !isLoading"
            ref="columnComponent"
            :current-table-columns="storeValues?.currentTableColumns || []"
            :current-detail-columns="storeValues?.currentDetailColumns || []"
            :parameter-columns="storeValues?.parameterColumns || []"
            :is-initialized="initialized"
            @update:merged-table-columns="handleMergedTableColumnsUpdate"
            @update:merged-detail-columns="handleMergedDetailColumnsUpdate"
            @column-visibility-change="handleColumnVisibilityChange"
            @column-order-change="handleColumnOrderChange"
            @error="handleError"
          />

          <!-- Parameter Manager Modal -->
          <ScheduleParameterManagerModal
            v-if="initialized && !isLoading && showParameterManager"
            v-model:show="showParameterManager"
            :table-id="storeValues?.currentTableId || ''"
            @update="handleParameterUpdate"
            @update:visibility="handleParameterVisibility"
            @update:order="handleParameterOrder"
          />
        </div>
      </template>
    </template>

    <template #header>
      <ScheduleHeader
        v-if="initialized && !isLoading"
        :selected-table-id="storeValues?.selectedTableId || ''"
        :table-name="storeValues?.tableName || ''"
        :tables="storeValues?.tablesArray || []"
        :show-category-options="showCategoryOptions"
        :has-changes="hasChanges"
        @update:selected-table-id="handleSelectedTableIdUpdate"
        @update:table-name="handleTableNameUpdate"
        @table-change="handleTableChange"
        @save="handleSaveTable"
        @manage-parameters="showParameterManager = true"
        @toggle-category-options="showCategoryOptions = !showCategoryOptions"
      />
    </template>
  </ViewerLayoutPanel>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount, onMounted } from 'vue'
import { debug, DebugCategories } from './utils/debug'
import { useInjectedViewerState } from '~~/lib/viewer/composables/setup'
import { useScheduleValues } from './composables/useScheduleValues'
import { useScheduleFlow } from './composables/useScheduleFlow'
import { useProcessedHeaders } from './composables/useProcessedHeaders'
import { useElementsData } from './composables/useElementsData'
import { useScheduleState } from './composables/useScheduleState'
import { useScheduleEmits } from './composables/useScheduleEmits'
import { parentCategories, childCategories } from './config/categories'
import scheduleStore from './composables/useScheduleStore'
import { defaultTable } from './config/defaultColumns'
import { useBIMElements } from './composables/useBIMElements'

// Types
import type {
  ScheduleDataManagementExposed,
  ScheduleParameterHandlingExposed,
  ScheduleColumnManagementExposed,
  ScheduleInitializationInstance,
  TreeItemComponentModel
} from './types'
import type { NamedTableConfig } from '~/composables/useUserSettings'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'

// Components
import ScheduleHeader from './components/ScheduleTableHeader.vue'
import ScheduleInitialization from './components/ScheduleInitialization.vue'
import ScheduleDataManagement from './components/ScheduleDataManagement.vue'
import ScheduleParameterHandling from './components/ScheduleParameterHandling.vue'
import ScheduleColumnManagement from './components/ScheduleColumnManagement.vue'
import ScheduleParameterManagerModal from './components/ScheduleParameterManagerModal.vue'
import ScheduleCategoryFilters from './components/ScheduleCategoryFilters.vue'
import BIMDebugView from './components/BIMDebugView.vue'
import { ScheduleTableView } from './components/table'

// Define parameter types
interface CustomParameter {
  id: string
  type: 'fixed' | 'equation'
  name: string
  field: string
  header: string
  [key: string]: unknown
}

// Get viewer state from parent
const viewerState = useInjectedViewerState()

// Initialize refs
const showCategoryOptions = ref(false)
const showParameterManager = ref(false)
const initialized = ref(false)
const error = ref<Error | null>(null)
const viewerContainer = ref<HTMLElement | null>(null)
const selectedParentCategories = ref<string[]>(
  defaultTable.categoryFilters.selectedParentCategories
)
const selectedChildCategories = ref<string[]>(
  defaultTable.categoryFilters.selectedChildCategories
)

// Component refs
const initComponent = ref<ScheduleInitializationInstance | null>(null)
const dataComponent = ref<ScheduleDataManagementExposed | null>(null)
const parameterComponent = ref<ScheduleParameterHandlingExposed | null>(null)
const columnComponent = ref<ScheduleColumnManagementExposed | null>(null)

// Emits
const emit = defineEmits<{
  close: []
}>()

// Initialize composables
const { handleClose } = useScheduleEmits({ emit })

const storeValues = useScheduleValues()

const { rawTreeNodes, initializeElements } = useBIMElements()

const elementsData = useElementsData({
  selectedParentCategories,
  selectedChildCategories
})

const { tableConfig } = useScheduleFlow({
  currentTable: computed(() => defaultTable)
})

const currentTableConfig = computed<NamedTableConfig | null>(() =>
  tableConfig.value ? { ...tableConfig.value } : null
)

const scheduleState = useScheduleState({
  selectedParentCategories,
  selectedChildCategories,
  currentTable: currentTableConfig
})

// Loading state
const isLoading = computed(() => elementsData.isLoading.value)
const isUpdating = computed(
  () => scheduleState.processingState.value.isProcessingElements
)
const hasSelectedCategories = computed(
  () =>
    selectedParentCategories.value.length > 0 ||
    selectedChildCategories.value.length > 0
)
const hasChanges = computed(() => false) // TODO: Implement change tracking

// Process headers
const { processedHeaders } = useProcessedHeaders({
  headers: computed(() => {
    try {
      return scheduleStore.availableHeaders.value
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to get headers:', err)
      return { parent: [], child: [] }
    }
  })
})

// Parameter handling
const availableParentParameters = computed(() => {
  const params = storeValues?.customParameters
  if (!Array.isArray(params)) return []

  return params
    .filter((param): param is CustomParameter => {
      if (!param || typeof param !== 'object') return false
      const p = param as Partial<CustomParameter>
      return (
        typeof p.id === 'string' &&
        typeof p.type === 'string' &&
        typeof p.name === 'string' &&
        typeof p.field === 'string' &&
        typeof p.header === 'string'
      )
    })
    .filter((param) => param.type === 'fixed')
    .map((param) => ({
      ...param,
      header: param.name
    }))
})

const availableChildParameters = computed(() => {
  const params = storeValues?.customParameters
  if (!Array.isArray(params)) return []

  return params
    .filter((param): param is CustomParameter => {
      if (!param || typeof param !== 'object') return false
      const p = param as Partial<CustomParameter>
      return (
        typeof p.id === 'string' &&
        typeof p.type === 'string' &&
        typeof p.name === 'string' &&
        typeof p.field === 'string' &&
        typeof p.header === 'string'
      )
    })
    .filter((param) => param.type === 'equation')
    .map((param) => ({
      ...param,
      header: param.name
    }))
})

// Debounced store initialization
const debouncedInit = (() => {
  let timeout: NodeJS.Timeout | null = null
  return () => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => {
      scheduleStore.lifecycle.init().catch(handleError)
    }, 100)
  }
})()

// Initialize setup instance
onMounted(async () => {
  try {
    debug.log(DebugCategories.INITIALIZATION, 'Mounting Schedules component')

    // Initialize store first
    await scheduleStore.lifecycle.init()

    // Process BIM data that's already loaded by viewer
    await elementsData.initializeData()

    // Process data to ensure parameters are handled
    await scheduleStore.processData()

    // Set initialized after everything is ready
    initialized.value = true
    scheduleStore.setInitialized(true)

    debug.log(DebugCategories.INITIALIZATION, 'Schedules component mounted', {
      storeInitialized: scheduleStore.initialized.value,
      dataLength: scheduleStore.scheduleData.value.length,
      columnsLength: scheduleStore.mergedTableColumns.value.length
    })
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Schedules initialization failed:', err)
    handleError(err)
  }
})

// Handler functions
async function handleTableDataUpdate() {
  try {
    await debouncedInit()
  } catch (err) {
    handleError(err)
  }
}

async function handleRetry() {
  try {
    error.value = null
    initialized.value = false
    await elementsData.initializeData()
    initialized.value = true
  } catch (err) {
    handleError(err)
  }
}

async function handleParameterColumnsUpdate() {
  try {
    await scheduleStore.processData()
    debouncedInit()
  } catch (err) {
    handleError(err)
  }
}

// Add missing functions
async function loadSettings() {
  debug.log(DebugCategories.INITIALIZATION, 'Loading settings')
  // Settings are loaded from store initialization
  await scheduleStore.lifecycle.init()
}

async function handleTableSelection(id: string) {
  debug.log(DebugCategories.INITIALIZATION, 'Handling table selection:', id)
  try {
    scheduleStore.setTableInfo({ selectedTableId: id })
    await debouncedInit()
  } catch (err) {
    handleError(err)
  }
}

async function updateRootNodes(nodes: TreeItemComponentModel[]) {
  debug.log(DebugCategories.INITIALIZATION, 'Updating root nodes:', {
    nodeCount: nodes.length
  })
  // Root nodes are managed by useBIMElements
  await initializeElements()
}

function handleMergedParentParametersUpdate() {
  debouncedInit()
}

function handleMergedChildParametersUpdate() {
  debouncedInit()
}

function handleMergedTableColumnsUpdate() {
  debouncedInit()
}

function handleMergedDetailColumnsUpdate() {
  debouncedInit()
}

function handleSelectedTableIdUpdate(value: string) {
  try {
    scheduleStore.setTableInfo({ selectedTableId: value })
  } catch (err) {
    handleError(err)
  }
}

function handleTableNameUpdate(value: string) {
  try {
    scheduleStore.setTableInfo({ tableName: value })
  } catch (err) {
    handleError(err)
  }
}

function handleColumnVisibilityChange() {
  debouncedInit()
}

function handleColumnOrderChange() {
  debouncedInit()
}

function handleParameterVisibility() {
  debouncedInit()
}

function handleParameterOrder() {
  debouncedInit()
}

async function handleEvaluatedDataUpdate() {
  try {
    await scheduleStore.processData()
    debouncedInit()
  } catch (err) {
    handleError(err)
  }
}

async function handleParameterUpdate() {
  try {
    await debouncedInit()
    showParameterManager.value = false
  } catch (err) {
    handleError(err)
  }
}

async function handleTableChange() {
  try {
    await debouncedInit()
  } catch (err) {
    handleError(err)
  }
}

async function handleSaveTable() {
  try {
    await debouncedInit()
  } catch (err) {
    handleError(err)
  }
}

async function handleBothColumnsUpdate(updates: {
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
}) {
  try {
    await scheduleStore.setMergedColumns(updates.parentColumns, updates.childColumns)
    await debouncedInit()
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
    handleError(err)
  }
}

// Add missing handlers
function handleSettingsLoaded(settings: {
  namedTables: Record<string, NamedTableConfig>
}) {
  debug.log(DebugCategories.INITIALIZATION, 'Settings loaded', { settings })
}

function handleDataInitialized() {
  debug.log(DebugCategories.INITIALIZATION, 'Data initialized')
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
</style>
