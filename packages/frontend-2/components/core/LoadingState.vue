<template>
  <div class="loading-state">
    <div v-if="error" class="error-state">
      <XCircleIcon class="h-8 w-8 text-error" />
      <div class="error-message">{{ error.message }}</div>
      <slot name="error-actions" />
    </div>
    <div v-else-if="isLoading" class="loading-state">
      <LoadingProgress />
      <div v-if="loadingMessage" class="loading-message">
        {{ loadingMessage }}
      </div>
      <slot name="loading-actions" />
    </div>
    <div v-else class="content-state">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { XCircleIcon } from '@heroicons/vue/24/solid'
import LoadingProgress from './LoadingProgress.vue'

defineProps<{
  isLoading: boolean
  error?: Error | null
  loadingMessage?: string
}>()
</script>

<style scoped>
.loading-overlay {
  @apply absolute inset-0 flex items-center justify-center bg-foundation backdrop-blur-sm z-50;
}

.error-state,
.loading-state {
  @apply flex flex-col items-center gap-4 p-8 rounded-lg bg-foundation shadow-lg;
}

.error-message,
.loading-message {
  @apply text-lg font-medium text-center text-foreground;

  min-height: 2rem;
}

.content-state {
  @apply w-full h-full;
}

.content-loading {
  @apply pointer-events-none select-none opacity-50;
}

.loading-state {
  @apply relative min-h-[200px] w-full h-full;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
