<template>
  <div>
    <ViewerLayoutPanel :initial-width="400" @close="handleClose">
      <template
        v-if="isViewerInitialized && initComponent?.state?.value.isInitialized"
        #header
      >
        <ScheduleHeader
          :selected-table-id="unref(storeValues.selectedTableId)"
          :table-name="unref(storeValues.tableName)"
          :tables="unref(storeValues.tablesArray)"
          :show-category-options="showCategoryOptions"
          :has-changes="!!setup?.hasChanges"
          @update:selected-table-id="handleSelectedTableIdUpdate"
          @update:table-name="handleTableNameUpdate"
          @table-change="setup?.handleTableChangeInternal"
          @save="setup?.handleSaveTable"
          @manage-parameters="showParameterManager = true"
          @toggle-category-options="showCategoryOptions = !showCategoryOptions"
        />
      </template>

      <div
        ref="viewerContainer"
        class="viewer-container"
        style="width: 100%; height: 100%; min-height: 400px"
      >
        <!-- Loading State -->
        <div
          v-if="!isViewerInitialized || initComponent?.state?.value.isLoading"
          class="flex flex-col p-4"
        >
          <div class="text-gray-500">Initializing viewer...</div>
        </div>

        <!-- Error State -->
        <div v-else-if="initComponent?.state?.value.error" class="flex flex-col p-4">
          <div class="text-red-500">
            {{ initComponent.state.value.error.message }}
          </div>
          <div v-if="initComponent.state.value.error.recoverable" class="mt-2">
            <button
              class="px-4 py-2 bg-blue-500 text-white rounded hover-bg-blue-600"
              @click="initComponent.handleRetry"
            >
              Retry
            </button>
          </div>
        </div>

        <!-- Content -->
        <div
          v-else-if="initComponent?.state?.value.isInitialized"
          class="flex flex-col"
        >
          <!-- Core Components -->
          <ScheduleInitialization
            ref="initComponent"
            v-model:initialized="initialized"
            @settings-loaded="handleSettingsLoaded"
            @data-initialized="handleDataInitialized"
            @error="handleError"
          />

          <template v-if="initialized">
            <!-- Category Filters -->
            <ScheduleCategoryFilters
              :show-category-options="showCategoryOptions"
              :parent-categories="parentCategories"
              :child-categories="childCategories"
              :selected-parent-categories="selectedParentCategoriesComputed"
              :selected-child-categories="selectedChildCategoriesComputed"
              :is-updating="!!setup?.isUpdating"
              @toggle-category="setup?.toggleCategory"
            />

            <!-- Data Management -->
            <ScheduleDataManagement
              ref="dataComponent"
              :schedule-data="unref(storeValues.scheduleData)"
              :evaluated-data="unref(storeValues.evaluatedData)"
              :custom-parameters="unref(storeValues.customParameters)"
              :merged-table-columns="unref(storeValues.mergedTableColumns)"
              :merged-detail-columns="unref(storeValues.mergedDetailColumns)"
              :selected-parent-categories="unref(selectedParentCategoriesComputed)"
              :selected-child-categories="unref(selectedChildCategoriesComputed)"
              :is-initialized="initialized"
              @update:table-data="handleTableDataUpdate"
              @error="handleError"
            />

            <!-- Parameter Handling -->
            <ScheduleParameterHandling
              ref="parameterComponent"
              :schedule-data="unref(storeValues.scheduleData)"
              :custom-parameters="unref(storeValues.customParameters)"
              :selected-parent-categories="unref(selectedParentCategoriesComputed)"
              :selected-child-categories="unref(selectedChildCategoriesComputed)"
              :available-headers="unref(processedHeaders)"
              :is-initialized="initialized"
              @update:parameter-columns="handleParameterColumnsUpdate"
              @update:evaluated-data="handleEvaluatedDataUpdate"
              @update:merged-parent-parameters="handleMergedParentParametersUpdate"
              @update:merged-child-parameters="handleMergedChildParametersUpdate"
              @error="handleError"
            />

            <!-- Column Management -->
            <ScheduleColumnManagement
              ref="columnComponent"
              :current-table-columns="unref(storeValues.currentTableColumns)"
              :current-detail-columns="unref(storeValues.currentDetailColumns)"
              :parameter-columns="unref(storeValues.parameterColumns)"
              :is-initialized="initialized"
              @update:merged-table-columns="handleMergedTableColumnsUpdate"
              @update:merged-detail-columns="handleMergedDetailColumnsUpdate"
              @column-visibility-change="handleColumnVisibilityChange"
              @column-order-change="handleColumnOrderChange"
              @error="handleError"
            />

            <!-- Table View -->
            <ScheduleTableView
              :selected-table-id="unref(storeValues.selectedTableId)"
              :current-table="unref(currentTableConfig)"
              :is-initialized="initialized"
              :table-name="unref(storeValues.tableName)"
              :current-table-id="unref(storeValues.currentTableId)"
              :table-key="unref(storeValues.tableKey)"
              :loading-error="error"
              :merged-table-columns="unref(storeValues.mergedTableColumns)"
              :merged-detail-columns="unref(storeValues.mergedDetailColumns)"
              :available-parent-parameters="unref(availableParentParameters)"
              :available-child-parameters="unref(availableChildParameters)"
              :schedule-data="unref(storeValues.scheduleData)"
              :evaluated-data="unref(storeValues.evaluatedData)"
              :table-data="unref(storeValues.tableData)"
              :is-loading="!initialized"
              :is-loading-additional-data="!!setup?.isUpdating"
              :no-categories-selected="!selectedParentCategoriesComputed.length"
              @update:both-columns="setup?.handleBothColumnsUpdate"
              @table-updated="handleTableDataUpdate"
              @column-visibility-change="handleColumnVisibilityChange"
            />

            <!-- Debug View -->
            <BIMDebugView
              :selected-parent-categories="unref(selectedParentCategoriesComputed)"
              :selected-child-categories="unref(selectedChildCategoriesComputed)"
              :raw-elements="setup?.debugRawElements || []"
              :parent-elements="setup?.debugParentElements || []"
              :child-elements="setup?.debugChildElements || []"
              :matched-elements="setup?.debugMatchedElements || []"
              :orphaned-elements="setup?.debugOrphanedElements || []"
            />

            <!-- Parameter Manager Modal -->
            <ScheduleParameterManagerModal
              v-model:show="showParameterManager"
              :table-id="unref(storeValues.currentTableId)"
              @update="handleParameterUpdate"
              @update:visibility="handleParameterVisibility"
              @update:order="handleParameterOrder"
            />
          </template>
        </div>
      </div>
    </ViewerLayoutPanel>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { debug, DebugCategories } from './utils/debug'
import { useInjectedViewerState } from '~~/lib/viewer/composables/setup'
import { InitializationError } from './core/composables/useScheduleInitializationFlow'
import type { ScheduleSetup } from './composables/useScheduleSetup'

// Types
import type {
  ScheduleDataManagementExposed,
  ScheduleParameterHandlingExposed,
  ScheduleColumnManagementExposed,
  ScheduleInitializationInstance
} from './types'
import type { NamedTableConfig } from '~/composables/useUserSettings'

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

// Composables
import { parentCategories, childCategories } from './config/categories'
import scheduleStore from './composables/useScheduleStore'
import { useScheduleValues } from './composables/useScheduleValues'
import { useScheduleFlow } from './composables/useScheduleFlow'
import { useProcessedHeaders } from './composables/useProcessedHeaders'
import { useScheduleEmits } from './composables/useScheduleEmits'

// Initialize refs
const setup = ref<ScheduleSetup | null>(null)
const isViewerInitialized = ref(false)
const showCategoryOptions = ref(false)
const showParameterManager = ref(false)
const initialized = ref(false)
const error = ref<Error | null>(null)
const viewerContainer = ref<HTMLElement | null>(null)

// Component refs
const initComponent = ref<ScheduleInitializationInstance | null>(null)
const dataComponent = ref<ScheduleDataManagementExposed | null>(null)
const parameterComponent = ref<ScheduleParameterHandlingExposed | null>(null)
const columnComponent = ref<ScheduleColumnManagementExposed | null>(null)

// Get viewer state from parent
const state = useInjectedViewerState()

// Initialize store values after getting state
const storeValues = useScheduleValues()

// Initialize store with project ID if available
watch(
  () => state?.projectId?.value,
  (projectId) => {
    if (projectId) {
      scheduleStore.setProjectId(projectId)
    }
  },
  { immediate: true }
)

// Computed properties
const selectedParentCategoriesComputed = computed<string[]>(() => {
  const setupRef = setup.value
  const categories = setupRef?.selectedParentCategories
  if (!categories) return []
  if (Array.isArray(categories)) return [...categories]
  return Array.isArray(categories.value) ? [...categories.value] : []
})

const selectedChildCategoriesComputed = computed<string[]>(() => {
  const setupRef = setup.value
  const categories = setupRef?.selectedChildCategories
  if (!categories) return []
  if (Array.isArray(categories)) return [...categories]
  return Array.isArray(categories.value) ? [...categories.value] : []
})

const currentTableComputed = computed<NamedTableConfig | null>(() => {
  const setupRef = setup.value
  const table = setupRef?.currentTable
  if (!table) return null
  return table.value || null
})

// Flow management
const { tableConfig } = useScheduleFlow({
  currentTable: currentTableComputed
})

const currentTableConfig = computed<NamedTableConfig | null>(
  () => tableConfig.value || null
)

// Process headers
const { processedHeaders } = useProcessedHeaders({
  headers: scheduleStore.availableHeaders
})

// Parameter handling
const availableParentParameters = computed(() => {
  const params = storeValues.customParameters.value || []
  return params
    .filter((param) => param.type === 'fixed')
    .map((param) => ({
      ...param,
      header: param.name
    }))
})

const availableChildParameters = computed(() => {
  const params = storeValues.customParameters.value || []
  return params
    .filter((param) => param.type === 'equation')
    .map((param) => ({
      ...param,
      header: param.name
    }))
})

// Emits
const emit = defineEmits<{
  close: []
}>()

const { handleClose } = useScheduleEmits({ emit })

// Handler functions
function handleSettingsLoaded(settings: {
  namedTables: Record<string, NamedTableConfig>
}) {
  debug.log(DebugCategories.INITIALIZATION, 'Settings loaded', { settings })
}

function handleDataInitialized() {
  debug.log(DebugCategories.INITIALIZATION, 'Data initialized')
  initialized.value = true
}

function handleTableDataUpdate() {
  scheduleStore.lifecycle.init()
}

function handleParameterColumnsUpdate() {
  scheduleStore.lifecycle.init()
}

function handleEvaluatedDataUpdate() {
  scheduleStore.lifecycle.init()
}

function handleMergedParentParametersUpdate() {
  scheduleStore.lifecycle.init()
}

function handleMergedChildParametersUpdate() {
  scheduleStore.lifecycle.init()
}

function handleMergedTableColumnsUpdate() {
  scheduleStore.lifecycle.init()
}

function handleMergedDetailColumnsUpdate() {
  scheduleStore.lifecycle.init()
}

function handleSelectedTableIdUpdate(value: string) {
  scheduleStore.setTableInfo({ selectedTableId: value })
}

function handleTableNameUpdate(value: string) {
  scheduleStore.setTableInfo({ tableName: value })
}

function handleColumnVisibilityChange() {
  scheduleStore.lifecycle.init()
}

function handleColumnOrderChange() {
  scheduleStore.lifecycle.init()
}

function handleParameterVisibility() {
  scheduleStore.lifecycle.init()
}

function handleParameterOrder() {
  scheduleStore.lifecycle.init()
}

async function handleParameterUpdate() {
  await scheduleStore.lifecycle.init()
  showParameterManager.value = false
}

// Initialize setup instance
onMounted(async () => {
  try {
    // Initialize store first
    await scheduleStore.lifecycle.init()

    // Create waitForInitialization function
    const waitForInitialization = async () => {
      if (!state?.viewer?.init?.ref?.value) {
        await new Promise<void>((resolve) => {
          const unwatch = watch(
            () => state?.viewer?.init?.ref?.value,
            (newVal) => {
              if (newVal) {
                unwatch()
                resolve()
              }
            }
          )
        })
      }
    }

    // Wait for viewer state
    await new Promise<void>((resolve) => {
      if (state?.viewer?.instance) {
        resolve()
        return
      }

      const unwatch = watch(
        () => state?.viewer?.instance,
        (newVal) => {
          if (newVal) {
            unwatch()
            resolve()
          }
        }
      )
    })

    // Wait for viewer initialization
    await waitForInitialization()
    isViewerInitialized.value = true

    // Import dynamically to avoid hooks outside setup
    const { useScheduleSetupInstance } = await import('./composables/useScheduleSetup')

    // Initialize setup instance after store is ready
    setup.value = useScheduleSetupInstance(
      state.viewer.instance,
      isViewerInitialized,
      waitForInitialization,
      state
    )

    // Initialize elements data
    if (setup.value) {
      await setup.value.initializeElementsData()
    }
  } catch (err) {
    handleError(err)
  }
})

// Watch for project ID changes
watch(
  () => state?.projectId?.value,
  async (newId) => {
    if (!newId) return

    debug.log(DebugCategories.INITIALIZATION, 'Project ID changed:', newId)
    if (isViewerInitialized.value) {
      try {
        initialized.value = false
        error.value = null

        // Update store with new project ID first
        scheduleStore.setProjectId(newId)
        await scheduleStore.lifecycle.init()

        // Then update setup
        if (setup.value) {
          await setup.value.initializeElementsData()
        }
      } catch (err) {
        handleError(err)
      }
    }
  }
)

// Clean up
onBeforeUnmount(() => {
  setup.value?.stopWorldTreeWatch()
})

// Error handling
function handleError(err: Error | unknown) {
  const errorValue =
    err instanceof InitializationError ? err : new InitializationError(String(err))
  error.value = errorValue
  debug.error(DebugCategories.ERROR, 'Schedule error:', errorValue)
}

// Expose necessary functions
defineExpose({
  handleError,
  handleParameterUpdate,
  handleBothColumnsUpdate: computed(() => setup.value?.handleBothColumnsUpdate),
  handleTableDataUpdate,
  handleCategoryToggle: computed(() => setup.value?.toggleCategory)
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
