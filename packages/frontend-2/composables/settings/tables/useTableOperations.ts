import type { TableSettings, TableColumn } from '~/composables/core/types'
import { debug, DebugCategories } from '~/composables/core/utils/debug'

interface UseTableOperationsOptions {
  settings: { value: { namedTables?: Record<string, TableSettings> } }
  saveTables: (tables: Record<string, TableSettings>) => Promise<boolean>
  selectTable: (tableId: string) => void
}

export function useTableOperations(options: UseTableOperationsOptions) {
  const { settings, saveTables, selectTable } = options

  function formatTableKey(table: TableSettings): string {
    // Create a key in format name_id
    const sanitizedName = table.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
    return `${sanitizedName}_${table.id}`
  }

  function findTableById(id: string): TableSettings | null {
    // If no ID provided, return null
    if (!id) return null

    const currentTables = settings.value.namedTables || {}

    // First try to find by direct ID
    const table = Object.values(currentTables).find((t) => t.id === id)
    if (table) return table

    // If not found, try to extract ID from name_id format
    const idFromKey = id.split('_').pop()
    if (idFromKey) {
      const tableByExtractedId = Object.values(currentTables).find(
        (t) => t.id === idFromKey
      )
      if (tableByExtractedId) return tableByExtractedId
    }

    // If still not found, check if this is a new table being created
    if (id.startsWith('table-')) {
      debug.log(DebugCategories.STATE, 'New table being created', { id })
      return null
    }

    debug.error(DebugCategories.ERROR, 'Table not found', {
      searchId: id,
      availableIds: Object.values(currentTables).map((t) => t.id)
    })
    return null
  }

  async function updateTable(
    id: string,
    config: Partial<TableSettings>
  ): Promise<TableSettings> {
    debug.startState(DebugCategories.TABLE_UPDATES, 'Updating table', {
      id,
      config
    })

    const existingTable = findTableById(id)
    // If table not found and it's a new table being created, proceed with creation
    if (!existingTable && !id.startsWith('table-')) {
      throw new Error('Table not found')
    }

    const baseTable = existingTable || {
      id,
      name: '',
      displayName: '',
      parentColumns: [],
      childColumns: [],
      categoryFilters: {
        selectedParentCategories: [],
        selectedChildCategories: []
      },
      selectedParameters: {
        parent: [],
        child: []
      },
      filters: [],
      lastUpdateTimestamp: Date.now()
    }

    const updatedTable: TableSettings = {
      ...baseTable,
      ...config,
      // Ensure required fields are present
      id: baseTable.id, // Keep the original ID
      name: config.name || baseTable.name,
      displayName: config.displayName || baseTable.displayName || baseTable.name,
      parentColumns: Array.isArray(config.parentColumns)
        ? config.parentColumns
        : baseTable.parentColumns,
      childColumns: Array.isArray(config.childColumns)
        ? config.childColumns
        : baseTable.childColumns,
      categoryFilters: config.categoryFilters ||
        baseTable.categoryFilters || {
          selectedParentCategories: [],
          selectedChildCategories: []
        },
      selectedParameters: config.selectedParameters ||
        baseTable.selectedParameters || {
          parent: [],
          child: []
        },
      filters: config.filters || baseTable.filters || [],
      lastUpdateTimestamp: config.lastUpdateTimestamp || Date.now()
    }

    const currentTables = settings.value.namedTables || {}

    // Remove old table entry if name changed
    const oldKey = existingTable ? formatTableKey(existingTable) : ''
    const newKey = formatTableKey(updatedTable)
    const updatedTables = { ...currentTables }

    if (oldKey && oldKey !== newKey) {
      delete updatedTables[oldKey]
    }
    updatedTables[newKey] = updatedTable

    debug.log(DebugCategories.TABLE_UPDATES, 'Saving updated tables', {
      tableCount: Object.keys(updatedTables).length,
      updatedTable: {
        id: updatedTable.id,
        name: updatedTable.name,
        oldKey,
        newKey,
        parentColumnsCount: updatedTable.parentColumns.length,
        childColumnsCount: updatedTable.childColumns.length
      }
    })

    try {
      const success = await saveTables(updatedTables)
      if (!success) {
        throw new Error('Failed to update table')
      }

      // Re-select the table using the original ID
      selectTable(baseTable.id)

      debug.completeState(DebugCategories.TABLE_UPDATES, 'Table update complete', {
        id,
        updatedTable: {
          id: updatedTable.id,
          name: updatedTable.name,
          parentColumnsCount: updatedTable.parentColumns.length,
          childColumnsCount: updatedTable.childColumns.length
        }
      })

      return updatedTable
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to update table', err)
      throw err instanceof Error ? err : new Error('Failed to update table')
    }
  }

  async function updateTableCategories(
    id: string,
    parentCategories: string[],
    childCategories: string[]
  ): Promise<TableSettings> {
    debug.startState(DebugCategories.CATEGORIES, 'Updating table categories', {
      id,
      parentCategories,
      childCategories
    })

    return updateTable(id, {
      categoryFilters: {
        selectedParentCategories: parentCategories,
        selectedChildCategories: childCategories
      }
    })
  }

  async function updateTableColumns(
    id: string,
    parentColumns: TableColumn[],
    childColumns: TableColumn[]
  ): Promise<TableSettings> {
    debug.startState(DebugCategories.COLUMNS, 'Updating table columns', {
      id,
      parentColumnsCount: parentColumns?.length ?? 0,
      childColumnsCount: childColumns?.length ?? 0
    })

    // Ensure columns are arrays
    const validParentColumns = Array.isArray(parentColumns) ? parentColumns : []
    const validChildColumns = Array.isArray(childColumns) ? childColumns : []

    return updateTable(id, {
      parentColumns: validParentColumns,
      childColumns: validChildColumns
    })
  }

  async function createNamedTable(
    name: string,
    config: Partial<TableSettings>
  ): Promise<{ id: string; config: TableSettings }> {
    debug.startState(DebugCategories.TABLE_UPDATES, 'Creating new table', {
      name,
      config
    })

    // Generate ID for the table
    const timestamp = Date.now()
    const internalId = `table-${timestamp}`

    const newTable: TableSettings = {
      id: internalId,
      name,
      displayName: config.displayName || name,
      parentColumns: Array.isArray(config.parentColumns) ? config.parentColumns : [],
      childColumns: Array.isArray(config.childColumns) ? config.childColumns : [],
      categoryFilters: config.categoryFilters || {
        selectedParentCategories: [],
        selectedChildCategories: []
      },
      selectedParameters: config.selectedParameters || {
        parent: [],
        child: []
      },
      filters: config.filters || [],
      lastUpdateTimestamp: Date.now()
    }

    const currentTables = settings.value.namedTables || {}

    // Store with name_id as key
    const key = formatTableKey(newTable)
    const updatedTables = {
      ...currentTables,
      [key]: newTable
    }

    debug.log(DebugCategories.TABLE_UPDATES, 'Saving new table', {
      tableCount: Object.keys(updatedTables).length,
      newTable: {
        id: newTable.id,
        name: newTable.name,
        key,
        parentColumnsCount: newTable.parentColumns.length,
        childColumnsCount: newTable.childColumns.length
      }
    })

    try {
      const success = await saveTables(updatedTables)
      if (!success) {
        throw new Error('Failed to create table')
      }

      // Select the new table using the internal ID
      selectTable(internalId)

      debug.completeState(DebugCategories.TABLE_UPDATES, 'Table creation complete', {
        key,
        newTable: {
          id: newTable.id,
          name: newTable.name,
          parentColumnsCount: newTable.parentColumns.length,
          childColumnsCount: newTable.childColumns.length
        }
      })

      return { id: internalId, config: newTable }
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to create table', err)
      throw err instanceof Error ? err : new Error('Failed to create table')
    }
  }

  return {
    updateTable,
    createNamedTable,
    updateTableCategories,
    updateTableColumns
  }
}
