<template>
  <div>
    <!-- Loading state -->
    <div v-if="isLoading" class="flex justify-center py-4">
      <div>loading...</div>
    </div>

    <!-- Error Alert -->
    <div
      v-if="error"
      class="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-600"
    >
      {{ error }}
    </div>

    <!-- Main content -->
    <div v-if="!isLoading" class="h-full flex flex-col">
      <div class="flex flex-col gap-2">
        <!-- Parameters Panel -->
        <div class="border rounded flex flex-col overflow-hidden bg-background">
          <div class="p-1 border-b bg-gray-50 flex items-center justify-between">
            <h3 class="font-medium text-sm">User Parameters</h3>
            <FormButton
              text
              size="sm"
              color="subtle"
              :icon-right="showFilterOptions ? ChevronUpIcon : ChevronDownIcon"
              @click="toggleFilterOptions"
            >
              Filter Options
            </FormButton>
          </div>

          <!-- Parameter Groups -->
          <div class="flex-1 overflow-auto">
            <div v-for="group in groupedParameters" :key="group.name">
              <UserParameterList
                :group-name="group.name"
                :parameters="group.parameters"
                :is-adding-new="isAddingNew"
                :show-add-button="group.name === 'Custom'"
                :get-current-value="evaluateParameter"
                @add="openAddParameterDialog"
                @cancel-add="handleCancelAdd"
                @create="handleCreateParameter"
                @update="handleParameterUpdate"
                @delete="handleDelete"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { FormButton } from '@speckle/ui-components'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/vue/24/solid'
import { useUserParameterStore } from '~/composables/core/userparameters/store'
import { useParameterGroups } from '../../../composables/core/userparameters/useParameterGroups'
import { useParameterEvaluation } from '../../../composables/core/userparameters/useParameterEvaluation'
import type { AvailableUserParameter } from '~/composables/core/types'

// Components
import UserParameterList from './UserParameterList.vue'

const error = ref<string | null>(null)
const isAddingNew = ref(false)
const showFilterOptions = ref(false)

// Initialize parameter store
const parameterStore = useUserParameterStore()
const parameters = computed(() => parameterStore.state.value.parameters)
const isLoading = computed(() => parameterStore.isLoading.value)

const emit = defineEmits<{
  (e: 'update'): void
  (e: 'parameter-update'): void
}>()

// Get raw parameters array
const parametersList = computed(() => Object.values(parameters.value || {}))

// Evaluation for equations
const { evaluateParameter } = useParameterEvaluation({
  parameters: parametersList
})

// Grouped parameters
const { groupedParameters } = useParameterGroups({
  parameters: parametersList
})

async function handleCreateParameter(paramData: Omit<AvailableUserParameter, 'id'>) {
  try {
    error.value = null
    await parameterStore.createParameter(paramData)
    emit('update')
    isAddingNew.value = false
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to create parameter'
  }
}

async function handleParameterUpdate(parameter: AvailableUserParameter) {
  try {
    error.value = null
    await parameterStore.updateParameter(parameter.id, parameter)
    emit('update')
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to update parameter'
  }
}

async function handleDelete(parameter: AvailableUserParameter) {
  try {
    error.value = null
    await parameterStore.deleteParameter(parameter.id)
    emit('update')
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to delete parameter'
  }
}

function openAddParameterDialog() {
  isAddingNew.value = true
}

function handleCancelAdd() {
  isAddingNew.value = false
}

function toggleFilterOptions() {
  showFilterOptions.value = !showFilterOptions.value
}

// Initialize store and load parameters on mount
onMounted(async () => {
  try {
    error.value = null
    await parameterStore.initialize()
    await parameterStore.loadParameters()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load parameters'
  }
})

defineExpose({
  handleError: (err: Error | unknown) => {
    error.value = err instanceof Error ? err.message : 'An error occurred'
  }
})
</script>

<style scoped>
.bg-background {
  background-color: white;
}
</style>
