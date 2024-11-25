import { debug, DebugCategories } from '~/components/viewer/schedules/debug/useDebug'
import type { NamedTableConfig } from './types'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import { useUpdateQueue } from './useUpdateQueue'

interface TableOperationsOptions {
  updateNamedTable: (
    id: string,
    config: Partial<NamedTableConfig>
  ) => Promise<NamedTableConfig>
  createNamedTable: (
    name: string,
    config: Omit<NamedTableConfig, 'id' | 'name'>
  ) => Promise<string>
}

export function useTableOperations(options: TableOperationsOptions) {
  const { updateNamedTable, createNamedTable } = options
  const { queueUpdate } = useUpdateQueue()

  async function updateTable(
    tableId: string,
    updates: Partial<NamedTableConfig>
  ): Promise<NamedTableConfig> {
    debug.startState(DebugCategories.TABLE_UPDATES, 'Updating table', {
      tableId,
      updates
    })

    return queueUpdate(async () => {
      try {
        // Ensure we have a valid table ID
        if (!tableId) {
          throw new Error('Table ID is required')
        }

        // Add timestamp to updates
        const updatesWithTimestamp = {
          ...updates,
          lastUpdateTimestamp: Date.now()
        }

        debug.log(DebugCategories.TABLE_UPDATES, 'Applying table updates', {
          tableId,
          updates: updatesWithTimestamp
        })

        const updatedTable = await updateNamedTable(tableId, updatesWithTimestamp)

        debug.completeState(
          DebugCategories.TABLE_UPDATES,
          'Table updated successfully',
          {
            tableId,
            updatedTable
          }
        )

        return updatedTable
      } catch (err) {
        debug.error(DebugCategories.ERROR, 'Failed to update table', {
          tableId,
          error: err
        })
        throw err
      }
    })
  }

  async function createTable(
    name: string,
    config: Omit<NamedTableConfig, 'id' | 'name'>
  ): Promise<{ id: string; config: NamedTableConfig }> {
    debug.startState(DebugCategories.TABLE_UPDATES, 'Creating new table', {
      name,
      config
    })

    return queueUpdate(async () => {
      try {
        // Ensure we have a valid name
        if (!name?.trim()) {
          throw new Error('Table name is required')
        }

        // Add timestamp to config
        const configWithTimestamp = {
          ...config,
          lastUpdateTimestamp: Date.now()
        }

        debug.log(DebugCategories.TABLE_UPDATES, 'Creating table with config', {
          name,
          config: configWithTimestamp
        })

        const tableId = await createNamedTable(name, configWithTimestamp)

        const newTable: NamedTableConfig = {
          id: tableId,
          name,
          ...configWithTimestamp
        }

        debug.completeState(
          DebugCategories.TABLE_UPDATES,
          'Table created successfully',
          {
            tableId,
            newTable
          }
        )

        return { id: tableId, config: newTable }
      } catch (err) {
        debug.error(DebugCategories.ERROR, 'Failed to create table', {
          name,
          error: err
        })
        throw err
      }
    })
  }

  async function updateTableCategories(
    tableId: string,
    parentCategories: string[],
    childCategories: string[]
  ): Promise<NamedTableConfig> {
    debug.startState(DebugCategories.CATEGORIES, 'Updating table categories', {
      tableId,
      parentCategories,
      childCategories
    })

    return updateTable(tableId, {
      categoryFilters: {
        selectedParentCategories: parentCategories,
        selectedChildCategories: childCategories
      }
    })
  }

  async function updateTableColumns(
    tableId: string,
    parentColumns: ColumnDef[],
    childColumns: ColumnDef[]
  ): Promise<NamedTableConfig> {
    debug.startState(DebugCategories.COLUMNS, 'Updating table columns', {
      tableId,
      parentColumnsCount: parentColumns.length,
      childColumnsCount: childColumns.length
    })

    return updateTable(tableId, {
      parentColumns,
      childColumns
    })
  }

  return {
    updateTable,
    createTable,
    updateTableCategories,
    updateTableColumns
  }
}
