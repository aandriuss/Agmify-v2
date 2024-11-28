<template>
  <div class="p-8 text-center">
    <div class="inline-flex flex-col items-center p-4 bg-red-50 rounded-lg">
      <!-- Error Icon -->
      <div class="text-red-500 mb-2">
        <span class="i-mdi-alert-circle text-2xl"></span>
      </div>

      <!-- Error Message -->
      <h3 class="font-medium text-red-700">{{ error.message }}</h3>

      <!-- Retry Button -->
      <button
        class="mt-4 px-4 py-2 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
        @click="handleRetry"
      >
        Retry
      </button>

      <!-- Debug Information -->
      <pre
        v-if="showDebug"
        class="mt-4 text-xs text-left text-red-600 bg-red-50 p-2 rounded"
        >{{ debugState }}</pre
      >
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { debug, DebugCategories } from '~/components/viewer/schedules/debug/useDebug'

interface Props {
  error: Error
  showDebug?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showDebug: false
})

const emit = defineEmits<{
  retry: []
}>()

const debugState = computed(() => {
  return JSON.stringify(
    {
      error: {
        name: props.error.name,
        message: props.error.message,
        stack: props.error.stack
      },
      timestamp: new Date().toISOString()
    },
    null,
    2
  )
})

const handleRetry = () => {
  debug.log(DebugCategories.ERROR, 'Retrying after error:', {
    error: {
      name: props.error.name,
      message: props.error.message
    }
  })
  emit('retry')
}
</script>

<style scoped>
.i-mdi-alert-circle {
  display: inline-block;
  width: 1.5rem;
  height: 1.5rem;
  background-color: currentColor;
  mask-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M13 13h-2V7h2m0 10h-2v-2h2M12 2A10 10 0 0 0 2 12a10 10 0 0 0 10 10a10 10 0 0 0 10-10A10 10 0 0 0 12 2z"/></svg>');
  mask-repeat: no-repeat;
  mask-position: center;
  mask-size: contain;
}
</style>
