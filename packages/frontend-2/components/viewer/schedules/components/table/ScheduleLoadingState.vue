<template>
  <div class="flex flex-col items-center justify-center p-8 space-y-4">
    <!-- Loading Spinner -->
    <div
      class="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"
    ></div>

    <!-- Loading Message -->
    <div class="text-lg font-medium text-gray-700">{{ loadingMessage }}</div>

    <!-- Loading Detail -->
    <div class="text-sm text-gray-500">{{ loadingDetail }}</div>

    <!-- Progress -->
    <div class="w-full max-w-md">
      <div class="flex justify-between text-sm text-gray-500 mb-2">
        <span>Step {{ currentStep + 1 }} of {{ totalSteps }}</span>
        <span>{{ Math.round(((currentStep + 1) / totalSteps) * 100) }}%</span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-2">
        <div
          class="bg-blue-500 h-2 rounded-full transition-all duration-300"
          :style="{ width: `${((currentStep + 1) / totalSteps) * 100}%` }"
        ></div>
      </div>
      <!-- Step Description -->
      <div class="mt-2 text-sm text-gray-500 text-center">
        {{ getStepDescription(currentStep) }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  loadingMessage: string
  loadingDetail: string
  currentStep: number
  totalSteps: number
}

defineProps<Props>()

function getStepDescription(step: number): string {
  const steps = [
    'Initializing viewer and checking project ID',
    'Loading model data and settings',
    'Processing BIM elements and parameters',
    'Preparing table data and columns',
    'Finalizing initialization'
  ]
  return steps[step] || 'Loading...'
}
</script>

<style scoped>
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

/* Smooth transitions */
.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

.duration-300 {
  transition-duration: 300ms;
}
</style>
