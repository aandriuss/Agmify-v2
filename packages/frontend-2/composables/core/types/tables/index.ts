import type { ColumnDef, CategoryFilters } from '../data'

/**
 * Table configuration interface
 */
export interface TableConfig {
  id: string
  name: string
  displayName: string
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
  categoryFilters: CategoryFilters
  selectedParameterIds?: string[]
}

/**
 * Tables state interface for the composable
 */
export interface TablesState {
  tables: Record<string, TableConfig>
  loading: boolean
  error: Error | null
}

/**
 * Tables update payload interface
 */
export interface TablesUpdatePayload {
  tables: Record<string, TableConfig>
}

/**
 * Table creation input interface
 */
export interface CreateTableInput {
  name: string
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
  categoryFilters: CategoryFilters
  selectedParameterIds?: string[]
}

/**
 * Table update input interface
 */
export interface UpdateTableInput {
  id: string
  name?: string
  parentColumns?: ColumnDef[]
  childColumns?: ColumnDef[]
  categoryFilters?: CategoryFilters
  selectedParameterIds?: string[]
}

/**
 * Table response from GraphQL
 */
export interface TableResponse {
  id: string
  name: string
  displayName: string
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
  categoryFilters: CategoryFilters
  selectedParameterIds?: string[]
}

/**
 * Tables query response from GraphQL
 */
export interface TablesQueryResponse {
  userTables: Record<string, TableResponse>
}

/**
 * Tables mutation response from GraphQL
 */
export interface TablesMutationResponse {
  userTablesUpdate: boolean
}

/**
 * Named table configuration interface
 */
export interface NamedTableConfig extends TableConfig {
  id: string
  name: string
  displayName: string
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
  categoryFilters: CategoryFilters
  selectedParameterIds: string[] // Required in NamedTableConfig
}
