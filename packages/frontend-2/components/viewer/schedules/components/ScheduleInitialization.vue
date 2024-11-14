<template>
  <div class="hidden"></div>
  <!-- This component doesn't render anything, it just handles initialization -->
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useUserSettings } from '~/composables/useUserSettings'
import { useElementsData } from '../composables/useElementsData'
import { useScheduleInitializationFlow } from '../composables/useScheduleInitializationFlow'
import { useDataOrganization } from '../composables/useDataOrganization'
import { debug, DebugCategories } from '../utils/debug'
import { useScheduleTable } from '../composables/useScheduleTable'
import { defaultColumns, defaultDetailColumns } from '../config/defaultColumns'
import type { NamedTableConfig } from '~/composables/useUserSettings'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'

const emit = defineEmits<{
  'update:initialized': [value: boolean]
  'settings-loaded': [settings: { namedTables: Record<string, NamedTableConfig> }]
  'data-initialized': []
  error: [error: Error]
}>()

// Initialization state
const loadingError = ref<Error | null>(null)
const isInitialLoad = ref(true)

// Column state - initialize with defaults
const currentTableColumns = ref<ColumnDef[]>(defaultColumns)
const currentDetailColumns = ref<ColumnDef[]>(defaultDetailColumns)

// Category state
const selectedParentCategories = ref<string[]>([])
const selectedChildCategories = ref<string[]>([])

// User Settings
const {
  settings,
  loadSettings,
  updateNamedTable,
  createNamedTable: createTable,
  cleanup: cleanupSettings
} = useUserSettings()

// Watch for settings changes and emit them
const stopSettingsWatch = watch(
  () => settings.value?.namedTables,
  (newTables) => {
    if (newTables) {
      debug.log(DebugCategories.INITIALIZATION, 'Settings loaded:', {
        namedTablesCount: Object.keys(newTables).length,
        isInitialLoad: isInitialLoad.value
      })
      emit('settings-loaded', { namedTables: newTables })

      // Only mark initial load as complete after first load
      if (isInitialLoad.value) {
        isInitialLoad.value = false
      }
    }
  },
  { immediate: true }
)

// Data Organization
const { rootNodes, updateRootNodes } = useDataOrganization()

// Initialize elements data with default columns
const {
  scheduleData,
  availableCategories,
  updateCategories: updateElementsDataCategories,
  initializeData: initElementsData,
  stopWorldTreeWatch
} = useElementsData({
  _currentTableColumns: currentTableColumns,
  _currentDetailColumns: currentDetailColumns,
  selectedParentCategories,
  selectedChildCategories
})

// Initialize table management
const {
  selectedTableId,
  tableName,
  currentTableId,
  currentTable,
  handleTableSelection,
  tablesArray
} = useScheduleTable({
  settings,
  updateCategories: updateElementsDataCategories,
  updateNamedTable,
  handleError: (err: unknown) => {
    const errorToSet = err instanceof Error ? err : new Error(String(err))
    loadingError.value = errorToSet
    emit('error', errorToSet)
  },
  updateCurrentColumns: (tableColumns: ColumnDef[], detailColumns: ColumnDef[]) => {
    debug.log(DebugCategories.COLUMNS, 'Updating current columns', {
      tableColumnsCount: tableColumns.length,
      detailColumnsCount: detailColumns.length,
      usingDefaults: {
        table: tableColumns === defaultColumns,
        detail: detailColumns === defaultDetailColumns
      }
    })
    currentTableColumns.value = tableColumns
    currentDetailColumns.value = detailColumns
  }
})

// Watch for table changes to update columns
watch(
  () => currentTable.value,
  (newTable) => {
    if (newTable) {
      debug.log(DebugCategories.COLUMNS, 'Table changed, updating columns', {
        tableId: newTable.id,
        parentColumnsCount: newTable.parentColumns?.length || 0,
        childColumnsCount: newTable.childColumns?.length || 0
      })

      // Use default columns if PostgreSQL has empty arrays
      const parentColumns = newTable.parentColumns?.length
        ? newTable.parentColumns
        : defaultColumns
      const childColumns = newTable.childColumns?.length
        ? newTable.childColumns
        : defaultDetailColumns

      currentTableColumns.value = parentColumns
      currentDetailColumns.value = childColumns

      // Update categories if table has them
      if (newTable.categoryFilters) {
        selectedParentCategories.value =
          newTable.categoryFilters.selectedParentCategories || []
        selectedChildCategories.value =
          newTable.categoryFilters.selectedChildCategories || []
      }
    } else {
      debug.log(DebugCategories.COLUMNS, 'No table selected, using default columns')
      currentTableColumns.value = defaultColumns
      currentDetailColumns.value = defaultDetailColumns
      selectedParentCategories.value = []
      selectedChildCategories.value = []
    }
  },
  { immediate: true }
)

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
  handleTableSelection: async (id: string) => {
    debug.log(DebugCategories.TABLE_UPDATES, 'Handling table selection during init:', {
      id,
      availableTables: tablesArray.value
    })
    await handleTableSelection(id)
  },
  currentTable,
  selectedTableId,
  currentTableId,
  loadingError,
  scheduleData,
  rootNodes,
  isInitialized: ref(false),
  selectedParentCategories,
  selectedChildCategories
})

// Store cleanup functions
const cleanupFunctions = ref<(() => void)[]>([])

// Initialize and setup after mounting
onMounted(async () => {
  try {
    debug.startState('scheduleInitialization')
    debug.log(DebugCategories.INITIALIZATION, 'Starting Schedule initialization', {
      timestamp: new Date().toISOString(),
      state: {
        hasSettings: !!settings.value
      }
    })

    // Run the initialization flow
    await initialize()
    debug.log(DebugCategories.INITIALIZATION, 'Initialization flow complete')

    // Mark as initialized and emit
    emit('update:initialized', true)
    emit('data-initialized')

    // Store cleanup functions
    cleanupFunctions.value.push(stopWorldTreeWatch)
    cleanupFunctions.value.push(stopSettingsWatch)

    debug.completeState('scheduleInitialization')
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Initialization error', {
      timestamp: new Date().toISOString(),
      error: err,
      settingsState: {
        hasSettings: !!settings.value,
        hasNamedTables: !!settings.value?.namedTables,
        tables: settings.value?.namedTables
          ? Object.keys(settings.value.namedTables)
          : []
      }
    })
    loadingError.value = err instanceof Error ? err : new Error('Initialization failed')
    emit('error', loadingError.value)

    // Clean up any watchers that might have been set up before the error
    cleanupFunctions.value.forEach((cleanup) => {
      try {
        cleanup()
      } catch (cleanupErr) {
        debug.warn(DebugCategories.ERROR, 'Error during cleanup', cleanupErr)
      }
    })
    cleanupFunctions.value = []
  }
})

// Cleanup on component unmount
onUnmounted(() => {
  debug.startState('cleanup')
  debug.log(DebugCategories.STATE, 'Cleaning up initialization component')

  // Clean up all watchers
  cleanupFunctions.value.forEach((cleanup) => {
    try {
      cleanup()
    } catch (err) {
      debug.warn(DebugCategories.ERROR, 'Error during cleanup', err)
    }
  })
  cleanupFunctions.value = []

  // Clean up settings
  cleanupSettings()

  debug.completeState('cleanup')
})

// Create a new named table
async function createNamedTable(
  name: string,
  config: Omit<NamedTableConfig, 'id' | 'name'>
) {
  debug.log(DebugCategories.TABLE_UPDATES, 'Creating new named table:', {
    name,
    config
  })
  return createTable(name, config)
}

// Expose necessary functions
defineExpose({
  settings,
  updateNamedTable,
  createNamedTable,
  scheduleData,
  updateElementsDataCategories,
  loadingError,
  selectedTableId,
  tableName,
  currentTableId,
  currentTable,
  handleTableSelection,
  tablesArray,
  availableCategories,
  selectedParentCategories,
  selectedChildCategories
})
</script>
