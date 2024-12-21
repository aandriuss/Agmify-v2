import { computed } from 'vue'
import type { Ref } from 'vue'
import type { SelectedParameter } from '../types/parameters/parameter-states'
import { useColumnState } from '../tables/state/useColumnState'
import { createTableColumn } from '../types/tables/table-column'
import type { TableColumn } from '../types/tables/table-column'

export interface UseParameterColumnsOptions {
  parameters: SelectedParameter[]
  searchTerm: Ref<string>
  isGrouped: Ref<boolean>
  sortBy: Ref<'name' | 'category' | 'type' | 'fixed'>
  onError?: (error: string) => void
}

export class ParameterColumnError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ParameterColumnError'
  }
}

/**
 * Hook for managing parameter-based table columns
 * Handles parameter filtering and grouping in the context of table columns
 */
export function useParameterColumns({
  parameters,
  onError
}: UseParameterColumnsOptions) {
  const handleError = (err: unknown) => {
    const message = err instanceof Error ? err.message : 'An unknown error occurred'
    if (onError) onError(message)
    throw new ParameterColumnError(message)
  }

  try {
    // Create refs for filtered and grouped parameters
    const filteredParameters = computed(() => parameters)
    const groupedParameters = computed(() => {
      const groups = new Map<string, SelectedParameter[]>()

      for (const param of parameters) {
        const category = param.category || 'Uncategorized'
        if (!groups.has(category)) {
          groups.set(category, [])
        }
        groups.get(category)?.push(param)
      }

      return Array.from(groups.entries()).map(([category, parameters]) => ({
        category,
        parameters
      }))
    })

    // Use column state for managing columns
    const { addColumn } = useColumnState({ onError })

    const filteredColumns = computed<TableColumn[]>(() => {
      try {
        return filteredParameters.value.map(createTableColumn)
      } catch (err) {
        handleError(err)
        return []
      }
    })

    const groupedColumns = computed<Array<{ name: string; parameters: TableColumn[] }>>(
      () => {
        try {
          return groupedParameters.value.map((group) => ({
            name: group.category,
            parameters: group.parameters.map(createTableColumn)
          }))
        } catch (err) {
          handleError(err)
          return []
        }
      }
    )

    return {
      filteredColumns,
      groupedColumns,
      addColumn
    }
  } catch (err) {
    handleError(err)
    throw err // This will never be reached due to handleError throwing
  }
}
