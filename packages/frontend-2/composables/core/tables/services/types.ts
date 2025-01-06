import type {
  TableCategoryFilters,
  TableSelectedParameters
} from '~/composables/core/types/tables/table-config'
import type { TableColumn } from '~/composables/core/types/tables/table-column'
import type { SelectedParameter } from '~/composables/core/types/parameters/parameter-states'

/**
 * API Column configuration type
 * Represents the column structure used in API responses
 */
export interface APITableColumn {
  field: string
  header: string
  width?: number
  visible: boolean
  removable?: boolean
  order: number
}

/**
 * Convert API column to core TableColumn
 */
export function apiColumnToCoreColumn(
  apiColumn: APITableColumn,
  param: SelectedParameter
): TableColumn {
  if (!param?.id) {
    throw new Error('Invalid parameter: missing id')
  }

  return {
    id: param.id,
    field: apiColumn.field || param.id,
    header: apiColumn.header || param.name,
    visible: apiColumn.visible ?? param.visible,
    width: apiColumn.width,
    order: apiColumn.order ?? param.order,
    parameter: param,
    sortable: true,
    filterable: true
  }
}

/**
 * Convert core TableColumn to API column
 */
export function coreColumnToApiColumn(column: TableColumn): APITableColumn {
  if (!column?.field) {
    throw new Error('Invalid column: missing field')
  }

  return {
    field: column.field,
    header: column.header,
    width: column.width,
    visible: column.visible,
    order: column.order
  }
}

/**
 * API Table configuration type
 */
export interface TableConfig {
  parentColumns: APITableColumn[]
  childColumns: APITableColumn[]
  selectedParameters: TableSelectedParameters
  categoryFilters: TableCategoryFilters
}

/**
 * GraphQL types
 */
export interface GetTableResponse {
  tableSettings: {
    id: string
    name: string
    config: TableConfig
  }
}

export interface SaveTableResponse {
  updateNamedTable: {
    id: string
    name: string
    config: TableConfig
  }
}

export interface DeleteTableResponse {
  deleteNamedTable: boolean
}

export interface SaveTableInput {
  input: {
    id: string
    name: string
    config: TableConfig
  }
}

export interface DeleteTableInput {
  tableId: string
}
