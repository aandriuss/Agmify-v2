import type { AvailableUserParameter } from '../parameters/parameter-states'

/**
 * GraphQL Response Types
 */
export interface GetParametersQueryResponse {
  activeUser: {
    parameters: Record<string, AvailableUserParameter>
  }
}

export interface ParameterMutationResponse {
  parameter: AvailableUserParameter
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
