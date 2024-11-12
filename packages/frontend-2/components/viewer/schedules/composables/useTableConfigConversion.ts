import type { TableConfig } from '../types'
import type { NamedTableConfig, CustomParameter } from '~/composables/useUserSettings'
import type { ParameterDefinition } from '~/components/viewer/components/tables/DataTable/composables/parameters/parameterManagement'

interface UseTableConfigConversionOptions {
  updateNamedTable: (
    tableId: string,
    updates: Partial<NamedTableConfig>
  ) => Promise<NamedTableConfig>
}

function convertToCustomParameter(param: ParameterDefinition): CustomParameter {
  return {
    id: crypto.randomUUID(),
    name: param.name,
    type: 'fixed',
    field: param.field,
    header: param.header,
    category: param.category || 'Custom Parameters',
    removable: param.removable ?? true,
    visible: param.visible ?? true,
    color: param.color,
    description: param.description
  }
}

export function useTableConfigConversion(options: UseTableConfigConversionOptions) {
  const { updateNamedTable } = options

  const convertAndUpdateTable = async (
    id: string,
    config: Partial<TableConfig>
  ): Promise<NamedTableConfig> => {
    // Convert TableConfig to NamedTableConfig
    const namedConfig: Partial<NamedTableConfig> = {
      ...config,
      id,
      name: config.name,
      parentColumns: config.parentColumns,
      childColumns: config.childColumns,
      categoryFilters: config.categoryFilters || {
        selectedParentCategories: [],
        selectedChildCategories: []
      },
      customParameters: config.customParameters?.map(convertToCustomParameter) || []
    }
    return await updateNamedTable(id, namedConfig)
  }

  return {
    convertAndUpdateTable
  }
}
