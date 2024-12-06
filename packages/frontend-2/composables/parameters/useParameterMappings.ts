import { ref } from 'vue'
import type { ParameterMappings } from '~/composables/core/types/mappings'
import { useParameterMappingsGraphQL } from './useParameterMappingsGraphQL'
import { debug, DebugCategories } from '~/components/viewer/schedules/debug/useDebug'

interface UseParameterMappingsOptions {
  onError?: (error: string) => void
  onUpdate?: () => void
}

export function useParameterMappings(options?: UseParameterMappingsOptions) {
  const mappings = ref<ParameterMappings>({})
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const { fetchMappings, updateMappings } = useParameterMappingsGraphQL()

  const addParameterToTables = async (
    parameterId: string,
    tableIds: string[]
  ): Promise<void> => {
    try {
      isLoading.value = true
      error.value = null

      debug.startState(DebugCategories.STATE, 'Adding parameter to tables')

      const currentMapping = mappings.value[parameterId] || {
        parameterId,
        tableIds: []
      }

      const updatedTableIds = Array.from(
        new Set([...currentMapping.tableIds, ...tableIds])
      )

      const updatedMappings: ParameterMappings = {
        ...mappings.value,
        [parameterId]: {
          parameterId,
          tableIds: updatedTableIds
        }
      }

      await updateMappings(updatedMappings)
      mappings.value = updatedMappings

      if (options?.onUpdate) {
        options.onUpdate()
      }

      debug.completeState(DebugCategories.STATE, 'Parameter added to tables')
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to add parameter to tables'
      error.value = message
      if (options?.onError) {
        options.onError(message)
      }
      debug.error(DebugCategories.ERROR, 'Failed to add parameter to tables:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Remove parameter from tables
  const removeParameterFromTables = async (
    parameterId: string,
    tableIds: string[]
  ): Promise<void> => {
    try {
      isLoading.value = true
      error.value = null

      debug.startState(DebugCategories.STATE, 'Removing parameter from tables')

      const currentMapping = mappings.value[parameterId]
      if (!currentMapping) return

      const updatedTableIds = currentMapping.tableIds.filter(
        (id) => !tableIds.includes(id)
      )

      const newMappings = { ...mappings.value }

      // If no tables left, remove the mapping entirely
      if (updatedTableIds.length === 0) {
        delete newMappings[parameterId]
      } else {
        newMappings[parameterId] = {
          parameterId,
          tableIds: updatedTableIds
        }
      }

      await updateMappings(newMappings)
      mappings.value = newMappings

      if (options?.onUpdate) {
        options.onUpdate()
      }

      debug.completeState(DebugCategories.STATE, 'Parameter removed from tables')
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to remove parameter from tables'
      error.value = message
      if (options?.onError) {
        options.onError(message)
      }
      debug.error(DebugCategories.ERROR, 'Failed to remove parameter from tables:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Save mappings function
  const saveMappings = async (mappings: ParameterMappings): Promise<boolean> => {
    try {
      await updateMappings(mappings)
      return true
    } catch (err) {
      return false
    }
  }

  // Bulk operations
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
        delete currentMappings[parameterId]
      } else {
        currentMappings[parameterId] = {
          parameterId,
          tableIds: tableIds.filter((id) => id) // Filter out any undefined/null
        }
      }

      const success = await saveMappings(currentMappings)
      if (!success) {
        throw new Error('Failed to save mappings')
      }

      if (options?.onUpdate) options.onUpdate()

      debug.completeState(
        DebugCategories.PARAMETERS,
        'Parameter table mappings updated'
      )
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to update parameter tables:', err)
      const message =
        err instanceof Error ? err.message : 'Failed to update parameter tables'
      if (options?.onError) options.onError(message)
      throw new Error(message)
    }
  }

  const loadMappings = async (): Promise<void> => {
    try {
      isLoading.value = true
      error.value = null

      const fetchedMappings = await fetchMappings()
      mappings.value = fetchedMappings

      debug.log(DebugCategories.STATE, 'Mappings loaded', {
        mappingsCount: Object.keys(fetchedMappings).length
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load mappings'
      error.value = message
      debug.error(DebugCategories.ERROR, 'Failed to load mappings:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const getTablesForParameter = (parameterId: string): string[] => {
    return mappings.value[parameterId]?.tableIds || []
  }

  const getParametersForTable = (tableId: string): string[] => {
    return Object.entries(mappings.value)
      .filter(([_, mapping]) => mapping.tableIds.includes(tableId))
      .map(([parameterId]) => parameterId)
  }

  return {
    mappings,
    isLoading,
    error,
    loadMappings,
    getTablesForParameter,
    getParametersForTable,
    addParameterToTables,
    removeParameterFromTables,
    updateParameterTables
  }
}
