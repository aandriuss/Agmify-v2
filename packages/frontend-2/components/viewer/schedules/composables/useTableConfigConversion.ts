import type { TableConfig } from '../types'
import type { NamedTableConfig } from '~/composables/useUserSettings'

interface UseTableConfigConversionOptions {
  updateNamedTable: (
    tableId: string,
    updates: Partial<NamedTableConfig>
  ) => Promise<NamedTableConfig>
}

export function useTableConfigConversion(options: UseTableConfigConversionOptions) {
  const { updateNamedTable } = options

  const convertAndUpdateTable = async (
    id: string,
    config: TableConfig
  ): Promise<void> => {
    // Convert TableConfig to NamedTableConfig
    const namedConfig: NamedTableConfig = {
      ...config,
      id,
      name: config.name,
      parentColumns: config.parentColumns,
      childColumns: config.childColumns,
      categoryFilters: config.categoryFilters || {
        selectedParentCategories: [],
        selectedChildCategories: []
      },
      customParameters: config.customParameters || []
    }
    await updateNamedTable(id, namedConfig)
  }

  return {
    convertAndUpdateTable
  }
}
