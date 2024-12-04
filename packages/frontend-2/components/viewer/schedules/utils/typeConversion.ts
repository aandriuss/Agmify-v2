import type {
  NamedTableConfig,
  TableConfig,
  ElementData,
  TableRow,
  ParameterValue,
  ParameterValueState,
  Parameters
} from '~/composables/core/types'

/**
 * Convert ParameterValue to ParameterValueState
 */
function toParameterValueState(value: ParameterValue): ParameterValueState {
  return {
    fetchedValue: value,
    currentValue: value,
    previousValue: value,
    userValue: null
  }
}

/**
 * Convert ElementData to TableRow
 */
export function toTableRow(element: ElementData): TableRow {
  return {
    ...element,
    parameters: Object.entries(element.parameters).reduce((acc, [key, value]) => {
      // If value is already a ParameterValueState, use it directly
      if (
        value &&
        typeof value === 'object' &&
        'fetchedValue' in value &&
        'currentValue' in value &&
        'previousValue' in value &&
        'userValue' in value
      ) {
        acc[key] = value as ParameterValueState
      } else {
        // Otherwise create a new ParameterValueState
        acc[key] = toParameterValueState(value as ParameterValue)
      }
      return acc
    }, {} as Parameters)
  }
}

/**
 * Convert array of ElementData to array of TableRow
 */
export function toTableRowArray(elements: ElementData[]): TableRow[] {
  return elements.map(toTableRow)
}

/**
 * Convert TableRow to ElementData
 */
export function toElementData(row: TableRow): ElementData {
  return {
    ...row,
    parameters: Object.entries(row.parameters).reduce((acc, [key, value]) => {
      // Keep ParameterValueState intact
      acc[key] = value
      return acc
    }, {} as Parameters)
  }
}

/**
 * Convert array of TableRow to array of ElementData
 */
export function toElementDataArray(rows: TableRow[]): ElementData[] {
  return rows.map(toElementData)
}

/**
 * Convert NamedTableConfig to TableConfig
 */
export function toTableConfig(config: NamedTableConfig | null): TableConfig | null {
  if (!config) return null

  return {
    name: config.name,
    parentColumns: config.parentColumns,
    childColumns: config.childColumns
  }
}

/**
 * Convert TableConfig to NamedTableConfig
 */
export function toNamedTableConfig(
  config: TableConfig,
  id: string,
  categoryFilters: {
    selectedParentCategories: string[]
    selectedChildCategories: string[]
  }
): NamedTableConfig {
  return {
    id,
    name: config.name,
    parentColumns: config.parentColumns,
    childColumns: config.childColumns,
    categoryFilters,
    lastUpdateTimestamp: Date.now()
  }
}

/**
 * Create an empty TableConfig
 */
export function createEmptyTableConfig(): TableConfig {
  return {
    name: '',
    parentColumns: [],
    childColumns: []
  }
}
