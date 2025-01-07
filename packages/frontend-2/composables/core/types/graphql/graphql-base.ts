import type { TableColumn, TableCategoryFilters } from '../tables'
import type { BimValueType, UserValueType } from '../parameters'

/**
 * GraphQL Parameter Types
 */
interface BaseGQLParameter {
  id: string
  name: string
  field: string
  visible: boolean
  header: string
  description?: string
  category?: string
  order?: number
  computed?: unknown
  source?: string
  removable: boolean
  value: string // Always string in GraphQL
  metadata?: Record<string, unknown>
}

export interface BimGQLParameter extends BaseGQLParameter {
  kind: 'bim'
  type: BimValueType
  sourceValue: string // BIM value as string
  fetchedGroup: string
  currentGroup: string
  group?: never
  equation?: never
  isCustom?: never
  validationRules?: never
}

export interface UserGQLParameter extends BaseGQLParameter {
  kind: 'user'
  type: UserValueType
  group: string
  equation?: string
  isCustom?: boolean
  sourceValue?: never
  fetchedGroup?: never
  currentGroup?: never
}

export type GQLParameter = BimGQLParameter | UserGQLParameter

/**
 * Parameter Input Types
 */
export type CreateBimGQLInput = Omit<BimGQLParameter, 'id' | 'kind'>
export type CreateUserGQLInput = Omit<UserGQLParameter, 'id' | 'kind'>

export type UpdateBimGQLInput = Partial<CreateBimGQLInput>
export type UpdateUserGQLInput = Partial<CreateUserGQLInput>

/**
 * Parameter Response Types
 */
export interface ParametersQueryResponse {
  parameters: GQLParameter[]
}

export interface GetParametersQueryResponse {
  activeUser: {
    parameters: Record<string, GQLParameter>
  }
}

/**
 * Mutation Response Types
 */
export interface ParameterMutationResponse {
  parameter: GQLParameter
}

export interface CreateParameterResponse {
  createParameter: ParameterMutationResponse
}

export interface SingleParameterResponse {
  parameter: GQLParameter
}

export interface UpdateParameterResponse {
  updateParameter: ParameterMutationResponse
}

export interface DeleteParameterResponse {
  deleteParameter: boolean
}

export interface ParametersOperationResponse {
  status: boolean
  error?: string
  parameter?: GQLParameter
}

/**
 * Table GraphQL Types
 */
/**
 * GraphQL Table Input Types - match schema exactly
 */
export interface TableSettingsInput {
  name: string
  displayName: string
  parentColumns: TableColumnInput[]
  childColumns: TableColumnInput[]
  categoryFilters?: CategoryFiltersInput
  selectedParameters: TableSelectedParametersInput
  filters?: TableFilterInput[]
  lastUpdateTimestamp: number
  description?: string
  metadata?: Record<string, unknown>
}

export interface TableColumnInput {
  id: string
  field: string
  header: string
  width?: number
  visible: boolean
  removable?: boolean
  order: number
  sortable?: boolean
  filterable?: boolean
  parameter: ParameterInput
}

export interface CategoryFiltersInput {
  selectedParentCategories: string[]
  selectedChildCategories: string[]
}

export interface TableSelectedParametersInput {
  parent: ParameterInput[]
  child: ParameterInput[]
}

export interface TableFilterInput {
  columnId: string
  value: unknown
  operator: string
}

export interface ParameterInput {
  // Common fields
  id: string
  kind: 'bim' | 'user'
  name: string
  field: string
  visible: boolean
  header: string
  description?: string
  category?: string
  order?: number
  computed?: unknown
  source?: string
  removable: boolean
  value: string
  metadata?: Record<string, unknown>

  // BIM-specific fields
  type?: BimValueType
  sourceValue?: string
  fetchedGroup?: string
  currentGroup?: string

  // User-specific fields
  userType?: UserValueType
  group?: string
  equation?: string
  isCustom?: boolean
}

export interface TableSettingsEntry {
  id: string
  settings: TableSettingsInput
}

export interface TableSettingsMapInput {
  tables: TableSettingsEntry[]
}

export interface TablesQueryResponse {
  activeUser: {
    tables: Record<string, TableSettingsEntry>
  }
}

export interface TablesMutationResponse {
  userTablesUpdate: boolean
}

/**
 * Legacy Table Types
 * @deprecated Use TableSettingsInput and related types instead
 */
export interface TableResponse {
  id: string
  name: string
  parentColumns: TableColumn[]
  childColumns: TableColumn[]
  metadata?: Record<string, unknown>
  categoryFilters: TableCategoryFilters
  selectedParameters: {
    parent: string[]
    child: string[]
  }
}

export interface CreateNamedTableInput {
  name: string
  parentColumns: TableColumn[]
  childColumns: TableColumn[]
  metadata?: Record<string, unknown>
  categoryFilters: TableCategoryFilters
  selectedParameters: {
    parent: string[]
    child: string[]
  }
}

export interface UpdateNamedTableInput {
  id: string
  name?: string
  parentColumns?: TableColumn[]
  childColumns?: TableColumn[]
  metadata?: Record<string, unknown>
  categoryFilters?: TableCategoryFilters
  selectedParameters?: {
    parent: string[]
    child: string[]
  }
}

/**
 * Parameter-Table Operations
 */
export interface AddParameterToTableResponse {
  addParameterToTable: {
    parameter: GQLParameter
  }
}

export interface RemoveParameterFromTableResponse {
  removeParameterFromTable: {
    parameter: GQLParameter
  }
}
