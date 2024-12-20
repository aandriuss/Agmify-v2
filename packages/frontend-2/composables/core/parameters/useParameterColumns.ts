import { computed } from 'vue'
import type { Ref } from 'vue'
import type { Parameter } from '../types/parameters'
import type {
  ColumnDef,
  BimColumnDef,
  UserColumnDef
} from '../types/tables/column-types'
import type { BimValueType } from '../types/parameters/value-types'
import { useParameters } from './next/useParameters'
import { useColumnState } from '../tables/state/useColumnState'
import { toBimValueType, toUserValueType } from '../utils/conversion'
import { createBimParameter, createUserParameter } from '../types/parameters'

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
  searchTerm,
  isGrouped,
  sortBy,
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
            return createUserParameter({
              id: item.id,
              name: item.name,
              field: item.field,
              header: item.header,
              type: toUserValueType(item.type),
              category: item.category,
              description: item.description,
              visible: item.visible,
              removable: item.removable,
              value: item.value ?? null,
              group: item.group || '',
              metadata: item.metadata
            })
          }

          const bimType = toBimValueType(item.type) as BimValueType
          return createBimParameter({
            id: item.id,
            name: item.name,
            field: item.field,
            header: item.header,
            type: bimType,
            category: item.category,
            description: item.description,
            visible: item.visible,
            removable: item.removable,
            value: item.value ?? null,
            sourceValue: item.sourceValue ?? null,
            fetchedGroup: item.fetchedGroup || '',
            currentGroup: item.currentGroup || '',
            metadata: item.metadata
          })
        })
      } catch (err) {
        handleError(err)
        return []
      }
    })

    // Use parameter system for filtering and sorting
    const { filteredParameters, groupedParameters } = useParameters({
      initialParameters: normalizedParameters.value,
      searchTerm,
      isGrouped,
      sortBy,
      onError
    })

    // Use column state for managing columns
    const { addColumn } = useColumnState({ onError })

    // Convert Parameter to ColumnDef
    function convertToColumnDef(param: Parameter): ColumnDef {
      try {
        const base = {
          id: param.id,
          name: param.name,
          field: param.field,
          header: param.header,
          category: param.category,
          description: param.description,
          visible: param.visible,
          removable: param.removable,
          metadata: param.metadata,
          sortable: true,
          filterable: true,
          value: param.value ?? null
        }

        if (param.kind === 'bim') {
          return {
            ...base,
            kind: 'bim',
            type: param.type,
            sourceValue: param.sourceValue ?? null,
            fetchedGroup: param.fetchedGroup,
            currentGroup: param.currentGroup,
            isFixed: true
          } as BimColumnDef
        }

        return {
          ...base,
          kind: 'user',
          type: param.type,
          group: param.group,
          isCustomParameter: true
        } as UserColumnDef
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
          parameters: group.parameters.map(convertToColumnDef)
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
