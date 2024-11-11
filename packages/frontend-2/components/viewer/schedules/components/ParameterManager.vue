<template>
  <!-- Template content remains unchanged -->
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

      <div class="flex justify-between mb-4">
        <h3 class="text-lg font-medium">Custom Parameters</h3>
        <FormButton text size="sm" color="primary" @click="handleAddParameter">
          Add Parameter
        </FormButton>
      </div>

      <!-- Parameter List -->
      <div class="space-y-4">
        <div v-if="parameters.length === 0" class="text-center text-gray-500 py-4">
          No custom parameters created yet
        </div>

        <div
          v-for="param in parameters"
          :key="param.id"
          class="border rounded p-4 space-y-3"
        >
          <div class="flex justify-between items-center">
            <div class="font-medium">{{ param.name }}</div>
            <div class="flex gap-2">
              <FormButton
                text
                size="sm"
                color="primary"
                @click="() => handleEditParameter(param)"
              >
                Edit
              </FormButton>
              <FormButton
                text
                size="sm"
                color="danger"
                @click="() => handleDeleteParameter(param)"
              >
                Delete
              </FormButton>
            </div>
          </div>

          <div class="text-sm">
            <div>
              <span class="font-medium">Type:</span>
              {{ param.type }}
            </div>
            <div v-if="param.type === 'fixed'">
              <span class="font-medium">Value:</span>
              {{ param.value }}
            </div>
            <div v-else>
              <span class="font-medium">Equation:</span>
              {{ param.equation }}
            </div>
            <div v-if="param.type === 'equation'" class="mt-1 text-gray-500">
              Current value: {{ getParameterValue(param) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Parameter Edit Dialog -->
      <LayoutDialog
        v-if="showEditModal"
        :open="true"
        max-width="md"
        :hide-closer="false"
        mode="out-in"
        :title="editingParameter ? 'Edit Parameter' : 'Add Parameter'"
        :buttons="editDialogButtons"
        @update:open="closeEditModal"
      >
        <div class="p-4 space-y-4">
          <div>
            <label for="param-name" class="block text-sm font-medium mb-1">
              Parameter Name
            </label>
            <input
              id="param-name"
              v-model="editForm.name"
              type="text"
              class="w-full px-3 py-2 border rounded"
              placeholder="Enter parameter name"
            />
            <div v-if="editForm.errors.name" class="text-sm text-red-500 mt-1">
              {{ editForm.errors.name }}
            </div>
          </div>

          <div>
            <label for="param-type" class="block text-sm font-medium mb-1">Type</label>
            <select
              id="param-type"
              v-model="editForm.type"
              class="w-full px-3 py-2 border rounded"
            >
              <option value="fixed">Fixed Value</option>
              <option value="equation">Equation</option>
            </select>
          </div>

          <div v-if="editForm.type === 'fixed'">
            <label for="param-value" class="block text-sm font-medium mb-1">
              Value
            </label>
            <input
              id="param-value"
              v-model="editForm.value"
              type="text"
              class="w-full px-3 py-2 border rounded"
              placeholder="Enter fixed value"
            />
            <div v-if="editForm.errors.value" class="text-sm text-red-500 mt-1">
              {{ editForm.errors.value }}
            </div>
          </div>

          <div v-else>
            <label for="param-equation" class="block text-sm font-medium mb-1">
              Equation
            </label>
            <textarea
              id="param-equation"
              v-model="editForm.equation"
              class="w-full px-3 py-2 border rounded"
              rows="3"
              placeholder="Enter equation (e.g., param1 + param2 * 2)"
            ></textarea>
            <div class="text-sm text-gray-500 mt-1">
              Available parameters: {{ availableParametersText }}
            </div>
            <div class="text-sm text-gray-500 mt-1">
              Available functions: abs, ceil, floor, round, max, min, pow, sqrt
            </div>
            <div v-if="editForm.errors.equation" class="text-sm text-red-500 mt-1">
              {{ editForm.errors.equation }}
            </div>
          </div>
        </div>
      </LayoutDialog>
    </div>
  </LayoutDialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { FormButton, LayoutDialog } from '@speckle/ui-components'
import type { LayoutDialogButton } from '@speckle/ui-components'
import { useUserSettings } from '~/composables/useUserSettings'
import type { CustomParameter } from '~/composables/useUserSettings'
import { evaluateParameter, EquationError } from '../utils/parameterEvaluation'
import type { ElementData } from '../types'

interface Props {
  tableId: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'update'): void
}>()

interface EditForm {
  id?: string
  name: string
  type: 'fixed' | 'equation'
  value?: string
  equation?: string
  errors: {
    name?: string
    value?: string
    equation?: string
  }
}

const { settings, loadSettings, saveSettings } = useUserSettings()

const error = ref<string | null>(null)
const parameters = ref<CustomParameter[]>([])
const showEditModal = ref(false)
const editingParameter = ref<CustomParameter | null>(null)
const editForm = ref<EditForm>({
  name: '',
  type: 'fixed',
  value: '',
  equation: '',
  errors: {}
})

// Mock element data for parameter validation and evaluation
const mockElementData: ElementData = {
  id: 'mock',
  mark: 'mock',
  category: 'mock',
  details: []
}

const dialogButtons = computed<LayoutDialogButton[]>(() => [
  {
    text: 'Close',
    props: {
      submit: false,
      link: false,
      color: 'outline'
    },
    onClick: () => emit('close')
  }
])

const editDialogButtons = computed<LayoutDialogButton[]>(() => [
  {
    text: 'Save',
    props: {
      submit: false,
      link: false,
      color: 'primary'
    },
    onClick: saveParameter
  },
  {
    text: 'Cancel',
    props: {
      submit: false,
      link: false,
      color: 'outline'
    },
    onClick: closeEditModal
  }
])

const availableParametersText = computed(() => {
  const paramNames = parameters.value
    .filter((p) => !editingParameter.value || p.id !== editingParameter.value.id)
    .map((p) => p.name)
    .join(', ')
  return paramNames || 'None'
})

// Load parameters from settings
onMounted(async () => {
  try {
    await loadSettings()
    const currentTable = settings.value?.namedTables?.[props.tableId]
    if (currentTable?.customParameters) {
      parameters.value = [...currentTable.customParameters]
    }
    error.value = null
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load parameters'
  }
})

// Watch for changes and save to settings
watch(
  parameters,
  async (newParameters) => {
    try {
      const currentSettings = settings.value || { namedTables: {} }
      const currentTable = currentSettings.namedTables[props.tableId] || {}

      const updatedSettings = {
        ...currentSettings,
        namedTables: {
          ...currentSettings.namedTables,
          [props.tableId]: {
            ...currentTable,
            customParameters: newParameters
          }
        }
      }

      await saveSettings(updatedSettings)
      emit('update')
      error.value = null
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to save parameters'
    }
  },
  { deep: true }
)

const validateForm = (): boolean => {
  editForm.value.errors = {}
  let isValid = true

  // Validate name
  if (!editForm.value.name) {
    editForm.value.errors.name = 'Name is required'
    isValid = false
  } else if (
    parameters.value.some(
      (p) => p.name === editForm.value.name && p.id !== editForm.value.id
    )
  ) {
    editForm.value.errors.name = 'Parameter name must be unique'
    isValid = false
  }

  // Validate value/equation
  if (editForm.value.type === 'fixed') {
    if (!editForm.value.value) {
      editForm.value.errors.value = 'Value is required'
      isValid = false
    } else if (isNaN(Number(editForm.value.value))) {
      editForm.value.errors.value = 'Value must be a number'
      isValid = false
    }
  } else {
    if (!editForm.value.equation) {
      editForm.value.errors.equation = 'Equation is required'
      isValid = false
    } else {
      try {
        // Try evaluating the equation with mock data to validate syntax
        evaluateParameter(
          {
            id: editForm.value.id || 'temp',
            name: editForm.value.name,
            type: 'equation',
            value: editForm.value.equation,
            field: editForm.value.name,
            header: editForm.value.name,
            category: 'Custom Parameters'
          },
          parameters.value,
          mockElementData
        )
      } catch (err) {
        if (err instanceof EquationError) {
          editForm.value.errors.equation = err.message
          isValid = false
        }
      }
    }
  }

  return isValid
}

const getParameterValue = (param: CustomParameter): string => {
  try {
    const value = evaluateParameter(param, parameters.value, mockElementData)
    return value === null ? 'N/A' : value.toString()
  } catch (err) {
    return err instanceof Error ? err.message : 'Error evaluating parameter'
  }
}

const handleAddParameter = () => {
  editingParameter.value = null
  editForm.value = {
    name: '',
    type: 'fixed',
    value: '',
    equation: '',
    errors: {}
  }
  showEditModal.value = true
}

const handleEditParameter = (param: CustomParameter) => {
  editingParameter.value = param
  editForm.value = {
    id: param.id,
    name: param.name,
    type: param.type,
    value: param.value,
    equation: param.equation,
    errors: {}
  }
  showEditModal.value = true
}

const handleDeleteParameter = (param: CustomParameter) => {
  parameters.value = parameters.value.filter((p) => p.id !== param.id)
}

const closeEditModal = () => {
  showEditModal.value = false
  editingParameter.value = null
}

const saveParameter = () => {
  if (!validateForm()) return

  const paramData: CustomParameter = {
    id: editForm.value.id || Date.now().toString(),
    name: editForm.value.name,
    type: editForm.value.type,
    value: editForm.value.type === 'fixed' ? editForm.value.value : undefined,
    equation: editForm.value.type === 'equation' ? editForm.value.equation : undefined,
    field: editForm.value.name,
    header: editForm.value.name,
    category: 'Custom Parameters',
    removable: true,
    visible: true,
    order: parameters.value.length
  }

  if (editingParameter.value) {
    const index = parameters.value.findIndex((p) => p.id === paramData.id)
    if (index !== -1) {
      parameters.value[index] = paramData
    }
  } else {
    parameters.value.push(paramData)
  }

  closeEditModal()
}

defineOptions({
  name: 'ParameterManager'
})
</script>
