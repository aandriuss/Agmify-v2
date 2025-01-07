import { useMutation, useQuery, provideApolloClient } from '@vue/apollo-composable'
import { gql } from 'graphql-tag'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import { useNuxtApp } from '#app'
import { useWaitForActiveUser } from '~/lib/auth/composables/activeUser'
import { isGraphQLAuthError } from '~/composables/core/utils/errors'
import {
  isTableData,
  transformTableData,
  transformTableToInput
} from '~/composables/core/tables/transforms/tableDataTransforms'
import type { TableSettings } from '~/composables/core/types'

// GraphQL Enums
enum BimValueType {
  string = 'string',
  number = 'number',
  boolean = 'boolean',
  date = 'date',
  object = 'object',
  array = 'array'
}

enum UserValueType {
  fixed = 'fixed',
  equation = 'equation'
}

// GraphQL Parameter Types
interface GraphQLBimParameter {
  id: string
  name: string
  kind: 'bim'
  bimType: BimValueType
  value: string // Always string in GraphQL
  visible: boolean
  order: number
  sourceValue: string
  fetchedGroup: string
  currentGroup: string
  field: string
  header: string
  removable: boolean
  metadata?: {
    category?: string
    fullKey?: string
    isSystem?: boolean
    group?: string
    elementId?: string
    isNested?: boolean
    parentKey?: string
    isJsonString?: boolean
    [key: string]: unknown
  }
}

interface GraphQLUserParameter {
  id: string
  name: string
  kind: 'user'
  userType: UserValueType
  value: string // Always string in GraphQL
  group: string
  visible: boolean
  order: number
  equation?: string
  isCustom?: boolean
  field: string
  header: string
  removable: boolean
  metadata?: {
    category?: string
    fullKey?: string
    isSystem?: boolean
    group?: string
    elementId?: string
    isNested?: boolean
    parentKey?: string
    isJsonString?: boolean
    [key: string]: unknown
  }
}

type GraphQLParameter = GraphQLBimParameter | GraphQLUserParameter

/**
 * JSON value types
 */
type JSONPrimitive = string | number | boolean | null
type JSONObject = { [key: string]: JSONValue }
type JSONArray = JSONValue[]
type JSONValue = JSONPrimitive | JSONObject | JSONArray

/**
 * Type guard for JSON object
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function isJSONObject(value: unknown): value is JSONObject {
  if (!isRecord(value)) return false
  return Object.values(value).every((val) => {
    if (val === null) return true
    if (typeof val === 'string') return true
    if (typeof val === 'number') return true
    if (typeof val === 'boolean') return true
    if (typeof val === 'object') {
      if (Array.isArray(val)) {
        return val.every((item) => isJSONValue(item))
      }
      return isJSONObject(val)
    }
    return false
  })
}

/**
 * Type guard for JSON value
 */
function isJSONValue(value: unknown): value is JSONValue {
  if (value === null) return true
  if (typeof value === 'string') return true
  if (typeof value === 'number') return true
  if (typeof value === 'boolean') return true
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return value.every((item) => isJSONValue(item))
    }
    return isJSONObject(value)
  }
  return false
}

/**
 * Type-safe JSON parsing with validation
 */
function safeParseJSON(value: string): JSONValue | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const parsed = JSON.parse(value)
    return isJSONValue(parsed) ? parsed : null
  } catch {
    return null
  }
}

/**
 * Helper to validate parameter types
 */
function validateParameterType(type: string, kind: 'bim' | 'user'): boolean {
  if (kind === 'bim') {
    return Object.values(BimValueType).includes(type as BimValueType)
  } else {
    return Object.values(UserValueType).includes(type as UserValueType)
  }
}

// GraphQL Response Types
interface TableGraphQLData {
  id: string
  name: string
  displayName: string
  config: {
    parentColumns: {
      field: string
      header: string
      width?: number
      visible: boolean
      removable?: boolean
      order: number
    }[]
    childColumns: {
      field: string
      header: string
      width?: number
      visible: boolean
      removable?: boolean
      order: number
    }[]
    selectedParameters: {
      parent: GraphQLParameter[]
      child: GraphQLParameter[]
    }
  }
  categoryFilters?: {
    selectedParentCategories: string[]
    selectedChildCategories: string[]
  }
  sort?: {
    field?: string
    order?: 'ASC' | 'DESC'
  }
  filters?: {
    columnId: string
    value: string | number | boolean
    operator: string
  }[]
  lastUpdateTimestamp: number
}

interface GetTablesResponse {
  tableSettingsP: TableGraphQLData[]
}

interface CreateTableResponse {
  createNamedTable: TableGraphQLData
}

interface UpdateTableResponse {
  updateNamedTable: TableGraphQLData
}

const GET_USER_TABLES = gql`
  query GetUserTables {
    tableSettingsP {
      id
      name
      displayName
      config {
        parentColumns {
          field
          header
          width
          visible
          removable
          order
        }
        childColumns {
          field
          header
          width
          visible
          removable
          order
        }
        selectedParameters {
          parent {
            ... on BimParameter {
              id
              name
              kind
              bimType: type
              value
              visible
              order
              sourceValue
              fetchedGroup
              currentGroup
              field
              header
              removable
              metadata
            }
            ... on UserParameter {
              id
              name
              kind
              userType: type
              value
              group
              visible
              order
              equation
              isCustom
              field
              header
              removable
              metadata
            }
          }
          child {
            ... on BimParameter {
              id
              name
              kind
              bimType: type
              value
              visible
              order
              sourceValue
              fetchedGroup
              currentGroup
              field
              header
              removable
              metadata
            }
            ... on UserParameter {
              id
              name
              kind
              userType: type
              value
              group
              visible
              order
              equation
              isCustom
              field
              header
              removable
              metadata
            }
          }
        }
      }
      categoryFilters {
        selectedParentCategories
        selectedChildCategories
      }
      sort {
        field
        order
      }
      filters {
        columnId
        value
        operator
      }
      lastUpdateTimestamp
    }
  }
`

const UPDATE_TABLE = gql`
  mutation UpdateNamedTable($input: UpdateNamedTableInput!) {
    updateNamedTable(input: $input) {
      id
      name
      displayName
      config {
        parentColumns {
          field
          header
          width
          visible
          removable
          order
        }
        childColumns {
          field
          header
          width
          visible
          removable
          order
        }
        selectedParameters {
          parent {
            ... on BimParameter {
              id
              name
              kind
              bimType: type
              value
              visible
              order
              sourceValue
              fetchedGroup
              currentGroup
              field
              header
              removable
              metadata
            }
            ... on UserParameter {
              id
              name
              kind
              userType: type
              value
              group
              visible
              order
              equation
              isCustom
              field
              header
              removable
              metadata
            }
          }
          child {
            ... on BimParameter {
              id
              name
              kind
              bimType: type
              value
              visible
              order
              sourceValue
              fetchedGroup
              currentGroup
              field
              header
              removable
              metadata
            }
            ... on UserParameter {
              id
              name
              kind
              userType: type
              value
              group
              visible
              order
              equation
              isCustom
              field
              header
              removable
              metadata
            }
          }
        }
      }
      categoryFilters {
        selectedParentCategories
        selectedChildCategories
      }
      sort {
        field
        order
      }
      filters {
        columnId
        value
        operator
      }
      lastUpdateTimestamp
    }
  }
`

const CREATE_TABLE = gql`
  mutation CreateNamedTable($input: CreateNamedTableInput!) {
    createNamedTable(input: $input) {
      id
      name
      displayName
      config {
        parentColumns {
          field
          header
          width
          visible
          removable
          order
        }
        childColumns {
          field
          header
          width
          visible
          removable
          order
        }
        selectedParameters {
          parent {
            ... on BimParameter {
              id
              name
              kind
              bimType: type
              value
              visible
              order
              sourceValue
              fetchedGroup
              currentGroup
              field
              header
              removable
              metadata
            }
            ... on UserParameter {
              id
              name
              kind
              userType: type
              value
              group
              visible
              order
              equation
              isCustom
              field
              header
              removable
              metadata
            }
          }
          child {
            ... on BimParameter {
              id
              name
              kind
              bimType: type
              value
              visible
              order
              sourceValue
              fetchedGroup
              currentGroup
              field
              header
              removable
              metadata
            }
            ... on UserParameter {
              id
              name
              kind
              userType: type
              value
              group
              visible
              order
              equation
              isCustom
              field
              header
              removable
              metadata
            }
          }
        }
      }
      categoryFilters {
        selectedParentCategories
        selectedChildCategories
      }
      sort {
        field
        order
      }
      filters {
        columnId
        value
        operator
      }
      lastUpdateTimestamp
    }
  }
`

export async function useTablesGraphQL() {
  const nuxtApp = useNuxtApp()

  // Helper to get Apollo client with auth check
  async function getApolloClient() {
    try {
      debug.startState(DebugCategories.INITIALIZATION, 'Getting Apollo client')

      // Get Apollo client instance first
      const apolloClient = nuxtApp.$apollo?.default
      if (!apolloClient) {
        debug.error(DebugCategories.INITIALIZATION, 'Apollo client not initialized')
        throw new Error('Apollo client not initialized')
      }

      // Then wait for auth to be ready
      const waitForUser = useWaitForActiveUser()
      const userResult = await waitForUser()
      if (!userResult?.data?.activeUser) {
        debug.error(DebugCategories.INITIALIZATION, 'Authentication required')
        throw new Error('Authentication required')
      }

      debug.completeState(DebugCategories.INITIALIZATION, 'Apollo client ready')
      return apolloClient
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to get Apollo client', err)
      throw err
    }
  }

  // Helper to run code in Nuxt context with Apollo
  async function runInContext<T>(fn: () => Promise<T> | T): Promise<T> {
    const runContext = nuxtApp?.runWithContext
    if (!runContext) {
      throw new Error('Nuxt app context not available')
    }
    return runContext(async () => {
      // Ensure Apollo client is provided
      const apolloClient = nuxtApp.$apollo?.default
      if (!apolloClient) {
        throw new Error('Apollo client not initialized')
      }
      provideApolloClient(apolloClient)
      return fn()
    })
  }

  try {
    debug.startState(DebugCategories.INITIALIZATION, 'Initializing GraphQL client')

    // Initialize Apollo client with auth check
    const apolloClient = await getApolloClient()
    provideApolloClient(apolloClient)

    debug.completeState(DebugCategories.INITIALIZATION, 'GraphQL client initialized')

    const {
      result,
      loading: queryLoading,
      refetch: queryRefetch
    } = useQuery<GetTablesResponse>(GET_USER_TABLES, null, {
      fetchPolicy: 'cache-and-network'
    })

    // Ensure refetch is available and type-safe
    const refetch = (): ReturnType<typeof queryRefetch> => {
      if (!queryRefetch) {
        throw new Error('Query refetch function not available')
      }
      return queryRefetch()
    }

    async function fetchTables(): Promise<Record<string, TableSettings>> {
      try {
        debug.startState(DebugCategories.INITIALIZATION, 'Fetching tables from GraphQL')

        // Ensure we have auth and Apollo client
        await getApolloClient()

        const response = await runInContext(() => refetch()).catch(async (err) => {
          // If auth error, try to re-initialize Apollo client
          if (isGraphQLAuthError(err)) {
            debug.log(DebugCategories.INITIALIZATION, 'Auth error, retrying...')
            await getApolloClient()
            return refetch()
          }
          throw err
        })

        const data = response?.data as GetTablesResponse | undefined
        if (!data) {
          debug.warn(DebugCategories.INITIALIZATION, 'No data in GraphQL response')
          return {}
        }

        // tableSettingsP will always be an array (possibly empty) due to the schema
        const rawTables = data.tableSettingsP || []
        const tables: Record<string, TableSettings> = {}

        // Transform and validate tables from the response
        rawTables.forEach((tableData) => {
          try {
            // Transform and validate GraphQL parameters
            const transformedData = {
              ...tableData,
              config: {
                ...tableData.config,
                selectedParameters: {
                  parent: tableData.config.selectedParameters.parent.map((param) => {
                    if (param.kind === 'bim') {
                      if (!validateParameterType(param.bimType, 'bim')) {
                        throw new Error(`Invalid BIM parameter type: ${param.bimType}`)
                      }
                      return {
                        ...param,
                        type: param.bimType,
                        fetchedGroup: param.fetchedGroup,
                        currentGroup: param.currentGroup,
                        isSystem: false,
                        value: param.value ? safeParseJSON(param.value) : null
                      }
                    } else {
                      if (!validateParameterType(param.userType, 'user')) {
                        throw new Error(
                          `Invalid user parameter type: ${param.userType}`
                        )
                      }
                      return {
                        ...param,
                        type: param.userType,
                        value: param.value ? safeParseJSON(param.value) : null
                      }
                    }
                  }),
                  child: tableData.config.selectedParameters.child.map((param) => {
                    if (param.kind === 'bim') {
                      if (!validateParameterType(param.bimType, 'bim')) {
                        throw new Error(`Invalid BIM parameter type: ${param.bimType}`)
                      }
                      return {
                        ...param,
                        type: param.bimType,
                        fetchedGroup: param.fetchedGroup,
                        currentGroup: param.currentGroup,
                        isSystem: false,
                        value: param.value ? safeParseJSON(param.value) : null
                      }
                    } else {
                      if (!validateParameterType(param.userType, 'user')) {
                        throw new Error(
                          `Invalid user parameter type: ${param.userType}`
                        )
                      }
                      return {
                        ...param,
                        type: param.userType,
                        value: param.value ? safeParseJSON(param.value) : null
                      }
                    }
                  })
                }
              }
            }

            if (isTableData(transformedData)) {
              const validatedTable = transformTableData(transformedData)
              tables[validatedTable.id] = validatedTable
            } else {
              debug.warn(
                DebugCategories.INITIALIZATION,
                'Invalid table data',
                tableData
              )
            }
          } catch (err) {
            debug.error(DebugCategories.ERROR, 'Failed to transform table data', {
              tableId: tableData.id,
              error: err
            })
          }
        })

        debug.log(DebugCategories.INITIALIZATION, 'Tables fetched from GraphQL', {
          hasTables: Object.keys(tables).length > 0,
          tableCount: Object.keys(tables).length
        })

        debug.completeState(DebugCategories.INITIALIZATION, 'Tables fetch complete')
        return tables
      } catch (err) {
        debug.error(DebugCategories.ERROR, 'Failed to fetch tables', err)
        throw new Error('Failed to fetch tables')
      }
    }

    async function updateTables(
      tables: Record<string, TableSettings>
    ): Promise<boolean> {
      try {
        debug.startState(DebugCategories.STATE, 'Updating tables via GraphQL')

        // Ensure we have auth and Apollo client
        await getApolloClient()

        // Execute mutation inside runInContext
        const result = await runInContext(async () => {
          const table = Object.values(tables)[0]
          if (!table) {
            throw new Error('No table to save')
          }

          const tableInput = transformTableToInput(table)

          // Execute appropriate mutation
          const isNew = !table.id || table.id === 'default'
          if (isNew) {
            const { mutate } = useMutation<CreateTableResponse>(CREATE_TABLE)
            return mutate({
              input: {
                name: table.name,
                config: tableInput.config,
                categoryFilters: tableInput.categoryFilters
              }
            })
          } else {
            const { mutate } = useMutation<UpdateTableResponse>(UPDATE_TABLE)
            return mutate({
              input: {
                id: table.id,
                name: tableInput.name,
                displayName: tableInput.displayName,
                config: tableInput.config,
                categoryFilters: tableInput.categoryFilters,
                sort: tableInput.sort,
                filters: tableInput.filters
              }
            })
          }
        })

        const data = result?.data as
          | (CreateTableResponse | UpdateTableResponse)
          | undefined
        if (!data) {
          debug.warn(DebugCategories.STATE, 'No data in mutation response')
          return false
        }

        const success = !!(
          (data as CreateTableResponse).createNamedTable ||
          (data as UpdateTableResponse).updateNamedTable
        )

        debug.log(DebugCategories.STATE, 'Tables update result', {
          success
        })

        if (!success) {
          throw new Error('Tables update returned false')
        }

        // Manually trigger a refetch to ensure we have the latest data
        await refetch()

        debug.completeState(DebugCategories.STATE, 'Tables update complete')
        return true
      } catch (err) {
        debug.error(DebugCategories.ERROR, 'Failed to update tables', err)
        throw new Error(err instanceof Error ? err.message : 'Failed to update tables')
      }
    }

    return {
      result,
      queryLoading,
      fetchTables,
      updateTables
    }
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Failed to initialize GraphQL', err)
    throw err
  }
}
