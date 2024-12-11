import type { ColumnDef, CategoryFilters } from '../tables'
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
 * Table Types
 */
export interface TableResponse {
  id: string
  name: string
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
  metadata?: Record<string, unknown>
  categoryFilters: CategoryFilters
  selectedParameterIds: string[]
}

export interface CreateNamedTableInput {
  name: string
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
  metadata?: Record<string, unknown>
  categoryFilters: CategoryFilters
  selectedParameterIds: string[]
}

export interface UpdateNamedTableInput {
  id: string
  name?: string
  parentColumns?: ColumnDef[]
  childColumns?: ColumnDef[]
  metadata?: Record<string, unknown>
  categoryFilters?: CategoryFilters
  selectedParameterIds?: string[]
}

export interface TablesQueryResponse {
  namedTableConfigs: TableResponse[]
}

export interface TablesMutationResponse {
  userTablesUpdate: boolean
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
