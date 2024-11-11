<template>
  <div>
    <LayoutPanel :initial-width="400" @close="handleClose">
      <template #header>
        <ScheduleHeader
          v-model:selected-table-id="selectedTableId"
          v-model:table-name="tableName"
          :tables="tablesArray"
          :show-category-options="showCategoryOptions"
          @table-change="handleTableChange"
          @save="saveTable"
          @manage-parameters="toggleParameterManager"
          @toggle-category-options="toggleCategoryOptions"
        />
      </template>

      <div class="flex flex-col">
        <!-- Error Alert -->
        <ScheduleErrorAlert
          :error="loadingError"
          @recovery-action="handleRecoveryAction"
        />
        <!-- Category Filters -->
        <ScheduleCategoryFilters
          :show-category-options="showCategoryOptions"
          :parent-categories="availableParentCategories"
          :child-categories="availableChildCategories"
          :selected-parent-categories="selectedParentCategories"
          :selected-child-categories="selectedChildCategories"
          :is-initialized="initialized"
          @toggle-category="toggleCategory"
        />

        <!-- Table Content -->
        <ScheduleTableContent
          :selected-table-id="selectedTableId"
          :current-table="currentTable"
          :is-initialized="initialized"
          :table-data="tableData"
          :schedule-data="scheduleData"
          :table-name="tableName"
          :current-table-id="currentTableId"
          :table-key="tableKey"
          :loading-error="loadingError"
          :merged-table-columns="mergedTableColumns"
          :merged-detail-columns="mergedDetailColumns"
          :merged-parent-parameters="mergedParentParameters"
          :merged-child-parameters="mergedChildParameters"
          @update:both-columns="handleBothColumnsUpdate"
          @table-updated="handleTableUpdate"
          @column-visibility-change="handleColumnVisibilityChange"
        />

        <!-- Parameter Manager Modal -->
        <ScheduleParameterManagerModal
          v-model:show="showParameterManager"
          :table-id="currentTableId"
          @update="handleParameterUpdate"
        />
      </div>
    </LayoutPanel>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { LayoutPanel } from '@speckle/ui-components'

// Components
import ScheduleHeader from './components/ScheduleHeader.vue'
import ScheduleCategoryFilters from './components/ScheduleCategoryFilters.vue'
import ScheduleTableContent from './components/ScheduleTableContent.vue'
import ScheduleErrorAlert from './components/ScheduleErrorAlert.vue'
import ScheduleParameterManagerModal from './components/ScheduleParameterManagerModal.vue'

// Composables
import { useUserSettings } from '~/composables/useUserSettings'
import { useElementsData } from './composables/useElementsData'
import { useScheduleDataTransform } from './composables/useScheduleDataTransform'
import { useScheduleCategories } from './composables/useScheduleCategories'
import { useScheduleParameters } from './composables/useScheduleParameters'
import { useScheduleTable } from './composables/useScheduleTable'
import { useScheduleTableUpdates } from './composables/useScheduleTableUpdates'
import { useParameterManagement } from './composables/useParameterManagement'
import { useScheduleWatchers } from './composables/useScheduleWatchers'
import { useMergedColumns } from './composables/useMergedColumns'
import { useScheduleInitializationFlow } from './composables/useScheduleInitializationFlow'
import { useColumnVisibility } from './composables/useColumnVisibility'
import { useTableConfigConversion } from './composables/useTableConfigConversion'
import { useScheduleUIState } from './composables/useScheduleUIState'
import { useScheduleEmits } from './composables/useScheduleEmits'
import { useDataOrganization } from './composables/useDataOrganization'
import { debug } from './utils/debug'
import type { CustomParameter } from '~/composables/useUserSettings'

// Emits
const emit = defineEmits<{
  close: []
}>()

const { handleClose } = useScheduleEmits({ emit })

// Initialization state
const initialized = ref(false)

// User Settings
const {
  settings,
  loadSettings,
  updateNamedTable,
  cleanup: cleanupSettings
} = useUserSettings()

// Data Organization
const { updateRootNodes } = useDataOrganization()

// Table Config Conversion
const { convertAndUpdateTable } = useTableConfigConversion({
  updateNamedTable
})

// UI State
const {
  showCategoryOptions,
  showParameterManager,
  toggleCategoryOptions,
  toggleParameterManager
} = useScheduleUIState()

// Initialize elements data first
const {
  scheduleData,
  updateCategories: updateElementsDataCategories,
  availableHeaders,
  availableCategories,
  initializeData: initElementsData,
  stopWorldTreeWatch
} = useElementsData({
  currentTableColumns: ref([]),
  currentDetailColumns: ref([]),
  isInitialized: initialized
})

// Initialize table with elements data
const {
  selectedTableId,
  tableName,
  selectedParentCategories,
  selectedChildCategories,
  tableKey,
  loadingError,
  currentTableId,
  currentTable,
  currentTableColumns,
  currentDetailColumns,
  tablesArray,
  handleTableChange,
  handleTableSelection,
  updateCategories
} = useScheduleTable({
  settings,
  updateCategories: updateElementsDataCategories,
  isInitialized: initialized
})

// Initialize table updates
const { handleBothColumnsUpdate, handleParameterUpdate, handleTableUpdate, saveTable } =
  useScheduleTableUpdates({
    settings,
    currentTableId,
    currentTable,
    selectedTableId,
    tableName,
    selectedParentCategories,
    selectedChildCategories,
    currentTableColumns,
    currentDetailColumns,
    updateNamedTable: convertAndUpdateTable,
    updateCategories,
    loadSettings,
    handleTableSelection,
    isInitialized: initialized
  })

// Initialize category management
const { toggleCategory, availableParentCategories, availableChildCategories } =
  useScheduleCategories({
    updateCategories,
    isInitialized: initialized
  })

// Parameter Management
const customParameters = computed<CustomParameter[]>(() => {
  const params = currentTable.value?.customParameters || []
  return params.map((param): CustomParameter => {
    if (!param || typeof param !== 'object') {
      return {
        id: crypto.randomUUID(),
        name: 'Unknown Parameter',
        type: 'fixed',
        value: '',
        field: 'unknown',
        header: 'Unknown Parameter',
        category: 'Custom Parameters',
        removable: true,
        visible: true
      }
    }

    const customParam = param as CustomParameter
    return {
      id: customParam.id || crypto.randomUUID(),
      name: customParam.name || 'Unknown Parameter',
      type: customParam.type || 'fixed',
      value: customParam.value || '',
      equation: customParam.equation,
      field: customParam.name || 'unknown',
      header: customParam.name || 'Unknown Parameter',
      category: 'Custom Parameters',
      removable: true,
      visible: true
    }
  })
})

// Initialize parameter management
const { parameterColumns, evaluatedData, updateParameterVisibility } =
  useParameterManagement({
    parameters: customParameters,
    data: scheduleData,
    isInitialized: initialized
  })

// Initialize schedule parameters
const { mergedParentParameters, mergedChildParameters } = useScheduleParameters({
  availableHeaders,
  customParameters,
  selectedParentCategories,
  selectedChildCategories,
  isInitialized: initialized
})

// Initialize merged columns
const { mergedTableColumns, mergedDetailColumns } = useMergedColumns({
  currentTableColumns: computed(() => currentTableColumns.value),
  currentDetailColumns: computed(() => currentDetailColumns.value),
  parameterColumns,
  isInitialized: initialized
})

// Initialize data transform
const { tableData } = useScheduleDataTransform({
  scheduleData,
  evaluatedData,
  customParameters,
  mergedTableColumns: computed(() => mergedTableColumns.value),
  mergedDetailColumns: computed(() => mergedDetailColumns.value),
  isInitialized: initialized
})

// Initialize column visibility
const { handleColumnVisibilityChange } = useColumnVisibility({
  updateParameterVisibility
})

// Initialize initialization flow
const { initialize } = useScheduleInitializationFlow({
  initializeData: async () => {
    await initElementsData()
  },
  updateRootNodes,
  waitForData: async <T>(
    getValue: () => T | undefined | null,
    validate: (value: T) => boolean,
    timeout = 10000
  ): Promise<T> => {
    const start = Date.now()
    let value = getValue()

    while ((!value || !validate(value)) && Date.now() - start < timeout) {
      await new Promise((resolve) => setTimeout(resolve, 100))
      value = getValue()
    }

    if (!value || !validate(value)) {
      throw new Error('Timeout waiting for data')
    }

    return value
  },
  loadSettings,
  handleTableSelection,
  currentTable,
  selectedTableId,
  currentTableId,
  isInitialized: initialized,
  loadingError,
  scheduleData
})

// Store cleanup functions
const cleanupFunctions = ref<(() => void)[]>([])

// Recovery action handler
async function handleRecoveryAction() {
  try {
    debug.startState('recoveryAction')
    debug.log('🔄 Starting recovery action:', {
      timestamp: new Date().toISOString(),
      error: loadingError.value?.message,
      state: {
        isInitialized: initialized.value,
        hasCurrentTable: !!currentTable.value,
        selectedTableId: selectedTableId.value
      }
    })

    // Reset error state
    loadingError.value = null

    // Reset initialization state
    initialized.value = false

    // Clean up any existing watchers
    cleanupFunctions.value.forEach((cleanup) => {
      try {
        cleanup()
      } catch (cleanupErr) {
        debug.warn('Error during cleanup:', cleanupErr)
      }
    })
    cleanupFunctions.value = []

    // Reload settings
    await loadSettings()

    // Run initialization again
    await initialize()
    debug.log('Core initialization complete')

    // Only set up watchers after core initialization
    debug.startState('watcherSetup')

    // Setup watchers only after initialization
    const { stopWatchers } = useScheduleWatchers({
      currentTable,
      scheduleData,
      tableData,
      mergedTableColumns: computed(() => mergedTableColumns.value),
      mergedDetailColumns: computed(() => mergedDetailColumns.value),
      customParameters,
      parameterColumns,
      evaluatedData,
      availableHeaders,
      mergedParentParameters,
      mergedChildParameters,
      selectedParentCategories,
      selectedChildCategories,
      settings,
      tablesArray,
      tableName,
      selectedTableId,
      currentTableId,
      tableKey,
      showCategoryOptions,
      showParameterManager,
      loadingError
    })

    // Store cleanup function
    cleanupFunctions.value.push(stopWatchers)

    // Setup data watcher after initialization
    const unwatchData = watch(
      () => scheduleData.value,
      (newData) => {
        debug.log('🔍 IMPORTANT RAW DATA:', {
          timestamp: new Date().toISOString(),
          hasData: !!newData?.length,
          count: newData?.length,
          firstItem: newData?.[0],
          allItems: newData,
          state: {
            isInitialized: initialized.value,
            hasTableColumns: !!currentTableColumns.value?.length,
            hasDetailColumns: !!currentDetailColumns.value?.length
          }
        })
      },
      { immediate: true }
    )

    // Store cleanup function
    cleanupFunctions.value.push(unwatchData)

    // Store cleanup function for world tree watch
    cleanupFunctions.value.push(stopWorldTreeWatch)

    debug.log('Watchers setup complete')
    debug.completeState('watcherSetup')

    // Mark as initialized only after everything is set up
    initialized.value = true
    debug.log('✅ Recovery action complete:', {
      timestamp: new Date().toISOString(),
      state: {
        isInitialized: initialized.value,
        hasCurrentTable: !!currentTable.value,
        selectedTableId: selectedTableId.value,
        dataCount: scheduleData.value.length
      }
    })

    debug.completeState('recoveryAction')
  } catch (err) {
    debug.error('❌ Recovery action failed:', {
      timestamp: new Date().toISOString(),
      error: err,
      state: {
        isInitialized: initialized.value,
        hasCurrentTable: !!currentTable.value,
        selectedTableId: selectedTableId.value
      }
    })
    loadingError.value =
      err instanceof Error ? err : new Error('Recovery action failed')
  }
}

// Initialize and setup watchers after initialization
onMounted(async () => {
  try {
    debug.startState('scheduleInitialization')
    debug.log('🚀 Starting Schedule component initialization:', {
      timestamp: new Date().toISOString(),
      state: {
        hasSettings: !!settings.value,
        hasCurrentTable: !!currentTable.value,
        selectedTableId: selectedTableId.value,
        initialized: initialized.value,
        hasScheduleData: !!scheduleData.value?.length,
        hasTableColumns: !!currentTableColumns.value?.length,
        hasDetailColumns: !!currentDetailColumns.value?.length
      }
    })

    // First load settings and initialize data
    await loadSettings()
    debug.log('Settings loaded')

    // Run the full initialization
    await initialize()
    debug.log('Core initialization complete')

    // Only set up watchers after core initialization
    debug.startState('watcherSetup')

    // Setup watchers only after initialization
    const { stopWatchers } = useScheduleWatchers({
      currentTable,
      scheduleData,
      tableData,
      mergedTableColumns: computed(() => mergedTableColumns.value),
      mergedDetailColumns: computed(() => mergedDetailColumns.value),
      customParameters,
      parameterColumns,
      evaluatedData,
      availableHeaders,
      mergedParentParameters,
      mergedChildParameters,
      selectedParentCategories,
      selectedChildCategories,
      settings,
      tablesArray,
      tableName,
      selectedTableId,
      currentTableId,
      tableKey,
      showCategoryOptions,
      showParameterManager,
      loadingError
    })

    // Store cleanup function
    cleanupFunctions.value.push(stopWatchers)

    // Setup data watcher after initialization
    const unwatchData = watch(
      () => scheduleData.value,
      (newData) => {
        debug.log('🔍 IMPORTANT RAW DATA:', {
          timestamp: new Date().toISOString(),
          hasData: !!newData?.length,
          count: newData?.length,
          firstItem: newData?.[0],
          allItems: newData,
          state: {
            isInitialized: initialized.value,
            hasTableColumns: !!currentTableColumns.value?.length,
            hasDetailColumns: !!currentDetailColumns.value?.length
          }
        })
      },
      { immediate: true }
    )

    // Store cleanup function
    cleanupFunctions.value.push(unwatchData)

    // Store cleanup function for world tree watch
    cleanupFunctions.value.push(stopWorldTreeWatch)

    debug.log('Watchers setup complete')
    debug.completeState('watcherSetup')

    // Mark as initialized only after everything is set up
    initialized.value = true
    debug.log('✅ Component fully initialized:', {
      timestamp: new Date().toISOString(),
      state: {
        isInitialized: initialized.value,
        hasCurrentTable: !!currentTable.value,
        selectedTableId: selectedTableId.value,
        dataCount: scheduleData.value?.length || 0,
        columnCounts: {
          table: currentTableColumns.value?.length || 0,
          detail: currentDetailColumns.value?.length || 0,
          merged: {
            table: mergedTableColumns.value?.length || 0,
            detail: mergedDetailColumns.value?.length || 0
          }
        },
        categories: {
          parent: Array.from(availableCategories.value?.parent || []),
          child: Array.from(availableCategories.value?.child || [])
        }
      }
    })

    debug.completeState('scheduleInitialization')
  } catch (err) {
    debug.error('❌ Initialization error:', {
      timestamp: new Date().toISOString(),
      error: err,
      state: {
        isInitialized: initialized.value,
        hasCurrentTable: !!currentTable.value,
        selectedTableId: selectedTableId.value,
        dataCount: scheduleData.value?.length || 0,
        columnCounts: {
          table: currentTableColumns.value?.length || 0,
          detail: currentDetailColumns.value?.length || 0
        }
      }
    })
    loadingError.value = err instanceof Error ? err : new Error('Initialization failed')
    // Clean up any watchers that might have been set up before the error
    cleanupFunctions.value.forEach((cleanup) => {
      try {
        cleanup()
      } catch (cleanupErr) {
        debug.warn('Error during cleanup:', cleanupErr)
      }
    })
    cleanupFunctions.value = []
  }
})

// Cleanup on component unmount
onUnmounted(() => {
  debug.startState('cleanup')
  debug.log('🧹 Cleaning up Schedule component')

  // Clean up all watchers
  cleanupFunctions.value.forEach((cleanup) => {
    try {
      cleanup()
    } catch (err) {
      debug.warn('Error during cleanup:', err)
    }
  })
  cleanupFunctions.value = []

  // Clean up settings
  cleanupSettings()

  // Reset initialization state
  initialized.value = false

  debug.completeState('cleanup')
})

// Export functions for template use
defineExpose({
  handleRecoveryAction
})
</script>
