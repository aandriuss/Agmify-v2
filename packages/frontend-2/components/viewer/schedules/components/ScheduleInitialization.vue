<template>
  <div>
    <div class="hidden">
      <ScheduleErrorAlert
        v-if="coreError"
        :error="coreError"
        :recoverable="true"
        @retry="handleRetry"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch, computed } from 'vue'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import type {
  TableSettings,
  ElementData,
  TreeItemComponentModel
} from '~/composables/core/types'
import ScheduleErrorAlert from './ScheduleErrorAlert.vue'

// Props for initialization flow
const props = defineProps<{
  updateRootNodes: (nodes: TreeItemComponentModel[]) => Promise<void>
  loadSettings: () => Promise<void>
  handleTableSelection: (id: string) => Promise<void>
  currentTable: TableSettings | null
  selectedTableId: string
  currentTableId: string
  loadingError: Error | null
  scheduleData: ElementData[]
  rootNodes: TreeItemComponentModel[]
  isInitialized: boolean
  selectedParentCategories: string[]
  selectedChildCategories: string[]
  projectId: string
  initialized: boolean // Added missing prop
}>()

const emit = defineEmits<{
  'update:initialized': [value: boolean]
  'settings-loaded': [settings: { namedTables: Record<string, TableSettings> }]
  'data-initialized': []
  error: [error: Error]
}>()

// Initialize core data handling
const {
  initialized: coreInitialized,
  loading: coreLoading,
  error: coreError,
  initializeData,
  waitForData
} = useScheduleInitialization()

// Initialize high-level flow
const { initialize: initializeFlow } = useScheduleInitializationFlow({
  // Core data functions
  initializeData,
  waitForData,
  // Node handling
  updateRootNodes: props.updateRootNodes,
  // Settings and table management
  loadSettings: props.loadSettings,
  handleTableSelection: props.handleTableSelection,
  // State refs
  currentTable: computed(() => props.currentTable),
  selectedTableId: computed(() => props.selectedTableId),
  currentTableId: computed(() => props.currentTableId),
  loadingError: { value: props.loadingError },
  scheduleData: computed(() => props.scheduleData),
  rootNodes: computed(() => props.rootNodes),
  isInitialized: computed(() => props.isInitialized),
  selectedParentCategories: { value: props.selectedParentCategories },
  selectedChildCategories: { value: props.selectedChildCategories },
  projectId: computed(() => props.projectId)
})

// Watch for state changes
watch(coreInitialized, (newValue) => {
  emit('update:initialized', newValue)
  if (newValue) {
    emit('data-initialized')
  }
})

watch(coreError, (newValue) => {
  if (newValue) {
    emit('error', newValue)
  }
})

// Error handling
async function handleRetry() {
  debug.log(DebugCategories.INITIALIZATION, 'Handling retry request')
  try {
    // Retry full initialization flow
    await initializeFlow()
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Retry failed:', err)
  }
}

// Lifecycle
onMounted(async () => {
  debug.log(DebugCategories.INITIALIZATION, 'Starting initialization sequence')
  try {
    // Start full initialization flow
    // This will:
    // 1. Initialize viewer and settings
    // 2. Initialize core data
    // 3. Start parameter discovery in background
    await initializeFlow()
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Initialization sequence failed:', err)
  }
})

// Expose necessary functions and state
defineExpose({
  initialized: coreInitialized,
  loading: coreLoading,
  error: coreError,
  handleRetry
})
</script>
