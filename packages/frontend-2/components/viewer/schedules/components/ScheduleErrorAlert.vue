<template>
  <div>
    <div
      v-if="error"
      class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600"
    >
      <div class="flex flex-col gap-2">
        <!-- Error Icon and Message -->
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 mt-0.5">
            <svg
              class="h-5 w-5 text-red-500"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
          <div class="flex-1">
            <!-- Main Error Message -->
            <h3 class="text-sm font-medium">{{ errorTitle }}</h3>
            <p class="mt-1 text-sm">{{ error.message }}</p>

            <!-- Error Details (if available) -->
            <div v-if="hasErrorDetails" class="mt-2">
              <button
                class="flex items-center text-xs text-red-500 hover:text-red-600 focus:outline-none"
                @click="showDetails = !showDetails"
              >
                <svg
                  :class="{ 'rotate-90': showDetails }"
                  class="h-4 w-4 transform transition-transform duration-200"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fill-rule="evenodd"
                    d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                    clip-rule="evenodd"
                  />
                </svg>
                <span class="ml-1">{{ showDetails ? 'Hide' : 'Show' }} Details</span>
              </button>

              <div v-if="showDetails" class="mt-2">
                <pre
                  class="p-2 bg-red-100 rounded text-xs font-mono whitespace-pre-wrap break-words"
                  >{{ errorDetails }}</pre
                >
              </div>
            </div>

            <!-- Recovery Action (if available) -->
            <div v-if="recoveryAction" class="mt-3">
              <button
                class="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-red-100 text-red-700 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                @click="handleRecoveryAction"
              >
                <svg
                  class="h-4 w-4 mr-1.5"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fill-rule="evenodd"
                    d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                    clip-rule="evenodd"
                  />
                </svg>
                {{ recoveryActionText }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="hidden"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { debug } from '../utils/debug'

interface Props {
  error: Error | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'recovery-action': []
}>()

const showDetails = ref(false)

// Computed properties for error display
const errorTitle = computed(() => {
  if (!props.error) return ''

  // Check for specific error types
  if (props.error.message.includes('initialization')) {
    return 'Initialization Error'
  }
  if (props.error.message.includes('load')) {
    return 'Loading Error'
  }
  if (props.error.message.includes('data')) {
    return 'Data Processing Error'
  }
  if (props.error.message.includes('timeout')) {
    return 'Operation Timeout'
  }

  return 'Error'
})

const hasErrorDetails = computed(() => {
  return !!(props.error?.stack || props.error?.cause)
})

const errorDetails = computed(() => {
  if (!props.error) return ''

  const details = {
    name: props.error.name,
    message: props.error.message,
    stack: props.error.stack,
    cause: props.error.cause
  }

  return JSON.stringify(details, null, 2)
})

// Recovery action logic
const recoveryAction = computed(() => {
  if (!props.error) return false

  // Determine if we can offer recovery based on error type
  return (
    props.error.message.includes('initialization') ||
    props.error.message.includes('timeout') ||
    props.error.message.includes('load')
  )
})

const recoveryActionText = computed(() => {
  if (!props.error) return ''

  if (props.error.message.includes('initialization')) {
    return 'Retry Initialization'
  }
  if (props.error.message.includes('timeout')) {
    return 'Try Again'
  }
  if (props.error.message.includes('load')) {
    return 'Reload Data'
  }

  return 'Retry'
})

// Event handlers
const handleRecoveryAction = () => {
  debug.log('Recovery action triggered:', {
    timestamp: new Date().toISOString(),
    error: {
      name: props.error?.name,
      message: props.error?.message
    }
  })
  emit('recovery-action')
}
</script>
