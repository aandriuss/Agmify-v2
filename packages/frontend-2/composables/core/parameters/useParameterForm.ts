import { ref } from 'vue'
import type { UserParameter, PrimitiveValue } from '~/composables/core/types'
import { debug, DebugCategories } from '~/composables/core/utils/debug'

export interface ParameterFormData {
  id?: string
  name: string
  type: 'fixed' | 'equation'
  value?: PrimitiveValue
  equation?: string
  group: string
  errors: Record<string, string>
}

interface UseParameterFormOptions {
  onSave: (data: Omit<UserParameter, 'id'>) => Promise<void>
  onError?: (error: string) => void
}

export class ParameterFormError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ParameterFormError'
  }
}

/**
 * Hook for parameter form handling
 * Manages parameter creation and editing forms with validation
 */
export function useParameterForm({ onSave, onError }: UseParameterFormOptions) {
  const showEditModal = ref(false)
  const editingParameter = ref<UserParameter | null>(null)
  const form = ref<ParameterFormData>({
    name: '',
    type: 'fixed',
    value: '',
    equation: '',
    group: 'Custom',
    errors: {}
  })

  const handleError = (err: unknown) => {
    const message = err instanceof Error ? err.message : 'An unknown error occurred'
    if (onError) onError(message)
    throw new ParameterFormError(message)
  }

  const handleAddParameter = () => {
    try {
      debug.startState(DebugCategories.PARAMETERS, 'Initializing add parameter form')

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

      debug.completeState(DebugCategories.PARAMETERS, 'Add parameter form initialized')
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to initialize add form:', err)
      handleError(err)
    }
  }

  const handleEditParameter = (parameter: UserParameter) => {
    try {
      debug.startState(DebugCategories.PARAMETERS, 'Initializing edit parameter form', {
        parameterId: parameter.id
      })

      editingParameter.value = parameter
      form.value = {
        id: parameter.id,
        name: parameter.name,
        type: parameter.type,
        value:
          typeof parameter.value === 'string' ||
          typeof parameter.value === 'number' ||
          typeof parameter.value === 'boolean'
            ? parameter.value
            : '',
        equation: parameter.equation || '',
        group: parameter.group || 'Custom',
        errors: {}
      }
      showEditModal.value = true

      debug.completeState(DebugCategories.PARAMETERS, 'Edit parameter form initialized')
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to initialize edit form:', err)
      handleError(err)
    }
  }

  const closeEditModal = () => {
    try {
      debug.startState(DebugCategories.PARAMETERS, 'Closing parameter form')

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

      debug.completeState(DebugCategories.PARAMETERS, 'Parameter form closed')
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to close form:', err)
      handleError(err)
    }
  }

  const validateForm = (): boolean => {
    try {
      debug.startState(DebugCategories.PARAMETERS, 'Validating parameter form')

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
        }
      } else if (!form.value.equation) {
        errors.equation = 'Equation is required'
        isValid = false
      }

      form.value.errors = errors

      debug.completeState(DebugCategories.PARAMETERS, 'Form validation complete', {
        isValid,
        errors
      })

      return isValid
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Form validation failed:', err)
      handleError(err)
      return false
    }
  }

  const saveParameter = async () => {
    try {
      if (!validateForm()) return

      debug.startState(DebugCategories.PARAMETERS, 'Saving parameter')

      await onSave({
        kind: 'user',
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

      debug.completeState(DebugCategories.PARAMETERS, 'Parameter saved successfully')
      closeEditModal()
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to save parameter:', err)
      form.value.errors.general =
        err instanceof Error ? err.message : 'Failed to save parameter'
      handleError(err)
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
