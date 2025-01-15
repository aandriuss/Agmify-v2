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

          <!-- Parameter Creation -->
          <div v-if="isAddingNew || showAddButton" class="p-2 border-b">
            <div v-if="isAddingNew">
              <ParameterCreationForm
                @create="handleCreateParameter"
                @cancel="handleCancelAdd"
              />
            </div>
            <div v-else>
              <FormButton
                text
                size="lg"
                class="w-full text-left"
                @click="openAddParameterDialog"
              >
                <PlusIcon class="size-4" />
                Add Parameter
              </FormButton>
            </div>
          </div>

          <!-- Filter Options -->
          <FilterOptions
            v-if="showFilterOptions"
            :search-term="searchTerm"
            :is-grouped="isGrouped"
            :sort-by="sortBy"
            @update:search-term="searchTerm = $event"
            @update:is-grouped="isGrouped = $event"
            @update:sort-by="handleSortByUpdate"
          />

          <!-- Parameter Groups -->
          <div class="flex-1 overflow-auto">
            <template v-if="isGrouped">
              <div v-for="group in userGroupedItems" :key="group.group">
                <UserParameterList
                  :parameters="group.items"
                  :group="group.group"
                  :get-current-value="(param) => param.value"
                  @update="handleParameterUpdate"
                  @delete="handleDelete"
                />
              </div>
            </template>
            <template v-else>
              <UserParameterList
                :parameters="userSortedItems"
                :get-current-value="(param) => param.value"
                @update="handleParameterUpdate"
                @delete="handleDelete"
              />
            </template>
          </div>
        </div>
      </div>
    </div>
    <!-- Debug Info -->
    <div v-if="debug.isEnabled.value" class="mb-2 p-2 bg-gray-100">
      <pre class="text-xs">{{ debugInfo }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { FormButton } from '@speckle/ui-components'
import { ChevronDownIcon, ChevronUpIcon, PlusIcon } from '@heroicons/vue/24/solid'
import { useUserParameterStore } from '~/composables/core/userparameters/store'
import { useParametersGraphQL } from '~/composables/core/userparameters/useParametersGraphQL'
import type { AvailableUserParameter } from '~/composables/core/types'
import type {
  UserParameterStore,
  UserParameterStoreState
} from '~/composables/core/userparameters/store/types'

// Components
import UserParameterList from './UserParameterList.vue'
import ParameterCreationForm from './ParameterCreationForm.vue'
import FilterOptions from '~/components/shared/FilterOptions.vue'
import { useFilterAndSort } from '~/composables/shared/useFilterAndSort'
import { debug } from '~/composables/core/utils/debug'

const error = ref<string | null>(null)
const isAddingNew = ref(false)
const showFilterOptions = ref(false)
const showAddButton = ref(true)

// Filter state
const searchTerm = ref('')
const isGrouped = ref(true)
const sortBy = ref<'name' | 'category' | 'type' | 'fixed'>('name')

function handleSortByUpdate(value: string) {
  if (['name', 'category', 'type', 'fixed'].includes(value)) {
    sortBy.value = value as 'name' | 'category' | 'type' | 'fixed'
  }
}

// Initialize store
const parameterStore = ref<UserParameterStore | null>(null)

// Debug info computed property
const debugInfo = computed(() => {
  if (!parameterStore.value) return { parameters: 0, rawParameters: {}, error: null }
  const state = parameterStore.value.state as UserParameterStoreState
  return {
    parameters: Object.keys(state.parameters).length,
    rawParameters: state.parameters,
    error: state.error
  }
})

// Initialize GraphQL and store
onMounted(async () => {
  try {
    error.value = null
    const graphqlOps = await useParametersGraphQL()
    parameterStore.value = useUserParameterStore({
      fetchParameters: graphqlOps.fetchParameters,
      updateParameters: graphqlOps.updateParameters
    })
    await parameterStore.value?.loadParameters()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load parameters'
  }
})

const parameters = computed<Record<string, AvailableUserParameter>>(() => {
  if (!parameterStore.value) return {}
  const state = parameterStore.value.state as UserParameterStoreState
  return state.parameters
})

const isLoading = computed<boolean>(() => {
  if (!parameterStore.value) return true
  const state = parameterStore.value.state as UserParameterStoreState
  return state.loading
})

const emit = defineEmits<{
  (e: 'update'): void
  (e: 'parameter-update'): void
}>()

// Get raw parameters array
const parametersList = computed<AvailableUserParameter[]>(() =>
  Object.values(parameters.value)
)

// Use filter and sort composable with type casting
const { sortedItems, groupedItems } = useFilterAndSort({
  items: computed(() => parametersList.value as unknown as AvailableUserParameter[]),
  searchTerm,
  isGrouped,
  sortBy
})

// Cast back to AvailableUserParameter[]
const userSortedItems = computed(() => sortedItems.value as AvailableUserParameter[])
const userGroupedItems = computed(() =>
  groupedItems.value.map((group) => ({
    ...group,
    items: group.items as AvailableUserParameter[]
  }))
)

async function handleCreateParameter(paramData: Omit<AvailableUserParameter, 'id'>) {
  if (!parameterStore.value) return
  try {
    error.value = null
    await parameterStore.value.createParameter(paramData)
    emit('update')
    isAddingNew.value = false
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to create parameter'
  }
}

async function handleParameterUpdate(parameter: AvailableUserParameter) {
  if (!parameterStore.value) return
  try {
    error.value = null
    await parameterStore.value.updateParameter(parameter.id, parameter)
    emit('update')
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to update parameter'
  }
}

async function handleDelete(parameter: AvailableUserParameter) {
  if (!parameterStore.value) return
  try {
    error.value = null
    await parameterStore.value.deleteParameter(parameter.id)
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

// Watch for store errors
watch(
  () => {
    const state = parameterStore.value?.state as UserParameterStoreState | undefined
    return state?.error
  },
  (newError) => {
    if (newError) {
      error.value = newError instanceof Error ? newError.message : String(newError)
    }
  },
  { immediate: true }
)

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
