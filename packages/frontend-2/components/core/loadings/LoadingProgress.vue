<template>
  <div class="loading-progress">
    <div class="loading-steps">
      <div
        v-for="(step, index) in steps"
        :key="index"
        :class="{
          'step-complete': step.complete,
          'step-current': step.current,
          'step-error': step.error
        }"
        class="loading-step"
      >
        <div class="step-icon">
          <CheckIcon v-if="step.complete" class="h-4 w-4" />
          <ArrowPathIcon v-else-if="step.current" class="h-4 w-4 animate-spin" />
          <XCircleIcon v-else-if="step.error" class="h-4 w-4" />
          <EllipsisHorizontalCircleIcon v-else class="h-4 w-4" />
        </div>
        <div class="step-label">{{ step.label }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStore } from '~/composables/core/store'
import { useTableStore } from '~/composables/core/tables/store/store'
import { useParameterStore } from '~/composables/core/parameters/store'
import {
  CheckIcon,
  XCircleIcon,
  EllipsisHorizontalCircleIcon,
  ArrowPathIcon
} from '@heroicons/vue/24/outline'

const store = useStore()
const tableStore = useTableStore()
const parameterStore = useParameterStore()

// Computed properties for individual states to prevent infinite updates
const coreState = computed(() => {
  const storeState = store.state.value
  const hasScheduleData = store.scheduleData.value?.length > 0
  return {
    initialized: storeState.initialized,
    hasData: hasScheduleData
  }
})

const parameterState = computed(() => {
  const paramState = parameterStore.state.value
  const hasParameters = parameterStore.rawParameters.value?.length > 0
  const processingError = paramState.processing.error
  return {
    initialized: paramState.initialized,
    hasParameters,
    isProcessing: paramState.processing.status === 'processing',
    error: processingError instanceof Error ? processingError : null
  }
})

const tableState = computed(() => {
  const currentTable = tableStore.computed.currentTable.value
  return {
    initialized: !!currentTable,
    hasColumns: (currentTable?.parentColumns?.length ?? 0) > 0
  }
})

const dataState = computed(() => {
  const hasScheduleData = store.scheduleData.value?.length > 0
  const hasTableData = store.tableData.value?.length > 0
  return {
    hasScheduleData,
    hasTableData
  }
})

// Steps computed property using individual state computeds
const steps = computed(() => [
  {
    label: 'Core Store',
    complete: coreState.value.initialized && coreState.value.hasData,
    current: coreState.value.initialized && !coreState.value.hasData,
    error: !coreState.value.initialized
  },
  {
    label: 'Parameters',
    complete:
      parameterState.value.initialized &&
      parameterState.value.hasParameters &&
      !parameterState.value.isProcessing,
    current:
      (parameterState.value.initialized && !parameterState.value.hasParameters) ||
      parameterState.value.isProcessing,
    error: !parameterState.value.initialized || parameterState.value.error
  },
  {
    label: 'Table',
    complete: tableState.value.initialized && tableState.value.hasColumns,
    current: tableState.value.initialized && !tableState.value.hasColumns,
    error: !tableState.value.initialized
  },
  {
    label: 'Schedule Data',
    complete: dataState.value.hasScheduleData && dataState.value.hasTableData,
    current: dataState.value.hasScheduleData && !dataState.value.hasTableData,
    error: !dataState.value.hasScheduleData && coreState.value.initialized
  }
])
</script>

<style scoped>
.loading-progress {
  @apply p-4;
}

.loading-steps {
  @apply flex flex-col gap-4;
}

.loading-step {
  @apply flex items-center gap-2;
}

.step-icon {
  @apply flex items-center justify-center w-6 h-6 rounded-full border;
}

.step-complete .step-icon {
  background: var(--color-success);
  color: var(--color-foundation);
  border-color: var(--color-success);
}

.step-current .step-icon {
  background: var(--color-primary);
  color: var(--color-foundation);
  border-color: var(--color-primary);
}

.step-error .step-icon {
  background: var(--color-warning);
  color: var(--color-foundation);
  border-color: var(--color-warning);
}

.step-label {
  @apply text-sm font-medium;

  color: var(--color-foreground);
}

.step-complete .step-label {
  color: var(--color-success);
}

.step-current .step-label {
  color: var(--color-primary);
}

.step-error .step-label {
  color: var(--color-warning);
}
</style>
