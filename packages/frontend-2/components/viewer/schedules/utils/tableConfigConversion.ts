import type {
  TableConfig,
  NamedTableConfig,
  CustomParameter,
  ParameterDefinition
} from '~/composables/core/types'

function convertToCustomParameter(param: ParameterDefinition): CustomParameter {
  return {
    id: param.field,
    name: param.name || param.field,
    type: 'fixed',
    field: param.field,
    header: param.header || param.name || param.field,
    category: param.category || 'Custom Parameters',
    color: param.color,
    description: param.description,
    removable: param.removable ?? true,
    visible: param.visible ?? true,
    order: 0 // Default order for converted parameters
  }
}

function convertToParameterDefinition(param: CustomParameter): ParameterDefinition {
  const { order: _order, ...rest } = param // Exclude order from ParameterDefinition
  return {
    field: rest.field,
    name: rest.name,
    type: rest.type,
    header: rest.header,
    category: rest.category,
    color: rest.color,
    description: rest.description,
    removable: rest.removable,
    visible: rest.visible
  }
}

export function toNamedTableConfig(
  config: Partial<TableConfig>,
  id: string
): NamedTableConfig {
  return {
    id,
    name: config.name || '',
    parentColumns: config.parentColumns || [],
    childColumns: config.childColumns || [],
    categoryFilters: {
      selectedParentCategories: config.categoryFilters?.selectedParentCategories || [],
      selectedChildCategories: config.categoryFilters?.selectedChildCategories || []
    },
    customParameters: (config.customParameters || []).map(convertToCustomParameter),
    lastUpdateTimestamp: Date.now()
  }
}

export function toTableConfig(namedConfig: NamedTableConfig): TableConfig {
  return {
    name: namedConfig.name,
    parentColumns: namedConfig.parentColumns,
    childColumns: namedConfig.childColumns,
    categoryFilters: {
      selectedParentCategories: namedConfig.categoryFilters.selectedParentCategories,
      selectedChildCategories: namedConfig.categoryFilters.selectedChildCategories
    },
    customParameters: (namedConfig.customParameters || []).map(
      convertToParameterDefinition
    )
  }
}
