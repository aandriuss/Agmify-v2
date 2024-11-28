import { ref } from 'vue'
import type { CustomParameter, NewCustomParameter } from '../../types'
import type { UserSettings } from '~/composables/settings/types/scheduleTypes'

interface UseParameterOperationsOptions {
  settings: Ref<UserSettings | null>
  saveSettings: (settings: UserSettings) => Promise<void>
  onError?: (error: string) => void
  onUpdate?: () => void
}

export function useParameterOperations({
  settings,
  saveSettings,
  onError,
  onUpdate
}: UseParameterOperationsOptions) {
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const handleError = (err: unknown) => {
    const message = err instanceof Error ? err.message : 'An unknown error occurred'
    error.value = message
    if (onError) onError(message)
  }

  const createParameter = async (
    parameter: NewCustomParameter
  ): Promise<CustomParameter> => {
    try {
      isLoading.value = true
      error.value = null

      if (!parameter?.name || !parameter?.type) {
        throw new Error('Parameter name and type are required')
      }

      if (!settings.value) {
        throw new Error('Settings not initialized')
      }

      // Create new parameter with ID
      const newParameter: CustomParameter = {
        ...parameter,
        id: `param-${Date.now()}`,
        field: parameter.name,
        header: parameter.name,
        visible: true,
        removable: true,
        order: 0,
        category: 'Custom Parameters'
      }

      // Update settings with new parameter
      const updatedSettings: UserSettings = {
        ...settings.value,
        customParameters: {
          ...settings.value.customParameters,
          [newParameter.id]: newParameter
        }
      }

      // Save updated settings
      await saveSettings(updatedSettings)

      if (onUpdate) onUpdate()
      return newParameter
    } catch (err) {
      console.error('Error in createParameter:', err)
      handleError(err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const updateParameter = async (
    id: string,
    updates: Partial<CustomParameter>
  ): Promise<CustomParameter> => {
    try {
      isLoading.value = true
      error.value = null

      if (!settings.value?.customParameters[id]) {
        throw new Error('Parameter not found')
      }

      const updatedParameter: CustomParameter = {
        ...settings.value.customParameters[id],
        ...updates
      }

      const updatedSettings: UserSettings = {
        ...settings.value,
        customParameters: {
          ...settings.value.customParameters,
          [id]: updatedParameter
        }
      }

      await saveSettings(updatedSettings)

      if (onUpdate) onUpdate()
      return updatedParameter
    } catch (err) {
      handleError(err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const deleteParameter = async (id: string): Promise<void> => {
    try {
      isLoading.value = true
      error.value = null

      if (!settings.value?.customParameters[id]) {
        throw new Error('Parameter not found')
      }

      const { [id]: _, ...remainingParameters } = settings.value.customParameters

      const updatedSettings: UserSettings = {
        ...settings.value,
        customParameters: remainingParameters
      }

      await saveSettings(updatedSettings)

      if (onUpdate) onUpdate()
    } catch (err) {
      handleError(err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const addParameterToTable = async (
    tableId: string,
    parameterId: string
  ): Promise<void> => {
    try {
      isLoading.value = true
      error.value = null

      if (!settings.value?.namedTables[tableId]) {
        throw new Error('Table not found')
      }

      const table = settings.value.namedTables[tableId]
      const selectedParameterIds = [...(table.selectedParameterIds || []), parameterId]

      const updatedSettings: UserSettings = {
        ...settings.value,
        namedTables: {
          ...settings.value.namedTables,
          [tableId]: {
            ...table,
            selectedParameterIds
          }
        }
      }

      await saveSettings(updatedSettings)

      if (onUpdate) onUpdate()
    } catch (err) {
      handleError(err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const removeParameterFromTable = async (
    tableId: string,
    parameterId: string
  ): Promise<void> => {
    try {
      isLoading.value = true
      error.value = null

      if (!settings.value?.namedTables[tableId]) {
        throw new Error('Table not found')
      }

      const table = settings.value.namedTables[tableId]
      const selectedParameterIds = (table.selectedParameterIds || []).filter(
        (id) => id !== parameterId
      )

      const updatedSettings: UserSettings = {
        ...settings.value,
        namedTables: {
          ...settings.value.namedTables,
          [tableId]: {
            ...table,
            selectedParameterIds
          }
        }
      }

      await saveSettings(updatedSettings)

      if (onUpdate) onUpdate()
    } catch (err) {
      handleError(err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  return {
    isLoading,
    error,
    createParameter,
    updateParameter,
    deleteParameter,
    addParameterToTable,
    removeParameterFromTable
  }
}
