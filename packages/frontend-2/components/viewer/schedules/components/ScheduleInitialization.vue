<template>
  <div class="hidden">
    <ScheduleErrorAlert
      v-if="error"
      :error="error"
      :recoverable="true"
      @retry="handleRetry"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useScheduleInitialization } from '../composables/useScheduleInitialization'
import { debug, DebugCategories } from '../utils/debug'
import type { NamedTableConfig } from '~/composables/useUserSettings'
import store from '../composables/useScheduleStore'
import ScheduleErrorAlert from './ScheduleErrorAlert.vue'

const emit = defineEmits<{
  'update:initialized': [value: boolean]
  'settings-loaded': [settings: { namedTables: Record<string, NamedTableConfig> }]
  'data-initialized': []
  error: [error: Error]
}>()

// Initialize flow
const { initialized, loading, error, initializeData, waitForData } =
  useScheduleInitialization()

// Watch for state changes
watch(initialized, (newValue) => {
  emit('update:initialized', newValue)
  if (newValue) {
    emit('data-initialized')
  }
})

watch(error, (newValue) => {
  if (newValue) {
    emit('error', newValue)
  }
})

// Error handling
async function handleRetry() {
  debug.log(DebugCategories.INITIALIZATION, 'Handling retry request')
  try {
    const projectId = store.projectId.value
    if (!projectId) {
      throw new Error('Project ID is required but not provided')
    }
    await initializeData(projectId)
    await waitForData(projectId)
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Retry failed:', err)
  }
}

// Lifecycle
onMounted(async () => {
  debug.log(DebugCategories.INITIALIZATION, 'Mounting initialization component')
  try {
    const projectId = store.projectId.value
    if (!projectId) {
      throw new Error('Project ID is required but not provided')
    }
    await initializeData(projectId)
    await waitForData(projectId)
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Initialization failed:', err)
  }
})

// Expose necessary functions and state
defineExpose({
  initialized,
  loading,
  error,
  handleRetry
})
</script>
