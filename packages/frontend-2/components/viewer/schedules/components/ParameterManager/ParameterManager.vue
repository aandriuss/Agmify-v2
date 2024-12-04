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
      <!-- Error Alert -->
      <div
        v-if="error"
        class="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-600"
      >
        {{ error }}
      </div>

      <div class="space-y-6">
        <!-- Parameter Groups -->
        <div v-for="group in groupedParameters" :key="group.name">
          <ParameterList
            :group-name="group.name"
            :parameters="group.parameters"
            :show-add-button="group.name === 'Custom'"
            @add="openAddParameterDialog"
          >
            <template #parameter="{ parameter }">
              <ParameterCard
                :parameter="parameter"
                :used-in-tables="getUsedInTables(parameter.id)"
                :current-value="evaluateParameter(parameter)"
                @edit="handleEdit"
                @delete="handleDelete"
                @add-to-tables="handleAddToTables"
              />
            </template>
          </ParameterList>
        </div>
      </div>

      <!-- Edit Dialog -->
      <ParameterEditDialog
        v-if="showParameterDialog"
        :model-value="parameterForm"
        :available-parameters="availableParametersText"
        @update:model-value="(val: ParameterFormData) => (parameterForm = val)"
        @save="handleSaveParameter"
        @close="closeParameterDialog"
      />

      <!-- Table Selection Dialog -->
      <TableSelectionDialog
        v-if="showTableSelectionModal"
        v-model:selected-tables="selectedTables"
        :available-tables="availableTables"
        :parameter="selectedParameterForTables"
        @save="saveTableSelection"
        @close="closeSelectionModal"
      />
    </div>
  </LayoutDialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { LayoutDialogButton } from '@speckle/ui-components'
import { useUserSettings } from '~/composables/useUserSettings'
import { useParameterOperations } from '~/composables/settings/useParameterOperations'
import { useParameterGroups } from '../../composables/parameters/useParameterGroups'
import { useParameterEvaluation } from '../../composables/parameters/useParameterEvaluation'
import { useTableSelection } from '../../composables/parameters/useTableSelection'
import type {
  CustomParameter,
  NewCustomParameter,
  ParameterFormData
} from '~/composables/core/types'

// Components
import ParameterList from './ParameterList.vue'
import ParameterCard from './ParameterCard.vue'
import ParameterEditDialog from './ParameterEditDialog.vue'
import TableSelectionDialog from './TableSelectionDialog.vue'

const props = defineProps<{
  tableId: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'update'): void
}>()

// State
const error = ref<string | null>(null)
const showParameterDialog = ref(false)
const showTableSelectionModal = ref(false)
const selectedParameterForTables = ref<CustomParameter | null>(null)
const editingParameter = ref<CustomParameter | null>(null)

// Parameter form state with default values
const parameterForm = ref<ParameterFormData>({
  name: '',
  type: 'fixed' as const,
  value: '',
  equation: '',
  group: 'Custom',
  errors: {
    name: '',
    value: '',
    equation: ''
  }
})

// Services
const { settings, loadSettings, saveSettings } = useUserSettings()

onMounted(async () => {
  try {
    await loadSettings()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load settings'
  }
})

// Parameter Operations with error handling
const {
  createParameter,
  updateParameter,
  deleteParameter,
  addParameterToTable,
  removeParameterFromTable
} = useParameterOperations({
  settings,
  saveSettings: async (updatedSettings) => {
    try {
      await saveSettings(updatedSettings)
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to save settings'
      return false
    }
  }
})

// Safe access to all parameters
const allParameters = computed(() => {
  return (
    settings.value?.customParameters
      ? Object.values(settings.value.customParameters)
      : []
  ) as CustomParameter[]
})

// Groups
const { groupedParameters } = useParameterGroups({
  parameters: allParameters
})

// Table Selection with safe access to settings
const {
  selectedTables,
  availableTables,
  getUsedInTables,
  saveTableSelection,
  closeSelectionModal
} = useTableSelection({
  tables: computed(() => settings.value?.namedTables ?? {}),
  onTableSelectionChange: async (parameterId: string, tableIds: string[]) => {
    if (!settings.value?.namedTables) return

    const currentTables = Object.entries(settings.value.namedTables)
      .filter(([, table]) => table.selectedParameterIds?.includes(parameterId))
      .map(([id]) => id)

    for (const tableId of currentTables) {
      if (!tableIds.includes(tableId)) {
        await removeParameterFromTable(tableId, parameterId)
      }
    }

    for (const tableId of tableIds) {
      if (!currentTables.includes(tableId)) {
        await addParameterToTable(tableId, parameterId)
      }
    }
  }
})

// Safe parameter evaluation
const { evaluateParameter } = useParameterEvaluation({
  parameters: allParameters
})

// Methods
const validateForm = (): boolean => {
  const errors: Record<string, string> = {}
  let isValid = true

  // Validate name
  if (!parameterForm.value?.name?.trim()) {
    errors.name = 'Name is required'
    isValid = false
  }

  // Validate based on type
  if (parameterForm.value?.type === 'fixed') {
    const value = parameterForm.value?.value?.trim()
    if (!value && value !== '0') {
      // Allow '0' as a valid value
      errors.value = 'Value is required'
      isValid = false
    } else if (isNaN(Number(value))) {
      errors.value = 'Value must be a number'
      isValid = false
    }
  } else if (parameterForm.value?.type === 'equation') {
    if (!parameterForm.value?.equation?.trim()) {
      errors.equation = 'Equation is required'
      isValid = false
    }
  }

  // Update form with new errors
  parameterForm.value = {
    ...parameterForm.value,
    errors
  }

  return isValid
}

const handleSaveParameter = async () => {
  try {
    if (!validateForm()) {
      return
    }

    // Create a safe copy of the data with all required fields
    const paramData: NewCustomParameter = {
      name: parameterForm.value.name,
      type: parameterForm.value.type,
      field: parameterForm.value.name,
      header: parameterForm.value.name,
      group: parameterForm.value.group,
      category: 'Custom Parameters',
      visible: true,
      removable: true,
      order: 0
    }

    // Add type-specific fields
    if (parameterForm.value.type === 'fixed') {
      paramData.value = parameterForm.value.value?.trim() ?? '0'
      paramData.equation = undefined
    } else {
      paramData.equation = parameterForm.value.equation?.trim() || ''
      paramData.value = undefined
    }

    if (editingParameter.value) {
      await updateParameter(editingParameter.value.id, paramData)
    } else {
      const newParam = await createParameter(paramData)
      if (props.tableId) {
        await addParameterToTable(props.tableId, newParam.id)
      }
    }

    await loadSettings()
    emit('update')
    // Only close the parameter edit dialog
    closeParameterDialog()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to save parameter'
  }
}

// Computed
const availableParametersText = computed(() => {
  return allParameters.value
    .filter((p) => !editingParameter.value || p.id !== editingParameter.value.id)
    .map((p) => p.name)
    .join(', ')
})

// Dialog buttons
const dialogButtons = computed<LayoutDialogButton[]>(() => [
  {
    text: 'Close',
    props: { color: 'outline' },
    onClick: () => emit('close')
  }
])

// Methods
const openAddParameterDialog = () => {
  editingParameter.value = null
  parameterForm.value = {
    name: '',
    type: 'fixed' as const,
    value: '',
    equation: '',
    group: 'Custom',
    errors: {}
  }
  showParameterDialog.value = true
}

const handleEdit = (parameter: CustomParameter) => {
  editingParameter.value = parameter
  parameterForm.value = {
    name: parameter.name,
    type: parameter.type,
    value: parameter.value || '',
    equation: parameter.equation || '',
    group: parameter.group || 'Custom',
    errors: {}
  }
  showParameterDialog.value = true
}

const handleDelete = async (parameter: CustomParameter) => {
  try {
    await deleteParameter(parameter.id)
    emit('update')
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to delete parameter'
  }
}

const handleAddToTables = (parameter: CustomParameter) => {
  selectedParameterForTables.value = parameter
  showTableSelectionModal.value = true
}

const closeParameterDialog = () => {
  showParameterDialog.value = false
  editingParameter.value = null
  parameterForm.value = {
    name: '',
    type: 'fixed',
    value: '',
    equation: '',
    group: 'Custom',
    errors: {}
  }
}

// Expose error handling
defineExpose({
  handleError: (err: Error | unknown) => {
    error.value = err instanceof Error ? err.message : 'An error occurred'
  }
})
</script>

<style scoped>
.dialog-content {
  max-height: 70vh;
  overflow-y: auto;
}
</style>
