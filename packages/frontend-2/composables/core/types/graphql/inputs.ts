import type { ColumnDef } from '../data'
import type { ParameterType } from '../parameters'

/**
 * GraphQL-specific input types that match the backend schema exactly
 */

export interface TableColumnInput extends ColumnDef {}

export interface CategoryFiltersGQLInput {
  selectedParentCategories: string[]
  selectedChildCategories: string[]
}

export interface CreateNamedTableGQLInput {
  name: string
  parentColumns: TableColumnInput[]
  childColumns: TableColumnInput[]
  metadata?: string
  categoryFilters?: CategoryFiltersGQLInput
}

export interface UpdateNamedTableGQLInput {
  id: string
  name?: string
  parentColumns?: TableColumnInput[]
  childColumns?: TableColumnInput[]
  metadata?: string
  categoryFilters?: CategoryFiltersGQLInput
}

export interface CreateParameterInput {
  name: string
  type: ParameterType
  value?: unknown
  field: string
  header?: string
  category?: string
  description?: string
  metadata?: Record<string, unknown>
  visible?: boolean
  order?: number
  source?: string
  isFetched?: boolean
}

export interface UpdateParameterInput {
  name?: string
  type?: ParameterType
  value?: unknown
  field?: string
  header?: string
  category?: string
  description?: string
  metadata?: Record<string, unknown>
  visible?: boolean
  order?: number
  source?: string
  isFetched?: boolean
}
