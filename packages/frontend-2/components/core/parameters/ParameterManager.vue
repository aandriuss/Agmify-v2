<template>
  <div class="parameter-manager">
    <!-- Parameter Groups Section -->
    <div class="mb-6">
      <h3 class="text-lg font-medium mb-3">Parameter Groups</h3>
      <ParameterGroupList
        :groups="parameterGroups"
        :is-loading="isLoading"
        @row-click="handleParameterClick"
      />
    </div>

    <!-- Category Filter Section -->
    <div class="mb-6">
      <h3 class="text-lg font-medium mb-3">Categories</h3>
      <CategoryFilter
        :categories="availableCategories"
        :selected-categories="selectedCategories"
        :is-loading="isLoading"
        @update:selected-categories="handleCategoryUpdate"
      />
    </div>

    <!-- Parameter Actions -->
    <div class="flex items-center gap-2">
      <FormButton
        v-if="canCreateParameters"
        color="primary"
        :disabled="isLoading"
        @click="$emit('create-parameter')"
      >
        Create Parameter
      </FormButton>
      <FormButton
        v-if="hasSelectedParameters"
        color="outline"
        :disabled="isLoading"
        @click="$emit('edit-parameters')"
      >
        Edit Selected
      </FormButton>
    </div>

    <!-- Error Display -->
    <div v-if="error" class="mt-4 p-4 bg-red-50 text-red-600 rounded">
      {{ error.message }}
      <button
        class="ml-2 text-sm underline hover:text-red-700"
        :disabled="isLoading"
        @click="handleRetry"
      >
        Retry
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { FormButton } from '@speckle/ui-components'
import CategoryFilter from '~/components/core/filters/CategoryFilter.vue'
import ParameterGroupList from '~/components/core/parameters/ParameterGroupList.vue'
import type { TableParameter } from '~/composables/core/types/tables/parameter-table-types'
import { TableStateError } from '~/composables/core/types/errors'

interface Props {
  parameterGroups: Map<string, TableParameter[]>
  availableCategories: string[]
  selectedCategories: string[]
  canCreateParameters?: boolean
  selectedParameters?: TableParameter[]
  isLoading?: boolean
}

interface Emits {
  (e: 'update:selected-categories', categories: string[]): void
  (e: 'parameter-click', parameter: TableParameter): void
  (e: 'create-parameter'): void
  (e: 'edit-parameters'): void
  (e: 'error', error: Error): void
  (e: 'retry'): void
}

const props = withDefaults(defineProps<Props>(), {
  canCreateParameters: false,
  selectedParameters: () => [],
  isLoading: false
})

const emit = defineEmits<Emits>()

// State
const error = ref<Error | null>(null)

// Computed
const hasSelectedParameters = computed(() => props.selectedParameters.length > 0)

// Event Handlers
function handleCategoryUpdate(categories: string[]): void {
  try {
    emit('update:selected-categories', categories)
  } catch (err) {
    const tableError = new TableStateError(
      err instanceof Error ? err.message : 'Failed to update categories',
      err
    )
    error.value = tableError
    emit('error', tableError)
  }
}

function handleParameterClick(parameter: TableParameter): void {
  try {
    emit('parameter-click', parameter)
  } catch (err) {
    const tableError = new TableStateError(
      err instanceof Error ? err.message : 'Failed to handle parameter click',
      err
    )
    error.value = tableError
    emit('error', tableError)
  }
}

function handleRetry(): void {
  error.value = null
  emit('retry')
}
</script>

<style scoped>
.parameter-manager {
  @apply p-4 bg-white rounded-lg shadow;
}
</style>
