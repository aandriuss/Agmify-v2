import type {
  TableCategoryFilters,
  TableSelectedParameters
} from '~/composables/core/types/tables/table-config'

/**
 * API Table configuration type
 */
export interface TableConfig {
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
