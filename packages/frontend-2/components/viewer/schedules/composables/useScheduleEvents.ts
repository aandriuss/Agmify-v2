import { debug, DebugCategories } from '../debug/useDebug'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import type { TableConfig, ScheduleInitializationInstance } from '../types'
import type { Ref } from 'vue'
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
  initComponent: Ref<ScheduleInitializationInstance | null>
  updateCurrentColumns: (tableColumns: ColumnDef[], detailColumns: ColumnDef[]) => void
  handleError: (error: Error) => void
}

export function useScheduleEvents(options: ScheduleEventsOptions) {
  const { state, initComponent, updateCurrentColumns, handleError } = options

  async function handleSaveTable() {
    try {
      debug.log(DebugCategories.TABLE_UPDATES, 'Save table requested', {
        selectedId: state.selectedTableId,
        tableName: state.tableName,
        currentState: {
          parent: state.selectedParentCategories,
          child: state.selectedChildCategories
        }
      })

      // Validate table name
      if (!state.tableName) {
        throw new Error('Table name is required')
      }

      // Create initial config with current category selections
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

      // Create new table or update existing one
      if (!state.selectedTableId) {
        // Create new table with current category selections
        const newTable = await initComponent.value?.createNamedTable(
          state.tableName,
          config
        )
        if (newTable) {
          state.selectedTableId = newTable.id
          state.currentTable = toTableConfig(newTable)
          debug.log(
            DebugCategories.TABLE_UPDATES,
            'New table created with categories',
            {
              id: newTable.id,
              categories: config.categoryFilters
            }
          )
        }
      } else {
        // Update existing table
        const updatedConfig = {
          ...config,
          parentColumns: state.currentTableColumns,
          childColumns: state.currentDetailColumns
        }

        const namedConfig = toNamedTableConfig(updatedConfig, state.selectedTableId)
        await initComponent.value?.updateNamedTable(state.selectedTableId, namedConfig)

        state.currentTable = updatedConfig as TableConfig
        debug.log(DebugCategories.TABLE_UPDATES, 'Table updated with categories', {
          id: state.selectedTableId,
          categories: namedConfig.categoryFilters
        })
      }
    } catch (err) {
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
    handleSaveTable,
    handleBothColumnsUpdate
  }
}
