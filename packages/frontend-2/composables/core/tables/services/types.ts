import type { SelectedParameter } from '~/composables/core/types/parameters/parameter-states'

import type { BaseColumnDef } from '~/composables/core/types/tables/column-types'
import type { PrimitiveValue } from '~/composables/core/types/parameters/value-types'

/**
 * Table column interface
 * Represents a simplified column definition for API/storage
 */
export interface TableColumn extends BaseColumnDef {
  id: string
  name: string
  field: string
  header: string
  width?: number
  visible: boolean
  removable: boolean
  order: number
  type?: string
  kind?: 'bim' | 'user'
  group?: string
  sourceValue?: PrimitiveValue
  fetchedGroup?: string
  currentGroup?: string
  isFixed?: boolean
  isCustomParameter?: boolean
  category?: string
  description?: string
  metadata?: Record<string, unknown>
}

/**
 * Category filters interface
 */
export interface CategoryFilters {
  selectedParentCategories: string[]
  selectedChildCategories: string[]
}

/**
 * Selected parameters interface
 */
export interface TableSelectedParameters {
  parent: SelectedParameter[]
  child: SelectedParameter[]
}

/**
 * Table configuration interface
 */
export interface TableConfig {
  parentColumns: TableColumn[]
  childColumns: TableColumn[]
  selectedParameters: TableSelectedParameters
}

/**
 * Named table configuration interface
 */
export interface NamedTableConfig {
  id: string
  name: string
  config: TableConfig
  categoryFilters: CategoryFilters
}

/**
 * GraphQL query responses
 */
export interface GetTableResponse {
  namedTableConfig: NamedTableConfig
}

export interface SaveTableResponse {
  updateNamedTable: NamedTableConfig
}

export interface DeleteTableResponse {
  deleteNamedTable: boolean
}

/**
 * GraphQL mutation inputs
 */
export interface SaveTableInput {
  input: {
    id: string
    name?: string
    config?: TableConfig
    categoryFilters?: CategoryFilters
  }
}

export interface DeleteTableInput {
  tableId: string
}
