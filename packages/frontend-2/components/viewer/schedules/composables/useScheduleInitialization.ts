import { ref } from 'vue'
import type { useStore } from '../core/store'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import type {
  TableConfig,
  ScheduleInitializationInstance
} from '~/composables/core/types'

interface UseScheduleInitializationOptions {
  store: ReturnType<typeof useStore>
  categories: {
    selectedParentCategories: { value: string[] }
    selectedChildCategories: { value: string[] }
  }
}

export function useScheduleInitialization({
  store,
  categories
}: UseScheduleInitializationOptions) {
  const initComponent = ref<ScheduleInitializationInstance>({
    initialize: async () => {
      debug.log(DebugCategories.INITIALIZATION, 'Initializing schedule component')
      await store.lifecycle.init()
    },

    createNamedTable: async (
      name: string,
      config: Omit<TableConfig, 'id' | 'name'>
    ) => {
      debug.log(DebugCategories.TABLE_UPDATES, 'Creating new table', {
        name,
        config
      })

      await store.lifecycle.update({
        tableName: name,
        parentBaseColumns: config.parentColumns,
        childBaseColumns: config.childColumns,
        parentVisibleColumns: config.parentColumns,
        childVisibleColumns: config.childColumns,
        selectedParentCategories:
          config.categoryFilters?.selectedParentCategories || [],
        selectedChildCategories: config.categoryFilters?.selectedChildCategories || [],
        customParameters: config.customParameters || []
      })

      // Return table config
      const tableConfig: TableConfig = {
        id: store.currentTableId.value,
        name,
        parentColumns: config.parentColumns,
        childColumns: config.childColumns,
        categoryFilters: config.categoryFilters,
        customParameters: config.customParameters
      }

      return tableConfig
    },

    updateNamedTable: async (id: string, config: Partial<TableConfig>) => {
      debug.log(DebugCategories.TABLE_UPDATES, 'Updating table', {
        id,
        config
      })

      await store.lifecycle.update({
        currentTableId: id,
        tableName: config.name,
        ...(config.parentColumns && {
          parentBaseColumns: config.parentColumns,
          parentVisibleColumns: config.parentColumns
        }),
        ...(config.childColumns && {
          childBaseColumns: config.childColumns,
          childVisibleColumns: config.childColumns
        }),
        ...(config.categoryFilters && {
          selectedParentCategories: config.categoryFilters.selectedParentCategories,
          selectedChildCategories: config.categoryFilters.selectedChildCategories
        }),
        ...(config.customParameters && {
          customParameters: config.customParameters
        })
      })

      const tableConfig: TableConfig = {
        id,
        name: config.name || store.tableName.value,
        parentColumns: config.parentColumns || store.parentVisibleColumns.value || [],
        childColumns: config.childColumns || store.childVisibleColumns.value || [],
        categoryFilters: config.categoryFilters || {
          selectedParentCategories: categories.selectedParentCategories.value,
          selectedChildCategories: categories.selectedChildCategories.value
        },
        customParameters: config.customParameters || store.customParameters.value || []
      }

      return tableConfig
    }
  })

  return {
    initComponent
  }
}
