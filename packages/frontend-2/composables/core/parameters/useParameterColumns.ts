import { computed } from 'vue'
import type { Ref } from 'vue'
import type { Parameter } from '../types/parameters'
import type { ColumnDef } from '../types/tables/column-types'
import type { BimValueType } from '../types/parameters/value-types'
import { useColumnState } from '../tables/state/useColumnState'
import { toBimValueType, toUserValueType } from '../utils/conversion'
import {
  createBimColumnDefWithDefaults,
  createUserColumnDefWithDefaults
} from '../types/tables/column-types'

export interface UseParameterColumnsOptions {
  parameters: (Parameter | ColumnDef)[]
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
 * Type guard for ColumnDef
 */
function isColumnDef(value: Parameter | ColumnDef): value is ColumnDef {
  return 'isCustomParameter' in value || 'sourceValue' in value
}

/**
 * Hook for converting between Parameters and ColumnDefs
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
    // Convert columns to parameters if needed
    const normalizedParameters = computed(() => {
      try {
        return parameters.map((item): Parameter => {
          if (!isColumnDef(item)) return item

          // Convert ColumnDef to Parameter
          if ('isCustomParameter' in item) {
            return {
              kind: 'user',
              id: item.id,
              name: item.name,
              type: toUserValueType(item.type),
              value: item.value ?? null,
              group: item.group || '',
              category: item.category,
              description: item.description,
              metadata: item.metadata
            }
          }

          return {
            kind: 'bim',
            id: item.id,
            name: item.name,
            type: toBimValueType(item.type) as BimValueType,
            value: item.value ?? null,
            sourceGroup: item.currentGroup || '',
            currentGroup: item.currentGroup || '',
            isSystem: false,
            category: item.category,
            description: item.description,
            metadata: item.metadata
          }
        })
      } catch (err) {
        handleError(err)
        return []
      }
    })

    // Create refs for filtered and grouped parameters
    const filteredParameters = computed(() => normalizedParameters.value)
    const groupedParameters = computed(() => {
      const groups = new Map<string, Parameter[]>()

      for (const param of normalizedParameters.value) {
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

    // Convert Parameter to ColumnDef
    function convertToColumnDef(param: Parameter): ColumnDef {
      try {
        const base = {
          field: param.id,
          name: param.name,
          header: param.name,
          visible: true,
          removable: true,
          order: 0,
          category: param.category,
          description: param.description,
          metadata: param.metadata
            ? ({ ...param.metadata } as Record<string, unknown>)
            : undefined,
          value: param.value
        }

        if (param.kind === 'bim') {
          return createBimColumnDefWithDefaults({
            ...base,
            type: param.type,
            sourceValue: null,
            fetchedGroup: param.sourceGroup || 'Default',
            currentGroup: param.currentGroup || param.sourceGroup || 'Default',
            isFixed: false,
            sortable: true,
            filterable: true
          })
        }

        return createUserColumnDefWithDefaults({
          ...base,
          type: param.type,
          group: param.group || 'Custom',
          isCustomParameter: false,
          sortable: true,
          filterable: true
        })
      } catch (err) {
        handleError(err)
        throw err // This will never be reached due to handleError throwing
      }
    }

    const filteredColumns = computed(() => {
      try {
        return filteredParameters.value.map(convertToColumnDef)
      } catch (err) {
        handleError(err)
        return []
      }
    })

    const groupedColumns = computed(() => {
      try {
        return groupedParameters.value.map((group) => ({
          name: group.category,
          parameters: group.parameters.map((param) => ({
            ...convertToColumnDef(param),
            removable: param.kind === 'user'
          }))
        }))
      } catch (err) {
        handleError(err)
        return []
      }
    })

    return {
      filteredColumns,
      groupedColumns,
      convertToColumnDef,
      addColumn
    }
  } catch (err) {
    handleError(err)
    throw err // This will never be reached due to handleError throwing
  }
}
