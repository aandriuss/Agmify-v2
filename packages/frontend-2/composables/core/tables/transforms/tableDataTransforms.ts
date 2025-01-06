import type {
  TableSettings,
  TableColumn,
  SelectedParameter
} from '~/composables/core/types'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import type { BimValueType } from '~/composables/core/types/parameters'

interface TableInput {
  name: string
  displayName: string
  childColumns: string[]
  parentColumns: string[]
  categoryFilters: {
    selectedChildCategories: string[]
    selectedParentCategories: string[]
  }
  selectedParameterIds: string[]
}

interface TableData {
  id: string
  name: string
  displayName: string
  childColumns: string[]
  parentColumns: string[]
  categoryFilters: {
    selectedChildCategories: string[]
    selectedParentCategories: string[]
  }
  selectedParameterIds: string[]
}

/**
 * Type guard for GraphQL table data
 */
export function isTableData(data: unknown): data is TableData {
  if (!data || typeof data !== 'object') return false
  const candidate = data as Partial<TableData>
  return !!(
    candidate &&
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.displayName === 'string' &&
    Array.isArray(candidate.childColumns) &&
    Array.isArray(candidate.parentColumns) &&
    candidate.categoryFilters &&
    typeof candidate.categoryFilters === 'object' &&
    Array.isArray(candidate.categoryFilters.selectedChildCategories) &&
    Array.isArray(candidate.categoryFilters.selectedParentCategories) &&
    Array.isArray(candidate.selectedParameterIds)
  )
}

/**
 * Transform GraphQL table data to TableSettings
 */
export function transformTableData(tableData: TableData): TableSettings {
  return {
    id: tableData.id,
    name: tableData.name,
    displayName: tableData.displayName,
    parentColumns: tableData.parentColumns.map(
      (col: string): TableColumn => ({
        id: col,
        field: col,
        header: col,
        width: undefined,
        visible: true,
        order: 0,
        parameter: {
          id: col,
          name: col,
          kind: 'bim',
          type: 'string' as BimValueType,
          value: null,
          group: 'Parameters',
          visible: true,
          order: 0
        }
      })
    ),
    childColumns: tableData.childColumns.map(
      (col: string): TableColumn => ({
        id: col,
        field: col,
        header: col,
        width: undefined,
        visible: true,
        order: 0,
        parameter: {
          id: col,
          name: col,
          kind: 'bim',
          type: 'string' as BimValueType,
          value: null,
          group: 'Parameters',
          visible: true,
          order: 0
        }
      })
    ),
    categoryFilters: tableData.categoryFilters,
    selectedParameters: {
      parent: tableData.selectedParameterIds.map(
        (id: string): SelectedParameter => ({
          id,
          name: id,
          kind: 'bim',
          type: 'string' as BimValueType,
          value: null,
          group: 'Parameters',
          visible: true,
          order: 0
        })
      ),
      child: []
    },
    lastUpdateTimestamp: Date.now()
  }
}

/**
 * Transform TableSettings to GraphQL input
 */
export function transformTableToInput(table: TableSettings): TableInput {
  return {
    name: table.name,
    displayName: table.displayName,
    parentColumns: table.parentColumns
      .filter((col): col is TableColumn => {
        if (!col || typeof col.field !== 'string') {
          debug.warn(DebugCategories.STATE, 'Invalid parent column', col)
          return false
        }
        return true
      })
      .map((col) => col.field),
    childColumns: table.childColumns
      .filter((col): col is TableColumn => {
        if (!col || typeof col.field !== 'string') {
          debug.warn(DebugCategories.STATE, 'Invalid child column', col)
          return false
        }
        return true
      })
      .map((col) => col.field),
    categoryFilters: table.categoryFilters,
    selectedParameterIds: table.selectedParameters.parent
      .filter((param): param is SelectedParameter => {
        if (!param || typeof param.id !== 'string') {
          debug.warn(DebugCategories.STATE, 'Invalid parameter', param)
          return false
        }
        return true
      })
      .map((param) => param.id)
  }
}

/**
 * Format table key for storage
 */
export function formatTableKey(table: TableSettings): string {
  const sanitizedName = table.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
  return `${sanitizedName}_${table.id}`
}

/**
 * Deep clone an object
 */
export function deepClone<T extends Record<string, unknown>>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T
}
