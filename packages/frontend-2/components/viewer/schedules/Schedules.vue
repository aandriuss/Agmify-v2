<template>
  <div>
    <LayoutPanel :initial-width="400" @close="handleClose">
      <template #header>
        <ScheduleHeader
          :selected-table-id="selectedTableId"
          :table-name="tableName"
          :tables="tablesArray"
          :show-category-options="showCategoryOptions"
          :has-changes="hasChanges"
          @update:selected-table-id="handleSelectedTableIdUpdate"
          @update:table-name="handleTableNameUpdate"
          @table-change="handleTableChangeInternal"
          @save="handleSaveTable"
          @manage-parameters="toggleParameterManager"
          @toggle-category-options="toggleCategoryOptions"
        />
      </template>

      <div class="flex flex-col">
        <!-- Error Alert -->
        <ScheduleErrorAlert :error="error" @recovery-action="handleRecoveryAction" />

        <!-- Category Filters -->
        <ScheduleCategoryFilters
          :show-category-options="showCategoryOptions"
          :parent-categories="parentCategories"
          :child-categories="childCategories"
          :selected-parent-categories="selectedParentCategories"
          :selected-child-categories="selectedChildCategories"
          :is-updating="isUpdating"
          @toggle-category="handleCategoryToggle"
        />

        <!-- Core Components -->
        <ScheduleInitialization
          ref="initComponent"
          v-model:initialized="initialized"
          @settings-loaded="handleSettingsLoaded"
          @data-initialized="handleDataInitialized"
          @error="handleError"
        />

        <ScheduleDataManagement
          v-if="initialized"
          ref="dataComponent"
          :schedule-data="state.scheduleData"
          :evaluated-data="state.evaluatedData"
          :custom-parameters="state.customParameters"
          :merged-table-columns="state.mergedTableColumns"
          :merged-detail-columns="state.mergedDetailColumns"
          :selected-parent-categories="selectedParentCategories"
          :selected-child-categories="selectedChildCategories"
          :is-initialized="initialized"
          @update:table-data="handleTableDataUpdate"
          @error="handleError"
        />

        <ScheduleParameterHandling
          v-if="initialized"
          ref="parameterComponent"
          :schedule-data="state.scheduleData"
          :custom-parameters="state.customParameters"
          :selected-parent-categories="selectedParentCategories"
          :selected-child-categories="selectedChildCategories"
          :available-headers="state.availableHeaders"
          :is-initialized="initialized"
          @update:parameter-columns="handleParameterColumnsUpdate"
          @update:evaluated-data="handleEvaluatedDataUpdate"
          @update:merged-parent-parameters="handleMergedParentParametersUpdate"
          @update:merged-child-parameters="handleMergedChildParametersUpdate"
          @error="handleError"
        />

        <ScheduleColumnManagement
          v-if="initialized"
          ref="columnComponent"
          :current-table-columns="state.currentTableColumns"
          :current-detail-columns="state.currentDetailColumns"
          :parameter-columns="state.parameterColumns"
          :is-initialized="initialized"
          @update:merged-table-columns="handleMergedTableColumnsUpdate"
          @update:merged-detail-columns="handleMergedDetailColumnsUpdate"
          @column-visibility-change="handleColumnVisibilityChange"
          @column-order-change="handleColumnOrderChange"
          @error="handleError"
        />

        <!-- Table Content -->
        <ScheduleTableContent
          :selected-table-id="selectedTableId"
          :current-table="currentTable"
          :is-initialized="initialized"
          :table-data="state.tableData"
          :schedule-data="state.scheduleData"
          :table-name="tableName"
          :current-table-id="currentTableId"
          :table-key="tableKey"
          :loading-error="error"
          :merged-table-columns="state.mergedTableColumns"
          :merged-detail-columns="state.mergedDetailColumns"
          :merged-parent-parameters="state.mergedParentParameters"
          :merged-child-parameters="state.mergedChildParameters"
          @update:both-columns="handleBothColumnsUpdate"
          @table-updated="handleTableUpdate"
          @column-visibility-change="handleColumnVisibilityChange"
          @visibility-change="updateVisibility"
        />

        <BIMDebugView
          v-if="initialized"
          :selected-parent-categories="selectedParentCategories"
          :selected-child-categories="selectedChildCategories"
          :raw-elements="debugRawElements"
          :parent-elements="debugParentElements"
          :child-elements="debugChildElements"
          :matched-elements="debugMatchedElements"
          :orphaned-elements="debugOrphanedElements"
        />

        <!-- Parameter Manager Modal -->
        <ScheduleParameterManagerModal
          v-model:show="showParameterManager"
          :table-id="currentTableId"
          @update="handleParameterUpdate"
          @update:visibility="updateParameterVisibility"
          @update:order="updateParameterOrder"
        />
      </div>
    </LayoutPanel>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { LayoutPanel } from '@speckle/ui-components'
import { debug, DebugCategories } from './utils/debug'
import type {
  ElementData,
  ScheduleDataManagementExposed,
  ScheduleParameterHandlingExposed,
  ScheduleColumnManagementExposed,
  TableRowData,
  ScheduleInitializationInstance,
  TreeItemComponentModel
} from './types'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import type { CustomParameter, NamedTableConfig } from '~/composables/useUserSettings'

// Composables
import { useScheduleState } from './composables/useScheduleState'
import { useParameterHandling } from './composables/useParameterHandling'
import { useColumnManagement } from './composables/useColumnManagement'
import { useDataTransformation } from './composables/useDataTransformation'
import { useScheduleInitialization } from './composables/useScheduleInitialization'
import { useScheduleInitializationFlow } from './composables/useScheduleInitializationFlow'
import { useScheduleWatchers } from './composables/useScheduleWatchers'
import { useScheduleUIState } from './composables/useScheduleUIState'
import { useScheduleEmits } from './composables/useScheduleEmits'
import { useUserSettings } from '~/composables/useUserSettings'
import { parentCategories, childCategories } from './config/categories'
import { useScheduleSetup } from './composables/useScheduleSetup'

// Components
import ScheduleErrorAlert from './components/ScheduleErrorAlert.vue'
import ScheduleHeader from './components/ScheduleHeader.vue'
import ScheduleTableContent from './components/ScheduleTableContent.vue'
import ScheduleParameterManagerModal from './components/ScheduleParameterManagerModal.vue'
import ScheduleInitialization from './components/ScheduleInitialization.vue'
import ScheduleDataManagement from './components/ScheduleDataManagement.vue'
import ScheduleParameterHandling from './components/ScheduleParameterHandling.vue'
import ScheduleColumnManagement from './components/ScheduleColumnManagement.vue'
import ScheduleCategoryFilters from './components/ScheduleCategoryFilters.vue'
import BIMDebugView from './components/BIMDebugView.vue'

// Component refs
const initComponent = ref<ScheduleInitializationInstance | null>(null)
const dataComponent = ref<ScheduleDataManagementExposed | null>(null)
const parameterComponent = ref<ScheduleParameterHandlingExposed | null>(null)
const columnComponent = ref<ScheduleColumnManagementExposed | null>(null)

// State management
const error = ref<Error | null>(null)
const showParameterManager = ref(false)

// Error handling
function handleError(err: Error | unknown) {
  const errorValue = err instanceof Error ? err : new Error(String(err))
  error.value = errorValue
  debug.error(DebugCategories.ERROR, 'Schedule error:', errorValue)
}

// Emits
const emit = defineEmits<{
  close: []
}>()

const { handleClose } = useScheduleEmits({ emit })

// Initialize core state management
const {
  state,
  initialized,
  updateTableData,
  updateEvaluatedData,
  updateParameterColumns,
  updateMergedParameters,
  updateMergedColumns,
  updateCurrentColumns
} = useScheduleState()

const { loadSettings, settings } = useUserSettings()
const { initializeData, waitForData } = useScheduleInitialization()

// Initialize schedule setup
const {
  elementsData,
  availableHeaders,
  debugRawElements,
  debugParentElements,
  debugChildElements,
  debugMatchedElements,
  debugOrphanedElements,
  initializeElementsData,
  stopWorldTreeWatch,
  selectedParentCategories,
  selectedChildCategories,
  isUpdating,
  toggleCategory,
  handleTableChangeInternal,
  handleSaveTable,
  handleBothColumnsUpdate,
  hasChanges,
  selectedTableId,
  tableName,
  currentTableId,
  currentTable,
  tableKey,
  tablesArray
} = useScheduleSetup({
  initComponent,
  handleError,
  state,
  settings,
  updateCurrentColumns
})

// Watch for changes in elementsData and update state
watch(
  () => elementsData.value,
  (newData) => {
    state.scheduleData = newData
    state.availableHeaders = availableHeaders.value
    logDebugInfo()
  },
  { immediate: true }
)

const rootNodes = ref<TreeItemComponentModel[]>([])

function handleSelectedTableIdUpdate(value: string) {
  selectedTableId.value = value
}

function handleTableNameUpdate(value: string) {
  tableName.value = value
}

function handleCategoryToggle(type: 'parent' | 'child', category: string) {
  try {
    debug.log(DebugCategories.CATEGORIES, 'Category toggle requested', {
      type,
      category,
      currentState: {
        parent: selectedParentCategories.value,
        child: selectedChildCategories.value
      }
    })

    toggleCategory(type, category)

    debug.log(DebugCategories.CATEGORIES, 'Category toggle completed', {
      newState: {
        parent: selectedParentCategories.value,
        child: selectedChildCategories.value
      }
    })
  } catch (err) {
    handleError(err)
  }
}

function logDebugInfo() {
  debug.log(DebugCategories.INITIALIZATION, 'BIM Schedule Debug Info', {
    allElements: debugRawElements.value,
    parents: debugParentElements.value,
    children: debugChildElements.value,
    matched: debugMatchedElements.value,
    orphaned: debugOrphanedElements.value
  })
}

const { initialize } = useScheduleInitializationFlow({
  initializeData,
  updateRootNodes: async (nodes) => {
    rootNodes.value = nodes
    await initializeElementsData()
    await new Promise((resolve) => setTimeout(resolve, 0))
  },
  waitForData,
  loadSettings,
  handleTableSelection: async (id: string) => {
    if (initComponent.value) {
      await initComponent.value.handleTableSelection(id)
    }
  },
  currentTable: computed(() => currentTable.value),
  selectedTableId: computed(() => selectedTableId.value),
  currentTableId: computed(() => currentTableId.value),
  loadingError: error,
  scheduleData: computed(() => state.scheduleData),
  rootNodes: computed(() => rootNodes.value),
  isInitialized: initialized,
  selectedParentCategories,
  selectedChildCategories
})

const { updateParameterVisibility, updateParameterOrder } = useParameterHandling({
  state: {
    scheduleData: state.scheduleData,
    customParameters: state.customParameters,
    parameterColumns: state.parameterColumns,
    mergedParentParameters: state.mergedParentParameters,
    mergedChildParameters: state.mergedChildParameters
  },
  selectedParentCategories: computed(() => selectedParentCategories.value),
  selectedChildCategories: computed(() => selectedChildCategories.value),
  updateParameterColumns,
  updateMergedParameters,
  handleError
})

const { handleColumnVisibilityChange, handleColumnOrderChange } = useColumnManagement({
  state,
  updateMergedColumns,
  updateCurrentColumns,
  handleError
})

const { processData, updateVisibility } = useDataTransformation({
  state: {
    scheduleData: state.scheduleData,
    evaluatedData: state.evaluatedData,
    tableData: state.tableData,
    customParameters: state.customParameters,
    mergedTableColumns: state.mergedTableColumns,
    mergedDetailColumns: state.mergedDetailColumns
  },
  selectedParentCategories: computed(() => selectedParentCategories.value),
  selectedChildCategories: computed(() => selectedChildCategories.value),
  updateTableData,
  updateEvaluatedData,
  handleError
})

// UI State
const { showCategoryOptions, toggleCategoryOptions, toggleParameterManager } =
  useScheduleUIState()

// Initialize watchers
const { stopWatchers } = useScheduleWatchers({
  currentTable: computed(() => currentTable.value),
  scheduleData: computed(() => state.scheduleData),
  tableData: computed(() => state.tableData),
  mergedTableColumns: computed(() => state.mergedTableColumns),
  mergedDetailColumns: computed(() => state.mergedDetailColumns),
  customParameters: computed(() => state.customParameters),
  parameterColumns: computed(() => state.parameterColumns),
  evaluatedData: computed(() => state.evaluatedData),
  availableHeaders: computed(() => state.availableHeaders),
  mergedParentParameters: computed(() => state.mergedParentParameters),
  mergedChildParameters: computed(() => state.mergedChildParameters),
  selectedParentCategories,
  selectedChildCategories,
  settings,
  tablesArray: computed(() => tablesArray.value),
  tableName: computed(() => tableName.value),
  selectedTableId: computed(() => selectedTableId.value),
  currentTableId: computed(() => currentTableId.value),
  tableKey: computed(() => tableKey.value),
  showCategoryOptions: ref(false),
  showParameterManager,
  loadingError: error
})

function handleSettingsLoaded(settings: {
  namedTables: Record<string, NamedTableConfig>
}) {
  debug.log(DebugCategories.INITIALIZATION, 'Settings loaded', { settings })
}

function handleDataInitialized() {
  debug.log(DebugCategories.INITIALIZATION, 'Data initialized')
}

function handleTableDataUpdate(data: TableRowData[]) {
  updateTableData(data)
}

function handleParameterColumnsUpdate(columns: ColumnDef[]) {
  updateParameterColumns(columns)
}

function handleEvaluatedDataUpdate(data: ElementData[]) {
  updateEvaluatedData(data)
}

function handleMergedParentParametersUpdate(params: CustomParameter[]) {
  updateMergedParameters(params, state.mergedChildParameters)
}

function handleMergedChildParametersUpdate(params: CustomParameter[]) {
  updateMergedParameters(state.mergedParentParameters, params)
}

function handleMergedTableColumnsUpdate(columns: ColumnDef[]) {
  updateMergedColumns(columns, state.mergedDetailColumns)
}

function handleMergedDetailColumnsUpdate(columns: ColumnDef[]) {
  updateMergedColumns(state.mergedTableColumns, columns)
}

function handleTableUpdate() {
  tableKey.value = Date.now().toString()
}

async function handleParameterUpdate() {
  await processData()
  showParameterManager.value = false
}

async function handleRecoveryAction() {
  error.value = null
  if (selectedTableId.value) {
    await handleTableChangeInternal()
  }
}

// Initialize the schedule
onMounted(async () => {
  try {
    await loadSettings()
    await initializeElementsData()
    await initialize()
  } catch (err) {
    handleError(err)
  }
})

// Clean up watchers
onBeforeUnmount(() => {
  stopWatchers()
  stopWorldTreeWatch()
})

// Expose necessary functions
defineExpose({
  handleError,
  handleParameterUpdate,
  handleRecoveryAction,
  handleBothColumnsUpdate,
  handleTableUpdate,
  handleTableDataUpdate,
  handleCategoryToggle
})
</script>

<style scoped>
.flex {
  display: flex;
}

.flex-col {
  flex-direction: column;
}
</style>
