import type { ColumnDef, CategoryFiltersInput } from '../data'
import type { Parameter, CustomParameter } from '../parameters'

/**
 * GraphQL response for parameter queries
 */
export interface ParameterResponse extends Parameter {
  tables?: Array<{
    id: string
    name: string
  }>
}

/**
 * Input for creating a new parameter
 */
export interface CreateParameterInput {
  name: string
  type: string
  value?: string | null
  equation?: string | null
  description?: string | null
  metadata?: Record<string, unknown> | null
  field: string
  tableIds?: string[] | null
  category?: string | null
}

/**
 * Input for updating an existing parameter
 */
export interface UpdateParameterInput {
  name?: string | null
  type?: string | null
  value?: string | null
  equation?: string | null
  description?: string | null
  metadata?: Record<string, unknown> | null
  field?: string | null
  tableIds?: string[] | null
  category?: string | null
}

/**
 * GraphQL response for parameters query
 */
export interface ParametersQueryResponse {
  parameters: ParameterResponse[]
}

/**
 * GraphQL response for create parameter mutation
 */
export interface CreateParameterResponse {
  createParameter: {
    parameter: ParameterResponse
  }
}

/**
 * GraphQL response for update parameter mutation
 */
export interface UpdateParameterResponse {
  updateParameter: {
    parameter: ParameterResponse
  }
}

/**
 * GraphQL response for delete parameter mutation
 */
export interface DeleteParameterResponse {
  deleteParameter: boolean
}

/**
 * GraphQL response for add parameter to table mutation
 */
export interface AddParameterToTableResponse {
  addParameterToTable: {
    parameter: ParameterResponse
  }
}

/**
 * GraphQL response for remove parameter from table mutation
 */
export interface RemoveParameterFromTableResponse {
  removeParameterFromTable: {
    parameter: ParameterResponse
  }
}

/**
 * Table configuration input for GraphQL mutations
 * Matches backend structure for parameters (using IDs)
 */
export interface TableConfigInput {
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
  parameters?: string[] // Store parameter IDs
  customParameters?: string[] // Store custom parameter IDs
  metadata?: string // Match backend type
}

/**
 * Table information from GraphQL
 */
export interface TableInfo {
  id: string
  name: string
  config: {
    parentColumns: ColumnDef[]
    childColumns: ColumnDef[]
  }
  categoryFilters?: CategoryFiltersInput
  parameters?: ParameterResponse[]
}

/**
 * Table response from GraphQL
 * This is the full table response that includes all table data
 */
export interface TableResponse extends TableInfo {
  id: string
  name: string
  config: {
    parentColumns: ColumnDef[]
    childColumns: ColumnDef[]
    parameters?: string[] // Store parameter IDs
    customParameters?: string[] // Store custom parameter IDs
    metadata?: string // Match backend type
  }
  categoryFilters: CategoryFiltersInput
}

/**
 * GraphQL response for tables query
 */
export interface TablesQueryResponse {
  namedTableConfigs: TableResponse[]
}

/**
 * GraphQL response for settings query
 */
export interface SettingsQueryResponse {
  settings: {
    controlWidth?: number
    [key: string]: unknown
  }
}

/**
 * GraphQL mutation input for table creation
 */
export interface CreateNamedTableInput {
  name: string
  config: TableConfigInput
  categoryFilters?: CategoryFiltersInput
}

/**
 * GraphQL mutation input for table update
 */
export interface UpdateNamedTableInput {
  id: string
  name?: string
  config?: TableConfigInput
  categoryFilters?: CategoryFiltersInput
}
