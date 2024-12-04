import type { ColumnDef, CategoryFilters, NamedTableConfig } from '../tables'
import type { Parameter, ParameterType } from '../parameters'

// Input Types
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

/**
 * User response from GraphQL
 */
export interface UserResponse {
  activeUser: {
    userSettings: Record<string, unknown> | null
    tables: Record<string, NamedTableConfig> | null
    parameters: Record<string, unknown> | null
  }
}

/**
 * User settings update response
 */
export interface UserSettingsUpdateResponse {
  userSettingsUpdate: boolean
}

/**
 * User tables update response
 */
export interface UserTablesUpdateResponse {
  userTablesUpdate: boolean
}

/**
 * Tables mutation response
 */
export interface TablesMutationResponse {
  userTablesUpdate: boolean
}

/**
 * User parameters update response
 */
export interface UserParametersUpdateResponse {
  userParametersUpdate: boolean
}

/**
 * Parameter response from GraphQL
 */
export interface ParameterResponse extends Parameter {
  tables?: Array<{
    id: string
    name: string
  }>
}

/**
 * Parameters query response
 */
export interface ParametersQueryResponse {
  parameters: ParameterResponse[]
}

/**
 * Table parameters query response
 */
export interface TableParametersQueryResponse {
  tableParameters: Parameter[]
}

/**
 * Parameter mutation response
 */
export interface ParameterMutationResponse {
  parameter: Parameter
}

/**
 * Create parameter response
 */
export interface CreateParameterResponse {
  createParameter: ParameterMutationResponse
}

/**
 * Update parameter response
 */
export interface UpdateParameterResponse {
  updateParameter: ParameterMutationResponse
}

/**
 * Delete parameter response
 */
export interface DeleteParameterResponse {
  deleteParameter: boolean
}

/**
 * Add parameter to table response
 */
export interface AddParameterToTableResponse {
  addParameterToTable: {
    parameter: ParameterResponse
  }
}

/**
 * Remove parameter from table response
 */
export interface RemoveParameterFromTableResponse {
  removeParameterFromTable: {
    parameter: ParameterResponse
  }
}

/**
 * Table data interface
 */
export interface TableData {
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
  metadata?: string
  categoryFilters?: CategoryFilters
}

/**
 * Table configuration response
 */
export interface TableConfigResponse {
  id: string
  name: string
  data: TableData
}

/**
 * Get tables response
 */
export interface GetTablesResponse {
  namedTableConfigs: TableConfigResponse[]
}

/**
 * Create table response
 */
export interface CreateTableResponse {
  createNamedTable: TableConfigResponse
}

/**
 * Update table response
 */
export interface UpdateTableResponse {
  updateNamedTable: TableConfigResponse
}

/**
 * Delete table response
 */
export interface DeleteTableResponse {
  deleteNamedTable: boolean
}

/**
 * Table information from GraphQL
 */
export interface TableInfo {
  id: string
  name: string
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
  metadata?: string
  categoryFilters: CategoryFilters
  selectedParameterIds: string[]
}

/**
 * Tables query response
 */
export interface TablesQueryResponse {
  namedTableConfigs: TableInfo[]
}

/**
 * Settings query response
 */
export interface SettingsQueryResponse {
  settings: {
    controlWidth?: number
    [key: string]: unknown
  }
}

/**
 * Create named table input
 */
export interface CreateNamedTableInput {
  name: string
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
  metadata?: string
  categoryFilters: CategoryFilters
  selectedParameterIds: string[]
}

/**
 * Update named table input
 */
export interface UpdateNamedTableInput {
  id: string
  name?: string
  parentColumns?: ColumnDef[]
  childColumns?: ColumnDef[]
  metadata?: string
  categoryFilters?: CategoryFilters
  selectedParameterIds?: string[]
}

/**
 * Create parameter input
 */
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

/**
 * Update parameter input
 */
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

/**
 * Table response from GraphQL
 */
export interface TableResponse {
  id: string
  name: string
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
  metadata?: string
  categoryFilters: CategoryFilters
  selectedParameterIds: string[]
}

/**
 * Stored table interface
 */
export interface StoredTable extends NamedTableConfig {
  id: string
  name: string
}
