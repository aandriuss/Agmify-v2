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
import type { NamedTableConfig } from '~/composables/useUserSettings'

const props = defineProps<{
  initialized: boolean
}>()

const emit = defineEmits<{
  'update:initialized': [value: boolean]
  'settings-loaded': [settings: { namedTables: Record<string, NamedTableConfig> }]
  'data-initialized': []
  error: [error: Error]
}>()

// Initialization state
const loadingError = ref<Error | null>(null)

// User Settings
const {
  settings,
  loadSettings,
  updateNamedTable,
  cleanup: cleanupSettings
} = useUserSettings()

// Watch for settings changes
const stopSettingsWatch = watch(
  () => settings.value?.namedTables,
  (newTables) => {
    if (newTables) {
      debug.log(DebugCategories.INITIALIZATION, 'Settings updated:', {
        namedTablesCount: Object.keys(newTables).length,
        namedTables: newTables
      })
      emit('settings-loaded', { namedTables: newTables })
    }
  },
  { deep: true }
)

// Data Organization
const { updateRootNodes } = useDataOrganization()

// Initialize elements data
const {
  scheduleData,
  availableCategories,
  updateCategories: updateElementsDataCategories,
  initializeData: initElementsData,
  stopWorldTreeWatch
} = useElementsData({
  currentTableColumns: ref([]),
  currentDetailColumns: ref([]),
  isInitialized: ref(props.initialized)
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
  isInitialized: ref(props.initialized)
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
  isInitialized: ref(props.initialized),
  loadingError,
  scheduleData
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

    // First load settings
    await loadSettings()

    // Run the full initialization
    await initialize()
    emit('data-initialized')
    debug.log(DebugCategories.INITIALIZATION, 'Core initialization complete', {
      categories: {
        parent: Array.from(availableCategories.value.parent),
        child: Array.from(availableCategories.value.child)
      },
      tables: tablesArray.value
    })

    // Store cleanup functions
    cleanupFunctions.value.push(stopWorldTreeWatch)
    cleanupFunctions.value.push(stopSettingsWatch)

    // Mark as initialized only if we have data and categories
    if (
      scheduleData.value.length > 0 &&
      availableCategories.value.parent.size > 0 &&
      availableCategories.value.child.size > 0
    ) {
      emit('update:initialized', true)
      debug.log(DebugCategories.INITIALIZATION, 'Component fully initialized', {
        dataCount: scheduleData.value.length,
        categories: {
          parent: Array.from(availableCategories.value.parent),
          child: Array.from(availableCategories.value.child)
        },
        tables: tablesArray.value
      })
    } else {
      debug.warn(DebugCategories.INITIALIZATION, 'Missing required data:', {
        hasData: scheduleData.value.length > 0,
        hasParentCategories: availableCategories.value.parent.size > 0,
        hasChildCategories: availableCategories.value.child.size > 0
      })
    }

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

// Expose necessary functions and state
defineExpose({
  settings,
  updateNamedTable,
  scheduleData,
  updateElementsDataCategories,
  loadingError,
  selectedTableId,
  tableName,
  currentTableId,
  currentTable,
  handleTableSelection,
  tablesArray,
  availableCategories
})
</script>
