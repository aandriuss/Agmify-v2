import { useMutation, useQuery, provideApolloClient } from '@vue/apollo-composable'
import { gql } from 'graphql-tag'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import { useNuxtApp } from '#app'
import { useWaitForActiveUser } from '~/lib/auth/composables/activeUser'
import { isGraphQLAuthError } from '~/composables/core/utils/errors'
import type { TableSettings, TableColumn } from '~/composables/core/types'
import type { SelectedParameter } from '~/composables/core/types/parameters/parameter-states'
import type {
  BimValueType,
  UserValueType
} from '~/composables/core/types/parameters/value-types'
import type { GraphQLError } from 'graphql'

interface GraphQLResponse<T> {
  data?: T
  errors?: readonly GraphQLError[]
}

interface GetTablesResponse {
  activeUser: {
    tables: Record<string, unknown>
  }
}

interface UpdateTablesResponse {
  userTablesUpdate: boolean
}

interface TableSettingsEntry {
  id: string
  settings: {
    name: string
    displayName: string
    parentColumns: TableColumn[]
    childColumns: TableColumn[]
    categoryFilters?: {
      selectedParentCategories: string[]
      selectedChildCategories: string[]
    }
    selectedParameters: {
      parent: SelectedParameter[]
      child: SelectedParameter[]
    }
    filters?: Array<{
      columnId: string
      value?: unknown
      operator: string
    }>
    lastUpdateTimestamp: number
    description?: string
    metadata?: unknown
  }
}

const GET_USER_TABLES = gql`
  query GetUserTables {
    activeUser {
      tables
    }
  }
`

const UPDATE_USER_TABLES = gql`
  mutation UpdateUserTables($input: TableSettingsMapInput!) {
    userTablesUpdate(input: $input)
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

        // Get raw tables object from response
        const tables = response?.data?.activeUser?.tables
        if (!tables || typeof tables !== 'object') {
          debug.warn(DebugCategories.INITIALIZATION, 'No tables in GraphQL response')
          return {}
        }

        // Tables are already in the correct format since we store them as JSON
        const result = tables as Record<string, TableSettings>

        debug.log(DebugCategories.INITIALIZATION, 'Tables fetched from GraphQL', {
          hasTables: Object.keys(result).length > 0,
          tableCount: Object.keys(result).length
        })

        debug.completeState(DebugCategories.INITIALIZATION, 'Tables fetch complete')
        return result
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
          const { mutate } = useMutation(UPDATE_USER_TABLES)

          debug.log(DebugCategories.STATE, 'Preparing tables update mutation', {
            tableCount: Object.keys(tables).length,
            tableIds: Object.keys(tables)
          })

          // Convert tables to GraphQL input format
          const tableEntries = Object.entries(tables).map(
            ([id, table]): TableSettingsEntry => ({
              id,
              settings: {
                name: table.name,
                displayName: table.displayName,
                parentColumns: table.parentColumns.map((col) => {
                  // Ensure all required TableColumn fields are present
                  const column: TableColumn = {
                    id: col.id,
                    field: col.field,
                    header: col.header,
                    visible: col.visible,
                    removable: col.removable,
                    sortable: col.sortable ?? true,
                    filterable: col.filterable ?? true,
                    width: col.width,
                    order: col.order,
                    headerComponent: col.headerComponent,
                    parameter:
                      col.parameter?.kind === 'user'
                        ? {
                            id: col.parameter.id,
                            name: col.parameter.name,
                            kind: 'user' as const,
                            type: col.parameter.type,
                            value:
                              col.parameter.value === null
                                ? ''
                                : String(col.parameter.value),
                            visible: col.parameter.visible,
                            order: col.parameter.order,
                            field: col.parameter.field || col.parameter.id,
                            header: col.parameter.header || col.parameter.name,
                            removable: col.parameter.removable ?? true,
                            group: col.parameter.group,
                            category: col.parameter.category,
                            description: col.parameter.description,
                            metadata: col.parameter.metadata || {},
                            equation: col.parameter.equation,
                            isCustom: col.parameter.isCustom
                          }
                        : {
                            id: col.parameter?.id || col.id,
                            name: col.parameter?.name || col.header || '',
                            kind: 'bim' as const,
                            type: (col.parameter?.type || 'string') as BimValueType,
                            value:
                              col.parameter?.value === null
                                ? ''
                                : String(col.parameter?.value || ''),
                            visible: col.parameter?.visible ?? col.visible,
                            order: col.parameter?.order || col.order || 0,
                            field: col.parameter?.field || col.id,
                            header: col.parameter?.header || col.header || '',
                            removable:
                              col.parameter?.removable ?? col.removable ?? true,
                            group: col.parameter?.group || 'Parameters',
                            category: col.parameter?.category,
                            description: col.parameter?.description,
                            metadata: col.parameter?.metadata || {},
                            sourceValue:
                              col.parameter?.value === null
                                ? ''
                                : String(col.parameter?.value || ''),
                            fetchedGroup: col.parameter?.fetchedGroup || 'Parameters',
                            currentGroup: col.parameter?.currentGroup || 'Parameters'
                          }
                  }
                  return column
                }),
                childColumns: table.childColumns.map((col) => {
                  // Ensure all required TableColumn fields are present
                  const column: TableColumn = {
                    id: col.id,
                    field: col.field,
                    header: col.header,
                    visible: col.visible,
                    removable: col.removable,
                    sortable: col.sortable ?? true,
                    filterable: col.filterable ?? true,
                    width: col.width,
                    order: col.order,
                    headerComponent: col.headerComponent,
                    parameter:
                      col.parameter.kind === 'bim'
                        ? {
                            id: col.parameter.id,
                            name: col.parameter.name,
                            kind: 'bim' as const,
                            type: col.parameter.type as BimValueType,
                            value:
                              col.parameter.value === null
                                ? ''
                                : String(col.parameter.value),
                            visible: col.parameter.visible,
                            order: col.parameter.order,
                            field: col.parameter.field || col.parameter.id,
                            header: col.parameter.header || col.parameter.name,
                            removable: col.parameter.removable ?? true,
                            group: col.parameter.group,
                            category: col.parameter.category,
                            description: col.parameter.description,
                            metadata: col.parameter.metadata,
                            sourceValue:
                              col.parameter.value === null
                                ? ''
                                : String(col.parameter.value),
                            fetchedGroup: col.parameter.fetchedGroup || 'Parameters',
                            currentGroup: col.parameter.currentGroup || 'Parameters'
                          }
                        : {
                            id: col.parameter.id,
                            name: col.parameter.name,
                            kind: 'user' as const,
                            type: col.parameter.type as UserValueType,
                            value:
                              col.parameter.value === null
                                ? ''
                                : String(col.parameter.value),
                            visible: col.parameter.visible,
                            order: col.parameter.order,
                            field: col.parameter.field || col.parameter.id,
                            header: col.parameter.header || col.parameter.name,
                            removable: col.parameter.removable ?? true,
                            group: col.parameter.group,
                            category: col.parameter.category,
                            description: col.parameter.description,
                            metadata: col.parameter.metadata,
                            equation: col.parameter.equation,
                            isCustom: col.parameter.isCustom
                          }
                  }
                  return column
                }),
                categoryFilters: table.categoryFilters,
                selectedParameters: {
                  parent: table.selectedParameters.parent.map((param) =>
                    param.kind === 'bim'
                      ? {
                          id: param.id,
                          name: param.name,
                          kind: 'bim' as const,
                          type: param.type as BimValueType,
                          value: param.value === null ? '' : String(param.value),
                          visible: param.visible,
                          order: param.order,
                          field: param.field || param.id,
                          header: param.header || param.name,
                          removable: param.removable ?? true,
                          group: param.group,
                          category: param.category,
                          description: param.description,
                          metadata: param.metadata || {},
                          sourceValue: param.value === null ? '' : String(param.value),
                          fetchedGroup: param.fetchedGroup || 'Parameters',
                          currentGroup: param.currentGroup || 'Parameters'
                        }
                      : {
                          id: param.id,
                          name: param.name,
                          kind: 'user' as const,
                          type: param.type as UserValueType,
                          value: param.value === null ? '' : String(param.value),
                          visible: param.visible,
                          order: param.order,
                          field: param.field || param.id,
                          header: param.header || param.name,
                          removable: param.removable ?? true,
                          group: param.group,
                          category: param.category,
                          description: param.description,
                          metadata: param.metadata || {},
                          equation: param.equation,
                          isCustom: param.isCustom
                        }
                  ),
                  child: table.selectedParameters.child.map((param) =>
                    param.kind === 'bim'
                      ? {
                          id: param.id,
                          name: param.name,
                          kind: 'bim' as const,
                          type: param.type as BimValueType,
                          value: param.value === null ? '' : String(param.value),
                          visible: param.visible,
                          order: param.order,
                          field: param.field || param.id,
                          header: param.header || param.name,
                          removable: param.removable ?? true,
                          group: param.group,
                          category: param.category,
                          description: param.description,
                          metadata: param.metadata || {},
                          sourceValue: param.value === null ? '' : String(param.value),
                          fetchedGroup: param.fetchedGroup || 'Parameters',
                          currentGroup: param.currentGroup || 'Parameters'
                        }
                      : {
                          id: param.id,
                          name: param.name,
                          kind: 'user' as const,
                          type: param.type as UserValueType,
                          value: param.value === null ? '' : String(param.value),
                          visible: param.visible,
                          order: param.order,
                          field: param.field || param.id,
                          header: param.header || param.name,
                          removable: param.removable ?? true,
                          group: param.group,
                          category: param.category,
                          description: param.description,
                          metadata: param.metadata || {},
                          equation: param.equation,
                          isCustom: param.isCustom
                        }
                  )
                },
                filters: table.filters,
                lastUpdateTimestamp: table.lastUpdateTimestamp,
                metadata: table.metadata || {}
              }
            })
          )

          // Log the mutation input
          /* eslint-disable no-console */
          console.log('GraphQL Mutation Input:', {
            input: {
              tables: tableEntries
            }
          })

          // Log the first table entry for detailed inspection
          if (tableEntries.length > 0) {
            /* eslint-disable no-console */

            console.log('First Table Entry Details:', {
              id: tableEntries[0].id,
              name: tableEntries[0].settings.name,
              parentColumnsCount: tableEntries[0].settings.parentColumns.length,
              childColumnsCount: tableEntries[0].settings.childColumns.length,
              hasParameters: !!tableEntries[0].settings.selectedParameters,
              parameterCounts: {
                parent: tableEntries[0].settings.selectedParameters?.parent.length || 0,
                child: tableEntries[0].settings.selectedParameters?.child.length || 0
              }
            })
          }

          try {
            const mutationResponse = await mutate({
              input: {
                tables: tableEntries
              }
            })

            // Type-safe response handling
            const response = mutationResponse as GraphQLResponse<UpdateTablesResponse>

            // Log detailed response for debugging
            debug.log(DebugCategories.STATE, 'GraphQL Mutation Response', {
              success: !!response.data?.userTablesUpdate,
              hasData: !!response.data,
              hasErrors: !!response.errors,
              errors: response.errors,
              data: response.data
            })

            // Check for GraphQL errors
            if (response.errors?.length) {
              const errorMessages = response.errors.map((e) => e.message).join(', ')
              throw new Error(`GraphQL errors: ${errorMessages}`)
            }

            // Check for successful update
            const success = response.data?.userTablesUpdate ?? false

            if (!success) {
              throw new Error('Tables update returned false')
            }

            debug.log(DebugCategories.STATE, 'Mutation completed successfully')
            return success
          } catch (err) {
            debug.error(DebugCategories.ERROR, 'Mutation failed', err)
            throw err
          }
        })

        if (!result) {
          throw new Error('Tables update returned false')
        }

        try {
          // Manually trigger a refetch and wait for it to complete
          const refetchResult = await refetch()
          if (!refetchResult?.data) {
            throw new Error('Refetch returned no data')
          }

          const tables = refetchResult.data.activeUser?.tables
          debug.log(DebugCategories.STATE, 'Tables refetched', {
            success: true,
            tableCount: tables ? Object.keys(tables).length : 0,
            hasData: !!tables
          })
        } catch (err) {
          debug.error(DebugCategories.ERROR, 'Failed to refetch tables', err)
          // Don't throw here - the update was successful even if refetch failed
        }

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
