import type { NamedTableConfig, ColumnDef } from '~/composables/core/types'
import { debug, DebugCategories } from '~/components/viewer/schedules/debug/useDebug'

interface UseTableOperationsOptions {
  settings: { value: { namedTables?: Record<string, NamedTableConfig> } }
  saveTables: (tables: Record<string, NamedTableConfig>) => Promise<boolean>
  selectTable: (tableId: string) => void
  loadTables: () => Promise<void>
}

export function useTableOperations(options: UseTableOperationsOptions) {
  const { settings, saveTables, selectTable, loadTables } = options

  function formatTableKey(table: NamedTableConfig): string {
    // Create a key in format name_id
    const sanitizedName = table.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
    return `${sanitizedName}_${table.id}`
  }

  async function updateTable(
    id: string,
    config: Partial<NamedTableConfig>
  ): Promise<NamedTableConfig> {
    debug.startState(DebugCategories.TABLE_UPDATES, 'Updating table', {
      id,
      config
    })

    const currentTables = settings.value.namedTables || {}
    const existingTable = Object.values(currentTables).find((table) => table.id === id)

    if (!existingTable) {
      throw new Error('Table not found')
    }

    const updatedTable: NamedTableConfig = {
      ...existingTable,
      ...config,
      // Ensure required fields are present
      displayName:
        config.displayName || existingTable.displayName || existingTable.name,
      parentColumns: Array.isArray(config.parentColumns)
        ? config.parentColumns
        : existingTable.parentColumns,
      childColumns: Array.isArray(config.childColumns)
        ? config.childColumns
        : existingTable.childColumns,
      categoryFilters: config.categoryFilters ||
        existingTable.categoryFilters || {
          selectedParentCategories: [],
          selectedChildCategories: []
        },
      selectedParameterIds: Array.isArray(config.selectedParameterIds)
        ? config.selectedParameterIds
        : existingTable.selectedParameterIds || []
    }

    // Store with name_id as key
    const key = formatTableKey(updatedTable)
    const updatedTables = {
      ...currentTables,
      [key]: updatedTable
    }

    const success = await saveTables(updatedTables)
    if (!success) {
      throw new Error('Failed to update table')
    }

    // Refresh tables after successful update
    await loadTables()

    debug.completeState(DebugCategories.TABLE_UPDATES, 'Table update complete', {
      id,
      updatedTable
    })

    return updatedTable
  }

  async function updateTableCategories(
    id: string,
    parentCategories: string[],
    childCategories: string[]
  ): Promise<NamedTableConfig> {
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
    parentColumns: ColumnDef[],
    childColumns: ColumnDef[]
  ): Promise<NamedTableConfig> {
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
    config: Partial<NamedTableConfig>
  ): Promise<{ id: string; config: NamedTableConfig }> {
    debug.startState(DebugCategories.TABLE_UPDATES, 'Creating new table', {
      name,
      config
    })

    // Generate ID for the table
    const timestamp = Date.now()
    const internalId = `table-${timestamp}`

    const newTable: NamedTableConfig = {
      id: internalId,
      name,
      displayName: config.displayName || name,
      parentColumns: Array.isArray(config.parentColumns) ? config.parentColumns : [],
      childColumns: Array.isArray(config.childColumns) ? config.childColumns : [],
      categoryFilters: config.categoryFilters || {
        selectedParentCategories: [],
        selectedChildCategories: []
      },
      selectedParameterIds: Array.isArray(config.selectedParameterIds)
        ? config.selectedParameterIds
        : [],
      description: config.description
    }

    const currentTables = settings.value.namedTables || {}

    // Store with name_id as key
    const key = formatTableKey(newTable)
    const updatedTables = {
      ...currentTables,
      [key]: newTable
    }

    const success = await saveTables(updatedTables)
    if (!success) {
      throw new Error('Failed to create table')
    }

    // Refresh tables and select the new table
    await loadTables()
    selectTable(internalId)

    debug.completeState(DebugCategories.TABLE_UPDATES, 'Table creation complete', {
      key,
      newTable
    })

    return { id: internalId, config: newTable }
  }

  return {
    updateTable,
    createNamedTable,
    updateTableCategories,
    updateTableColumns
  }
}
