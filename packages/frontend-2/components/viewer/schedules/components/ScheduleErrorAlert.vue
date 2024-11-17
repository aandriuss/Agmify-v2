<template>
  <div class="error-alert-container">
    <div v-if="error" class="error-alert" role="alert">
      <div class="error-content">
        <div class="error-message">{{ formatErrorMessage(error) }}</div>
        <button
          v-if="showRecoveryButton"
          class="recovery-button"
          @click="$emit('recovery-action')"
        >
          Try Again
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  error: Error | null
}>()

defineEmits<{
  'recovery-action': []
}>()

// Determine if we should show recovery button based on error type
const showRecoveryButton = computed(() => {
  if (!props.error) return false
  return !isInitializationError(props.error)
})

// Check if error is related to initialization
function isInitializationError(error: Error): boolean {
  const message = error.message.toLowerCase()
  return (
    message.includes('project id is required') ||
    message.includes('viewer not available') ||
    message.includes('viewer state not initialized') ||
    message.includes('timeout waiting for viewer') ||
    message.includes('failed to access viewer state')
  )
}

// Format error message for display
function formatErrorMessage(error: Error): string {
  const message = error.message.toLowerCase()

  if (message.includes('project id is required')) {
    return 'Project ID is required but not provided. Please ensure you are accessing this page with a valid project ID.'
  }

  if (
    message.includes('viewer not available') ||
    message.includes('viewer state not initialized')
  ) {
    return 'Viewer is not available. Please ensure the viewer is properly loaded before accessing schedules.'
  }

  if (message.includes('timeout waiting for viewer')) {
    return 'Viewer initialization timed out. Please refresh the page and try again.'
  }

  if (message.includes('failed to access viewer state')) {
    return 'Failed to access viewer state. Please ensure the viewer is properly loaded and try again.'
  }

  if (message.includes('worldtree')) {
    return 'Failed to load model data. Please ensure the model is properly loaded and try again.'
  }

  return error.message
}
</script>

<style scoped>
.error-alert-container {
  min-height: 0;
}

.error-alert {
  background-color: #fee2e2;
  border: 1px solid #ef4444;
  border-radius: 0.375rem;
  margin: 1rem;
  padding: 1rem;
}

.error-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.error-message {
  color: #b91c1c;
  font-size: 0.875rem;
  line-height: 1.25rem;
  flex: 1;
}

.recovery-button {
  background-color: #dc2626;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
  cursor: pointer;
  transition: background-color 0.2s;
  white-space: nowrap;
}

.recovery-button:hover {
  background-color: #b91c1c;
}
</style>
