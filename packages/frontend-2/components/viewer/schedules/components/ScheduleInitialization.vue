<template>
  <div class="hidden">
    <ScheduleErrorAlert
      v-if="initFlow.state.value.error"
      :error="initFlow.state.value.error"
      :recoverable="initFlow.state.value.error.recoverable"
      @retry="handleRetry"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import { useScheduleInitializationFlow } from '../core/composables/useScheduleInitializationFlow'
import { debug, DebugCategories } from '../utils/debug'
import type { NamedTableConfig } from '~/composables/useUserSettings'
import type { InitializationState } from '../core/composables/useScheduleInitializationFlow'
import type { Ref } from 'vue'

const emit = defineEmits<{
  'update:initialized': [value: boolean]
  'settings-loaded': [settings: { namedTables: Record<string, NamedTableConfig> }]
  'data-initialized': []
  error: [error: Error]
}>()

// Initialize flow
const initFlow = useScheduleInitializationFlow()

// Watch for state changes
watch(
  () => initFlow.state.value.isInitialized,
  (newValue) => {
    emit('update:initialized', newValue)
    if (newValue) {
      emit('data-initialized')
    }
  }
)

watch(
  () => initFlow.state.value.settings,
  (newValue) => {
    if (newValue) {
      emit('settings-loaded', { namedTables: newValue })
    }
  }
)

watch(
  () => initFlow.state.value.error,
  (newValue) => {
    if (newValue) {
      emit('error', newValue)
    }
  }
)

// Error handling
async function handleRetry() {
  debug.log(DebugCategories.INITIALIZATION, 'Handling retry request')
  await initFlow.retry()
}

// Lifecycle
onMounted(async () => {
  debug.log(DebugCategories.INITIALIZATION, 'Mounting initialization component')
  await initFlow.initialize()
})

onUnmounted(async () => {
  debug.log(DebugCategories.INITIALIZATION, 'Unmounting initialization component')
  await initFlow.cleanup()
})

// Expose necessary functions and state
defineExpose({
  state: initFlow.state as Ref<InitializationState>,
  handleRetry
})
</script>
