<template>
  <LayoutDialog
    :open="true"
    max-width="lg"
    :hide-closer="false"
    mode="out-in"
    title="Parameter Manager"
    :buttons="dialogButtons"
    @update:open="$emit('close')"
  >
    <div class="p-4">
      <!-- Loading State -->
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

      <!-- Content -->
      <div v-if="!isLoading" class="space-y-6">
        <!-- Parameter Groups -->
        <div v-for="group in groupedParameters" :key="group.name">
          <ParameterList
            :group-name="group.name"
            :parameters="group.parameters"
            :is-adding-new="isAddingNew"
            :show-add-button="group.name === 'Custom'"
            :get-current-value="evaluateParameter"
            :get-used-in-tables="getUsedInTables"
            :available-tables="safeAvailableTables"
            @add="openAddParameterDialog"
            @cancel-add="handleCancelAdd"
            @create="handleCreateParameter"
            @update="handleParameterUpdate"
            @delete="handleDelete"
            @add-to-tables="handleAddToTables"
            @remove-from-table="handleRemoveFromTable"
          />
        </div>

        <!-- Table Selection Dialog -->
        <TableSelectionDialog
          v-if="showTableSelectionModal"
          v-model:selected-tables="selectedTables"
          :tables="safeAvailableTables"
          :parameter="selectedParameterForTables"
          @save="handleSaveTableSelection"
          @close="closeTableSelectionModal"
        />
      </div>
    </div>
  </LayoutDialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { LayoutDialogButton } from '@speckle/ui-components'
import { useParameterOperations } from '~/composables/settings/useParameterOperations'
import { useParameterGroups } from '../../composables/parameters/useParameterGroups'
import { useParameterEvaluation } from '../../composables/parameters/useParameterEvaluation'
import { useParametersState } from '~/composables/parameters/useParametersState'
import { useTableSelection } from '../../composables/parameters/useTableSelection'
import { useParameterMappingOperations } from '~/composables/parameters/useParameterMappingOperations'
import type { CustomParameter } from '~/composables/core/types'

// Components
import ParameterList from './ParameterList.vue'
import TableSelectionDialog from './TableSelectionDialog.vue'

const error = ref<string | null>(null)
const showTableSelectionModal = ref(false)
const selectedParameterForTables = ref<CustomParameter | null>(null)
const isAddingNew = ref(false)
const selectedTables = ref<string[]>([])

// Initialize parameter state
const { parameters, loading, loadParameters } = useParametersState()

// Initialize parameter operations with error handling
const { createParameter, updateParameter, deleteParameter } = useParameterOperations({
  onError: (message) => (error.value = message),
  onUpdate: () => emit('update')
})

// Initialize mapping operations
const { getParameterTables, updateParameterTables } = useParameterMappingOperations({
  onError: (message) => (error.value = message),
  onUpdate: () => emit('update')
})

// Initialize table selection
const { availableTables, getUsedInTables } = useTableSelection({
  tables: computed(() => parameters.value || {}),
  onTableSelectionChange: async (parameterId: string, tableIds: string[]) => {
    try {
      await updateParameterTables(parameterId, tableIds)
      emit('update')
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update tables'
    }
  }
})

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'update'): void
  (e: 'parameter-update'): void
}>()

const props = defineProps<{
  tableId?: string
}>()

// Computed properties
const isLoading = computed(() => loading.value)

const safeAvailableTables = computed(() => availableTables.value || [])

// Evaluation for equations
const { evaluateParameter } = useParameterEvaluation({
  parameters: computed(() => Object.values(parameters.value || {}))
})

// Grouped parameters
const { groupedParameters } = useParameterGroups({
  parameters: computed(() => Object.values(parameters.value || {}))
})

// Dialog buttons
const dialogButtons = computed<LayoutDialogButton[]>(() => [
  {
    text: 'Close',
    props: { color: 'outline' },
    onClick: () => emit('close')
  }
])

async function handleCreateParameter(paramData: Omit<CustomParameter, 'id'>) {
  try {
    error.value = null
    const newParam = await createParameter(paramData)

    // If tables are preselected
    if (props.tableId) {
      await updateParameterTables(newParam.id, [props.tableId])
    }

    emit('update')
    isAddingNew.value = false
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to create parameter'
  }
}

async function handleParameterUpdate(parameter: CustomParameter) {
  try {
    error.value = null
    await updateParameter(parameter.id, parameter)
    emit('update')
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to update parameter'
  }
}

async function handleDelete(parameter: CustomParameter) {
  try {
    error.value = null
    await deleteParameter(parameter.id)
    emit('update')
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to delete parameter'
  }
}

function handleAddToTables(parameter: CustomParameter) {
  try {
    selectedParameterForTables.value = parameter
    selectedTables.value = getParameterTables(parameter.id)
    showTableSelectionModal.value = true
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to get parameter tables'
  }
}

async function handleSaveTableSelection() {
  if (!selectedParameterForTables.value) return

  try {
    await updateParameterTables(
      selectedParameterForTables.value.id,
      selectedTables.value
    )
    emit('update')
    closeTableSelectionModal()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to update table mappings'
  }
}

function closeTableSelectionModal() {
  showTableSelectionModal.value = false
  selectedParameterForTables.value = null
  selectedTables.value = []
}

async function handleRemoveFromTable(parameter: CustomParameter, tableName: string) {
  try {
    error.value = null
    const currentTables = getParameterTables(parameter.id)
    const tableToRemove = safeAvailableTables.value.find((t) => t.name === tableName)

    if (tableToRemove) {
      const updatedTables = currentTables.filter((id) => id !== tableToRemove.id)
      await updateParameterTables(parameter.id, updatedTables)
      emit('update')
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to remove table mapping'
  }
}

function openAddParameterDialog() {
  isAddingNew.value = true
}

function handleCancelAdd() {
  isAddingNew.value = false
}

// Load parameters on mount
onMounted(async () => {
  try {
    await loadParameters()
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
