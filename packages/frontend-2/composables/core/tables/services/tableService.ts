import { gql } from '@apollo/client/core'
import { useApolloClient } from '@vue/apollo-composable'
import type { TableSettings } from '../store/types'
import type {
  GetTableResponse,
  SaveTableResponse,
  DeleteTableResponse,
  SaveTableInput,
  DeleteTableInput,
  NamedTableConfig,
  TableColumn
} from './types'
import type { ColumnDef } from '~/composables/core/types/tables'
import type { PrimitiveValue } from '~/composables/core/types/parameters/value-types'
import {
  createBimColumnDefWithDefaults,
  createUserColumnDefWithDefaults
} from '~/composables/core/types'
import { toBimValueType, toUserValueType } from '~/composables/core/utils/conversion'
import { debug, DebugCategories } from '~/composables/core/utils/debug'

/**
 * Convert TableColumn to ColumnDef
 */
function toColumnDef(column: TableColumn): ColumnDef {
  const base = {
    id: column.field,
    name: column.header,
    field: column.field,
    header: column.header,
    visible: column.visible,
    removable: column.removable,
    order: column.order || 0,
    category: column.category,
    description: column.description,
    metadata: column.metadata,
    value: column.value
  }

  if (column.kind === 'bim') {
    return createBimColumnDefWithDefaults({
      ...base,
      type: toBimValueType(column.type || 'string'),
      sourceValue: (column.sourceValue || null) as PrimitiveValue,
      fetchedGroup: column.fetchedGroup || 'Default',
      currentGroup: column.currentGroup || column.fetchedGroup || 'Default',
      isFixed: column.isFixed || false
    })
  }

  return createUserColumnDefWithDefaults({
    ...base,
    type: toUserValueType(column.type || 'fixed'),
    group: column.group || 'Custom',
    isCustomParameter: column.isCustomParameter || false
  })
}

/**
 * Convert ColumnDef to TableColumn
 */
function toTableColumn(column: ColumnDef): TableColumn {
  const base = {
    id: column.id,
    name: column.name,
    field: column.field,
    header: column.header,
    width: column.width,
    visible: column.visible,
    removable: column.removable,
    order: column.order || 0,
    category: column.category,
    description: column.description,
    metadata: column.metadata,
    value: column.value,
    type: column.type
  }

  if ('sourceValue' in column) {
    return {
      ...base,
      kind: 'bim',
      sourceValue: column.sourceValue,
      fetchedGroup: column.fetchedGroup,
      currentGroup: column.currentGroup,
      isFixed: column.isFixed
    }
  }

  return {
    ...base,
    kind: 'user',
    group: column.group,
    isCustomParameter: column.isCustomParameter
  }
}

/**
 * Convert NamedTableConfig to TableSettings
 */
/**
 * Convert NamedTableConfig to TableSettings
 */
function toTableSettings(config: NamedTableConfig): TableSettings {
  return {
    id: config.id,
    name: config.name,
    displayName: config.name,
    childColumns: config.config.childColumns.map(toColumnDef),
    parentColumns: config.config.parentColumns.map(toColumnDef),
    categoryFilters: config.categoryFilters,
    selectedParameters: config.config.selectedParameters,
    lastUpdateTimestamp: Date.now()
  }
}

/**
 * Convert TableSettings to UpdateNamedTableInput
 */
function toNamedTableInput(settings: TableSettings) {
  return {
    id: settings.id,
    name: settings.name,
    config: {
      parentColumns: settings.parentColumns.map(toTableColumn),
      childColumns: settings.childColumns.map(toTableColumn),
      selectedParameters: settings.selectedParameters
    },
    categoryFilters: settings.categoryFilters
  }
}

const GET_TABLE = gql`
  query GetTable($tableId: String!) {
    namedTableConfig(id: $tableId) {
      id
      name
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
            id
            name
            kind
            type
            value
            group
            visible
            order
            category
            description
            metadata
          }
          child {
            id
            name
            kind
            type
            value
            group
            visible
            order
            category
            description
            metadata
          }
        }
      }
      categoryFilters {
        selectedParentCategories
        selectedChildCategories
      }
    }
  }
`

const SAVE_TABLE = gql`
  mutation SaveTable($input: UpdateNamedTableInput!) {
    updateNamedTable(input: $input) {
      id
      name
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
            id
            name
            kind
            type
            value
            group
            visible
            order
            category
            description
            metadata
          }
          child {
            id
            name
            kind
            type
            value
            group
            visible
            order
            category
            description
            metadata
          }
        }
      }
      categoryFilters {
        selectedParentCategories
        selectedChildCategories
      }
    }
  }
`

const DELETE_TABLE = gql`
  mutation DeleteTable($tableId: String!) {
    deleteTable(id: $tableId)
  }
`

export function useTableService() {
  const { resolveClient } = useApolloClient()

  /**
   * Fetch table from PostgreSQL
   */
  async function fetchTable(tableId: string): Promise<TableSettings> {
    debug.startState(DebugCategories.TABLE_DATA, 'Fetching table', { tableId })

    try {
      const client = resolveClient()
      const { data } = await client.query<GetTableResponse>({
        query: GET_TABLE,
        variables: { tableId }
      })

      if (!data?.namedTableConfig) {
        throw new Error(`No table data returned for ID: ${tableId}`)
      }

      debug.log(DebugCategories.TABLE_DATA, 'Table fetched', {
        tableId,
        data: data.namedTableConfig
      })

      return toTableSettings(data.namedTableConfig)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      debug.error(DebugCategories.TABLE_DATA, 'Failed to fetch table:', error)
      throw error
    }
  }

  /**
   * Save table to PostgreSQL
   */
  async function saveTable(settings: TableSettings): Promise<TableSettings> {
    debug.startState(DebugCategories.TABLE_UPDATES, 'Saving table', {
      tableId: settings.id,
      settings
    })

    try {
      const client = resolveClient()
      const { data } = await client.mutate<SaveTableResponse, SaveTableInput>({
        mutation: SAVE_TABLE,
        variables: { input: toNamedTableInput(settings) }
      })

      if (!data?.updateNamedTable) {
        throw new Error(`Failed to save table: ${settings.id}`)
      }

      debug.log(DebugCategories.TABLE_UPDATES, 'Table saved', {
        tableId: settings.id,
        data: data.updateNamedTable
      })

      return toTableSettings(data.updateNamedTable)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      debug.error(DebugCategories.TABLE_UPDATES, 'Failed to save table:', error)
      throw error
    }
  }

  /**
   * Delete table from PostgreSQL
   */
  async function deleteTable(tableId: string): Promise<boolean> {
    debug.startState(DebugCategories.TABLE_UPDATES, 'Deleting table', { tableId })

    try {
      const client = resolveClient()
      const { data } = await client.mutate<DeleteTableResponse, DeleteTableInput>({
        mutation: DELETE_TABLE,
        variables: { tableId }
      })

      if (data?.deleteNamedTable === undefined) {
        throw new Error(`Failed to delete table: ${tableId}`)
      }

      debug.log(DebugCategories.TABLE_UPDATES, 'Table deleted', {
        tableId,
        success: data.deleteNamedTable
      })

      return data.deleteNamedTable
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      debug.error(DebugCategories.TABLE_UPDATES, 'Failed to delete table:', error)
      throw error
    }
  }

  return {
    fetchTable,
    saveTable,
    deleteTable
  }
}
