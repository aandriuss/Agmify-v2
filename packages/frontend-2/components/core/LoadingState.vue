<template>
  <div class="loading-state">
    <div v-if="isLoading" class="loading-indicator" role="status">
      <div class="spinner">
        <span class="sr-only">Loading...</span>
      </div>
      <p v-if="loadingMessage" class="loading-message" aria-live="polite">
        {{ loadingMessage }}
      </p>
    </div>

    <div v-else-if="error" class="error-state" role="alert">
      <div class="error-icon">
        <svg
          class="h-6 w-6 text-danger"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <div class="error-content">
        <p class="error-message">{{ error.message }}</p>
        <p v-if="error.details" class="error-details">{{ error.details }}</p>
        <button
          v-if="canRetry"
          type="button"
          class="retry-button"
          @click="$emit('retry')"
        >
          Try Again
        </button>
      </div>
    </div>

    <slot v-else />
  </div>
</template>

<script setup lang="ts">
interface ErrorWithDetails extends Error {
  details?: string
}

defineProps({
  isLoading: {
    type: Boolean,
    required: true
  },
  error: {
    type: Object as () => ErrorWithDetails | null,
    default: null
  },
  loadingMessage: {
    type: String,
    default: 'Loading...'
  },
  canRetry: {
    type: Boolean,
    default: true
  }
})

defineEmits<{
  (e: 'retry'): void
}>()
</script>

<style scoped>
.loading-state {
  @apply h-full w-full;
}

.loading-indicator {
  @apply flex flex-col items-center justify-center h-full min-h-[200px];
}

.spinner {
  @apply w-10 h-10 border-4 border-primary-muted border-t-primary rounded-full animate-spin;
}

.loading-message {
  @apply mt-4 text-sm text-foreground-2;
}

.error-state {
  @apply flex items-start gap-4 p-6 bg-danger-lighter rounded-lg bg-opacity-20;
}

.error-content {
  @apply flex-1;
}

.error-message {
  @apply text-sm font-medium text-danger-darker;
}

.error-details {
  @apply mt-1 text-sm text-danger;
}

.retry-button {
  @apply mt-4 px-4 py-2 text-sm font-medium text-foreground-on-primary bg-danger rounded-md 
    hover:bg-danger-darker focus:outline-none focus:ring-2 focus:ring-danger-lighter focus:ring-offset-2 transition-colors;
}
</style>
