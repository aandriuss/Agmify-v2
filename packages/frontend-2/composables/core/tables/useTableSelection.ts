import { ref, computed } from 'vue'
import type { Ref } from 'vue'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import type { UserParameter } from '~/composables/core/types'

export interface Table {
  id: string
  name: string
  selectedParameterIds?: string[]
}

export interface UseTableSelectionOptions {
  tables: Ref<Record<string, Table>>
  onTableSelectionChange: (
    parameterId: string,
    selectedTables: string[]
  ) => Promise<void>
  onError?: (error: string) => void
}

export class TableSelectionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TableSelectionError'
  }
}

/**
 * Hook for managing parameter-table associations
 * Handles table selection and parameter assignments
 */
export function useTableSelection({
  tables,
  onTableSelectionChange,
  onError
}: UseTableSelectionOptions) {
  const selectedTables = ref<string[]>([])
  const selectedParameter = ref<UserParameter | null>(null)
  const showSelectionModal = ref(false)

  const handleError = (err: unknown) => {
    const message = err instanceof Error ? err.message : 'An unknown error occurred'
    if (onError) onError(message)
    throw new TableSelectionError(message)
  }

  const availableTables = computed(() => {
    try {
      debug.startState(DebugCategories.TABLE_DATA, 'Getting available tables')

      const result = Object.entries(tables.value).map(([id, table]) => ({
        id,
        name: table.name
      }))

      debug.completeState(DebugCategories.TABLE_DATA, 'Available tables retrieved', {
        tableCount: result.length
      })

      return result
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to get available tables:', err)
      handleError(err)
      return []
    }
  })

  const getUsedInTables = (parameterId: string): string => {
    try {
      debug.startState(DebugCategories.TABLE_DATA, 'Getting tables using parameter', {
        parameterId
      })

      const usedIn = Object.values(tables.value)
        .filter((table) => table.selectedParameterIds?.includes(parameterId))
        .map((table) => table.name)

      const result = usedIn.length ? usedIn.join(', ') : 'Not used in any table'

      debug.completeState(
        DebugCategories.TABLE_DATA,
        'Tables using parameter retrieved',
        {
          tableCount: usedIn.length
        }
      )

      return result
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to get tables using parameter:', err)
      handleError(err)
      return 'Error retrieving table usage'
    }
  }

  const showTableSelection = (parameter: UserParameter) => {
    try {
      debug.startState(DebugCategories.TABLE_UPDATES, 'Showing table selection', {
        parameterId: parameter.id
      })

      selectedParameter.value = parameter
      selectedTables.value = Object.entries(tables.value)
        .filter(([, table]) => table.selectedParameterIds?.includes(parameter.id))
        .map(([id]) => id)
      showSelectionModal.value = true

      debug.completeState(DebugCategories.TABLE_UPDATES, 'Table selection shown', {
        selectedTableCount: selectedTables.value.length
      })
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to show table selection:', err)
      handleError(err)
    }
  }

  const saveTableSelection = async () => {
    if (!selectedParameter.value) return

    try {
      debug.startState(DebugCategories.TABLE_UPDATES, 'Saving table selection', {
        parameterId: selectedParameter.value.id,
        selectedTables: selectedTables.value
      })

      await onTableSelectionChange(selectedParameter.value.id, selectedTables.value)
      closeSelectionModal()

      debug.completeState(DebugCategories.TABLE_UPDATES, 'Table selection saved')
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to save table selection:', err)
      handleError(err)
    }
  }

  const closeSelectionModal = () => {
    try {
      debug.startState(DebugCategories.TABLE_UPDATES, 'Closing selection modal')

      showSelectionModal.value = false
      selectedParameter.value = null
      selectedTables.value = []

      debug.completeState(DebugCategories.TABLE_UPDATES, 'Selection modal closed')
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to close selection modal:', err)
      handleError(err)
    }
  }

  return {
    selectedTables,
    selectedParameter,
    showSelectionModal,
    availableTables,
    getUsedInTables,
    showTableSelection,
    saveTableSelection,
    closeSelectionModal
  }
}
