import { debug, DebugCategories } from '~/components/viewer/schedules/utils/debug'
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
    debug.log(DebugCategories.TABLE_UPDATES, 'Queueing table update', {
      tableId,
      updates
    })

    return queueUpdate(async () => {
      try {
        const updatedTable = await updateNamedTable(tableId, {
          ...updates,
          lastUpdateTimestamp: Date.now()
        })

        debug.log(DebugCategories.TABLE_UPDATES, 'Table updated successfully', {
          tableId,
          updatedTable
        })

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
    debug.log(DebugCategories.TABLE_UPDATES, 'Creating new table', {
      name,
      config
    })

    return queueUpdate(async () => {
      try {
        const tableId = await createNamedTable(name, config)

        const newTable: NamedTableConfig = {
          id: tableId,
          name,
          ...config,
          lastUpdateTimestamp: Date.now()
        }

        debug.log(DebugCategories.TABLE_UPDATES, 'Table created successfully', {
          tableId,
          newTable
        })

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
    debug.log(DebugCategories.CATEGORIES, 'Updating table categories', {
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
    debug.log(DebugCategories.COLUMNS, 'Updating table columns', {
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
