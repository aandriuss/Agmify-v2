import { debug, DebugCategories } from '../utils/debug'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import type { ScheduleInitializationExposed, TableConfig } from '../types'
import { toNamedTableConfig, toTableConfig } from '../utils/tableConfigConversion'

interface ScheduleEventsOptions {
  state: {
    selectedTableId: string
    tableName: string
    currentTable: TableConfig | null
    selectedParentCategories: string[]
    selectedChildCategories: string[]
    currentTableColumns: ColumnDef[]
    currentDetailColumns: ColumnDef[]
  }
  initComponent: ScheduleInitializationExposed | null
  updateCurrentColumns: (tableColumns: ColumnDef[], detailColumns: ColumnDef[]) => void
  handleError: (error: Error) => void
}

export function useScheduleEvents(options: ScheduleEventsOptions) {
  const { state, initComponent, updateCurrentColumns, handleError } = options

  async function handleTableChange() {
    debug.log(DebugCategories.TABLE_UPDATES, 'Table change requested', {
      selectedId: state.selectedTableId,
      currentTable: state.currentTable
    })

    try {
      if (!state.selectedTableId) {
        // Reset to empty arrays for new table
        state.selectedParentCategories = []
        state.selectedChildCategories = []
        state.currentTable = null
        state.tableName = ''
        return
      }

      // Load table settings
      const init = initComponent
      if (!init) return

      await init.handleTableSelection(state.selectedTableId)

      // Get current table from ref with type safety
      const currentTableRef = init.currentTable
      if (!currentTableRef?.value) {
        state.currentTable = null
        return
      }

      const namedTable = currentTableRef.value

      // Convert to TableConfig for local state
      state.currentTable = toTableConfig(namedTable)
      state.tableName = init.tableName?.value ?? ''

      // Update category state
      state.selectedParentCategories =
        namedTable.categoryFilters?.selectedParentCategories ?? []
      state.selectedChildCategories =
        namedTable.categoryFilters?.selectedChildCategories ?? []

      debug.log(DebugCategories.TABLE_UPDATES, 'Table loaded:', {
        id: state.selectedTableId,
        name: state.tableName,
        categories: {
          parent: state.selectedParentCategories,
          child: state.selectedChildCategories
        }
      })
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to handle table change:', err)
      handleError(
        err instanceof Error ? err : new Error('Failed to handle table change')
      )
    }
  }

  async function handleSaveTable() {
    debug.log(DebugCategories.TABLE_UPDATES, 'Save table requested', {
      selectedId: state.selectedTableId,
      tableName: state.tableName,
      currentTable: state.currentTable
    })

    try {
      if (!state.tableName) {
        throw new Error('Table name is required')
      }

      const init = initComponent
      if (!init) {
        throw new Error('Initialization component not available')
      }

      // For new tables, create an initial table config
      if (!state.selectedTableId) {
        const config = {
          name: state.tableName,
          parentColumns: [],
          childColumns: [],
          categoryFilters: {
            selectedParentCategories: state.selectedParentCategories,
            selectedChildCategories: state.selectedChildCategories
          },
          customParameters: []
        }

        // Create new table
        const newTableId = await init.createNamedTable(state.tableName, config)
        if (newTableId) {
          state.selectedTableId = newTableId
          state.currentTable = config
        }
        return
      }

      // For existing tables, ensure we have current table data
      if (!state.currentTable) {
        // Try to load table data first
        await handleTableChange()
      }

      // Create base config with current state
      const baseConfig = {
        name: state.tableName,
        parentColumns: state.currentTableColumns,
        childColumns: state.currentDetailColumns,
        categoryFilters: {
          selectedParentCategories: state.selectedParentCategories,
          selectedChildCategories: state.selectedChildCategories
        }
      }

      // Convert to NamedTableConfig for update
      const namedConfig = toNamedTableConfig(baseConfig, state.selectedTableId)

      // Update existing table
      const updatedTable = await init.updateNamedTable(
        state.selectedTableId,
        namedConfig
      )

      // Convert back to TableConfig for local state
      state.currentTable = toTableConfig(updatedTable)

      // Trigger table reload to ensure we have latest data
      await handleTableChange()

      debug.log(DebugCategories.TABLE_UPDATES, 'Table saved successfully', {
        config: baseConfig,
        currentTable: state.currentTable
      })
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to save table:', err)
      handleError(err instanceof Error ? err : new Error('Failed to save table'))
    }
  }

  function handleBothColumnsUpdate(updates: {
    parentColumns: ColumnDef[]
    childColumns: ColumnDef[]
  }) {
    debug.log(DebugCategories.COLUMNS, 'Both columns update requested', updates)
    updateCurrentColumns(updates.parentColumns, updates.childColumns)
  }

  return {
    handleTableChange,
    handleSaveTable,
    handleBothColumnsUpdate
  }
}
