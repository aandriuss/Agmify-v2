import { debug, DebugCategories } from '~/components/viewer/schedules/debug/useDebug'
import type { CustomParameter, UserSettings } from '~/composables/core/types'

interface UseParameterOperationsOptions {
  settings: { value: UserSettings }
  saveSettings: (settings: UserSettings) => Promise<boolean>
}

export function useParameterOperations(options: UseParameterOperationsOptions) {
  const { settings, saveSettings } = options

  async function saveParameterUpdates(
    updatedParameters: Record<string, CustomParameter>
  ) {
    const updatedSettings = {
      ...settings.value,
      customParameters: updatedParameters
    }

    const success = await saveSettings(updatedSettings)
    if (!success) {
      throw new Error('Failed to save parameters')
    }

    return updatedParameters
  }

  async function createParameter(
    parameter: Omit<CustomParameter, 'id'>
  ): Promise<CustomParameter> {
    debug.startState(DebugCategories.PARAMETERS, 'Creating new parameter', {
      parameter
    })

    const currentParameters = settings.value.customParameters || {}
    const newId = `param-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const newParameter: CustomParameter = {
      ...parameter,
      id: newId
    }

    const updatedParameters = {
      ...currentParameters,
      [newId]: newParameter
    }

    await saveParameterUpdates(updatedParameters)

    debug.completeState(DebugCategories.PARAMETERS, 'Parameter created', {
      newParameter
    })

    return newParameter
  }

  async function updateParameter(
    parameterId: string,
    updates: Partial<CustomParameter>
  ): Promise<CustomParameter> {
    debug.startState(DebugCategories.PARAMETERS, 'Updating parameter', {
      parameterId,
      updates
    })

    const currentParameters = settings.value.customParameters || {}
    const existingParameter = currentParameters[parameterId]

    if (!existingParameter) {
      throw new Error('Parameter not found')
    }

    const updatedParameter = {
      ...existingParameter,
      ...updates
    }

    const updatedParameters = {
      ...currentParameters,
      [parameterId]: updatedParameter
    }

    await saveParameterUpdates(updatedParameters)

    debug.completeState(DebugCategories.PARAMETERS, 'Parameter updated', {
      updatedParameter
    })

    return updatedParameter
  }

  async function deleteParameter(parameterId: string): Promise<void> {
    debug.startState(DebugCategories.PARAMETERS, 'Deleting parameter', {
      parameterId
    })

    const currentParameters = settings.value.customParameters || {}
    const { [parameterId]: removed, ...updatedParameters } = currentParameters

    // Remove parameter reference from all tables
    const updatedTables = Object.entries(settings.value.namedTables).reduce(
      (acc, [tableId, table]) => ({
        ...acc,
        [tableId]: {
          ...table,
          selectedParameterIds: (table.selectedParameterIds || []).filter(
            (id) => id !== parameterId
          )
        }
      }),
      {}
    )

    const updatedSettings = {
      ...settings.value,
      customParameters: updatedParameters,
      namedTables: updatedTables
    }

    const success = await saveSettings(updatedSettings)
    if (!success) {
      throw new Error('Failed to delete parameter')
    }

    debug.completeState(DebugCategories.PARAMETERS, 'Parameter deleted', {
      parameterId
    })
  }

  // Table parameter selection operations
  async function addParameterToTable(
    tableId: string,
    parameterId: string
  ): Promise<void> {
    const currentTable = settings.value.namedTables[tableId]
    if (!currentTable) {
      throw new Error('Table not found')
    }

    const selectedParameterIds = new Set([
      ...(currentTable.selectedParameterIds || []),
      parameterId
    ])

    const updatedTable = {
      ...currentTable,
      selectedParameterIds: Array.from(selectedParameterIds)
    }

    const updatedSettings = {
      ...settings.value,
      namedTables: {
        ...settings.value.namedTables,
        [tableId]: updatedTable
      }
    }

    await saveSettings(updatedSettings)
  }

  async function removeParameterFromTable(
    tableId: string,
    parameterId: string
  ): Promise<void> {
    const currentTable = settings.value.namedTables[tableId]
    if (!currentTable) {
      throw new Error('Table not found')
    }

    const updatedTable = {
      ...currentTable,
      selectedParameterIds: (currentTable.selectedParameterIds || []).filter(
        (id) => id !== parameterId
      )
    }

    const updatedSettings = {
      ...settings.value,
      namedTables: {
        ...settings.value.namedTables,
        [tableId]: updatedTable
      }
    }

    await saveSettings(updatedSettings)
  }

  // Helper to get parameters for a table
  function getTableParameters(tableId: string): CustomParameter[] {
    const table = settings.value.namedTables[tableId]
    if (!table) return []

    return (table.selectedParameterIds || [])
      .map((id) => settings.value.customParameters[id])
      .filter((param): param is CustomParameter => !!param)
  }

  return {
    createParameter,
    updateParameter,
    deleteParameter,
    addParameterToTable,
    removeParameterFromTable,
    getTableParameters
  }
}
