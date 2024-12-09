import { ref, computed } from 'vue'
import type { Ref } from 'vue'
import type { UserParameter } from '~/composables/core/types'

interface Table {
  id: string
  name: string
  selectedParameterIds?: string[]
}

interface UseTableSelectionOptions {
  tables: Ref<Record<string, Table>>
  onTableSelectionChange: (
    parameterId: string,
    selectedTables: string[]
  ) => Promise<void>
}

export function useTableSelection({
  tables,
  onTableSelectionChange
}: UseTableSelectionOptions) {
  const selectedTables = ref<string[]>([])
  const selectedParameter = ref<UserParameter | null>(null)
  const showSelectionModal = ref(false)

  const availableTables = computed(() =>
    Object.entries(tables.value).map(([id, table]) => ({
      id,
      name: table.name
    }))
  )

  const getUsedInTables = (parameterId: string): string => {
    const usedIn = Object.values(tables.value)
      .filter((table) => table.selectedParameterIds?.includes(parameterId))
      .map((table) => table.name)

    return usedIn.length ? usedIn.join(', ') : 'Not used in any table'
  }

  const showTableSelection = (parameter: UserParameter) => {
    selectedParameter.value = parameter
    selectedTables.value = Object.entries(tables.value)
      .filter(([, table]) => table.selectedParameterIds?.includes(parameter.id))
      .map(([id]) => id)
    showSelectionModal.value = true
  }

  const saveTableSelection = async () => {
    if (!selectedParameter.value) return

    try {
      await onTableSelectionChange(selectedParameter.value.id, selectedTables.value)
      closeSelectionModal()
    } catch (err) {
      console.error('Failed to save table selection:', err)
    }
  }

  const closeSelectionModal = () => {
    showSelectionModal.value = false
    selectedParameter.value = null
    selectedTables.value = []
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
