import { debug, DebugCategories } from '~/composables/core/utils/debug'
import { useParameterMappingsState } from './useParameterMappingsState'
import type { ParameterMappings, ParameterTableMapping } from '~/composables/core/types'

interface UseParameterMappingOperationsOptions {
  onError?: (error: string) => void
  onUpdate?: () => void
}

export function useParameterMappingOperations(
  options?: UseParameterMappingOperationsOptions
) {
  const { mappings, saveMappings } = useParameterMappingsState()

  const handleError = (err: unknown) => {
    const message = err instanceof Error ? err.message : 'An unknown error occurred'
    if (options?.onError) options.onError(message)
  }

  async function addTableToParameter(
    parameterId: string,
    tableId: string
  ): Promise<void> {
    try {
      debug.startState(
        DebugCategories.PARAMETERS,
        'Adding table to parameter mapping',
        {
          parameterId,
          tableId
        }
      )

      const currentMappings = { ...mappings.value }
      const currentMapping = currentMappings[parameterId] || {
        parameterId,
        tableIds: []
      }

      // Check if table is already added
      if (currentMapping.tableIds.includes(tableId)) {
        debug.log(DebugCategories.PARAMETERS, 'Table already mapped to parameter')
        return
      }

      const updatedMapping: ParameterTableMapping = {
        parameterId,
        tableIds: [...currentMapping.tableIds, tableId]
      }

      const updatedMappings: ParameterMappings = {
        ...currentMappings,
        [parameterId]: updatedMapping
      }

      await saveMappings(updatedMappings)

      if (options?.onUpdate) options.onUpdate()
      debug.completeState(
        DebugCategories.PARAMETERS,
        'Table added to parameter mapping'
      )
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to add table to parameter:', err)
      handleError(err)
      throw err
    }
  }

  async function removeTableFromParameter(
    parameterId: string,
    tableId: string
  ): Promise<void> {
    try {
      debug.startState(
        DebugCategories.PARAMETERS,
        'Removing table from parameter mapping',
        {
          parameterId,
          tableId
        }
      )

      const currentMappings = { ...mappings.value }
      const currentMapping = currentMappings[parameterId]

      if (!currentMapping) {
        debug.log(DebugCategories.PARAMETERS, 'No mapping found for parameter')
        return
      }

      const updatedTableIds = currentMapping.tableIds.filter((id) => id !== tableId)
      const updatedMappings = { ...currentMappings }

      if (updatedTableIds.length === 0) {
        // Remove mapping entirely if no tables left
        delete updatedMappings[parameterId]
      } else {
        updatedMappings[parameterId] = {
          parameterId,
          tableIds: updatedTableIds
        }
      }

      await saveMappings(updatedMappings)

      if (options?.onUpdate) options.onUpdate()
      debug.completeState(
        DebugCategories.PARAMETERS,
        'Table removed from parameter mapping'
      )
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to remove table from parameter:', err)
      handleError(err)
      throw err
    }
  }

  async function updateParameterTables(
    parameterId: string,
    tableIds: string[]
  ): Promise<void> {
    try {
      debug.startState(
        DebugCategories.PARAMETERS,
        'Updating parameter table mappings',
        {
          parameterId,
          tableCount: tableIds.length
        }
      )

      const currentMappings = { ...mappings.value }

      if (tableIds.length === 0) {
        // Remove mapping entirely if no tables
        delete currentMappings[parameterId]
      } else {
        currentMappings[parameterId] = {
          parameterId,
          tableIds
        }
      }

      await saveMappings(currentMappings)

      if (options?.onUpdate) options.onUpdate()
      debug.completeState(
        DebugCategories.PARAMETERS,
        'Parameter table mappings updated'
      )
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to update parameter tables:', err)
      handleError(err)
      throw err
    }
  }

  function getParameterTables(parameterId: string): string[] {
    return mappings.value[parameterId]?.tableIds || []
  }

  function getTableParameters(tableId: string): string[] {
    return Object.values(mappings.value)
      .filter((mapping) => mapping.tableIds.includes(tableId))
      .map((mapping) => mapping.parameterId)
  }

  return {
    addTableToParameter,
    removeTableFromParameter,
    updateParameterTables,
    getParameterTables,
    getTableParameters
  }
}
