import type { Parameter } from '../parameters'
import type { ColumnDef, NamedTableConfig } from '../data'

// Simple JSONB Response Types
export interface UserResponse {
  activeUser: {
    userSettings: Record<string, unknown> | null
    tables: Record<string, NamedTableConfig> | null
    parameters: Record<string, unknown> | null
  }
}

export interface UserSettingsUpdateResponse {
  userSettingsUpdate: boolean
}

export interface UserTablesUpdateResponse {
  userTablesUpdate: boolean
}

export interface UserParametersUpdateResponse {
  userParametersUpdate: boolean
}

// Legacy types kept for backwards compatibility
export interface ParametersQueryResponse {
  parameters: Parameter[]
}

export interface TableParametersQueryResponse {
  tableParameters: Parameter[]
}

export interface ParameterMutationResponse {
  parameter: Parameter
}

export interface CreateParameterResponse {
  createParameter: ParameterMutationResponse
}

export interface UpdateParameterResponse {
  updateParameter: ParameterMutationResponse
}

export interface DeleteParameterResponse {
  deleteParameter: boolean
}

export interface AddParameterToTableResponse {
  addParameterToTable: boolean
}

export interface RemoveParameterFromTableResponse {
  removeParameterFromTable: boolean
}

// Legacy Table Response Types
export interface TableData {
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
  metadata?: string
  categoryFilters?: {
    selectedParentCategories: string[]
    selectedChildCategories: string[]
  }
}

export interface TableConfigResponse {
  id: string
  name: string
  data: TableData
}

export interface GetTablesResponse {
  namedTableConfigs: TableConfigResponse[]
}

export interface CreateTableResponse {
  createNamedTable: TableConfigResponse
}

export interface UpdateTableResponse {
  updateNamedTable: TableConfigResponse
}

export interface DeleteTableResponse {
  deleteNamedTable: boolean
}

// Re-export for backwards compatibility
export type { NamedTableConfig }

// Storage format types
export interface StoredTable extends NamedTableConfig {
  id: string
  name: string
}
