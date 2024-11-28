import { ref } from 'vue'
import type { CustomParameter, ParameterFormData } from '../../types'

interface UseParameterFormOptions {
  onSave: (data: Omit<CustomParameter, 'id'>) => Promise<void>
}

export function useParameterForm({ onSave }: UseParameterFormOptions) {
  const showEditModal = ref(false)
  const editingParameter = ref<CustomParameter | null>(null)
  const form = ref<ParameterFormData>({
    name: '',
    type: 'fixed',
    value: '',
    equation: '',
    group: 'Custom',
    errors: {}
  })

  const handleAddParameter = () => {
    editingParameter.value = null
    form.value = {
      name: '',
      type: 'fixed',
      value: '',
      equation: '',
      group: 'Custom',
      errors: {}
    }
    showEditModal.value = true
  }

  const handleEditParameter = (parameter: CustomParameter) => {
    editingParameter.value = parameter
    form.value = {
      id: parameter.id,
      name: parameter.name,
      type: parameter.type,
      value: parameter.value || '',
      equation: parameter.equation || '',
      group: parameter.group || 'Custom',
      errors: {}
    }
    showEditModal.value = true
  }

  const closeEditModal = () => {
    showEditModal.value = false
    editingParameter.value = null
    form.value = {
      name: '',
      type: 'fixed',
      value: '',
      equation: '',
      group: 'Custom',
      errors: {}
    }
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}
    let isValid = true

    if (!form.value.name) {
      errors.name = 'Name is required'
      isValid = false
    }

    if (form.value.type === 'fixed') {
      if (!form.value.value) {
        errors.value = 'Value is required'
        isValid = false
      } else if (isNaN(Number(form.value.value))) {
        errors.value = 'Value must be a number'
        isValid = false
      }
    } else if (!form.value.equation) {
      errors.equation = 'Equation is required'
      isValid = false
    }

    form.value.errors = errors
    return isValid
  }

  const saveParameter = async () => {
    if (!validateForm()) return

    try {
      await onSave({
        name: form.value.name,
        type: form.value.type,
        value: form.value.type === 'fixed' ? form.value.value : undefined,
        equation: form.value.type === 'equation' ? form.value.equation : undefined,
        field: form.value.name,
        header: form.value.name,
        group: form.value.group,
        category: 'Custom Parameters',
        removable: true,
        visible: true,
        order: 0
      })
      closeEditModal()
    } catch (error) {
      console.error('Failed to save parameter:', error)
      form.value.errors.general =
        error instanceof Error ? error.message : 'Failed to save parameter'
    }
  }

  return {
    form,
    showEditModal,
    editingParameter,
    handleAddParameter,
    handleEditParameter,
    saveParameter,
    closeEditModal,
    validateForm
  }
}
