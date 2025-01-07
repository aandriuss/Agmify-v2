import type {
  TableSettings,
  TableColumn,
  TableSort,
  TableFilter
} from '~/composables/core/types'
import type {
  // SelectedParameter,
  AvailableBimParameter,
  AvailableUserParameter
} from '~/composables/core/types/parameters/parameter-states'
import {
  isAvailableBimParameter,
  isAvailableUserParameter,
  // isSelectedParameter,
  createSelectedParameter
} from '~/composables/core/types/parameters/parameter-states'

interface TableColumnInput {
  field: string
  header: string
  width?: number
  visible: boolean
  removable?: boolean
  order: number
}

// interface TableInput {
//   name: string
//   displayName?: string
//   config: {
//     parentColumns: TableColumnInput[]
//     childColumns: TableColumnInput[]
//     selectedParameters: {
//       parent: ParameterInput[]
//       child: ParameterInput[]
//     }
//   }
//   categoryFilters?: {
//     selectedParentCategories: string[]
//     selectedChildCategories: string[]
//   }
//   sort?: TableSort
//   filters?: TableFilter[]
// }

/**
 * Input type for parameters matching SelectedParameter interface
 */
// interface ParameterInput {
//   id: string
//   name: string
//   kind: 'bim' | 'user'
//   type: string // BimValueType | UserValueType
//   value: string
//   group: string
//   visible: boolean
//   order: number
//   category?: string
//   description?: string
//   metadata?: Record<string, unknown>
// }

interface TableData {
  id: string
  name: string
  displayName: string
  config: {
    parentColumns: TableColumnInput[]
    childColumns: TableColumnInput[]
    selectedParameters: {
      parent: (AvailableBimParameter | AvailableUserParameter)[]
      child: (AvailableBimParameter | AvailableUserParameter)[]
    }
  }
  categoryFilters?: {
    selectedParentCategories: string[]
    selectedChildCategories: string[]
  }
  sort?: TableSort
  filters?: TableFilter[]
  lastUpdateTimestamp: number
}

/**
 * Type guard for GraphQL table data
 */
export function isTableData(data: unknown): data is TableData {
  if (!data || typeof data !== 'object') return false

  const candidate = data as Partial<TableData>
  if (!candidate.config || typeof candidate.config !== 'object') return false

  const config = candidate.config as Partial<TableData['config']>

  return !!(
    candidate &&
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.displayName === 'string' &&
    Array.isArray(config.parentColumns) &&
    Array.isArray(config.childColumns) &&
    config.selectedParameters &&
    typeof config.selectedParameters === 'object' &&
    Array.isArray(config.selectedParameters.parent) &&
    Array.isArray(config.selectedParameters.child) &&
    (!candidate.categoryFilters ||
      (typeof candidate.categoryFilters === 'object' &&
        Array.isArray(candidate.categoryFilters.selectedParentCategories) &&
        Array.isArray(candidate.categoryFilters.selectedChildCategories))) &&
    (!candidate.sort ||
      (typeof candidate.sort === 'object' &&
        (!candidate.sort.field || typeof candidate.sort.field === 'string') &&
        (!candidate.sort.order || ['ASC', 'DESC'].includes(candidate.sort.order)))) &&
    (!candidate.filters || Array.isArray(candidate.filters))
  )
}

// /**
//  * Validate and normalize BIM value type
//  */
// function normalizeBimValueType(type: string): BimValueType {
//   return ['string', 'number', 'boolean', 'date', 'object', 'array'].includes(type)
//     ? (type as BimValueType)
//     : 'string'
// }

/**
 * Transform GraphQL table data to TableSettings
 */
export function transformTableData(tableData: TableData): TableSettings {
  // Filter and validate parameters with type narrowing
  const parentParams = tableData.config.selectedParameters.parent.filter(
    (param): param is AvailableBimParameter | AvailableUserParameter =>
      isAvailableBimParameter(param) || isAvailableUserParameter(param)
  )
  const childParams = tableData.config.selectedParameters.child.filter(
    (param): param is AvailableBimParameter | AvailableUserParameter =>
      isAvailableBimParameter(param) || isAvailableUserParameter(param)
  )
  return {
    id: tableData.id,
    name: tableData.name,
    displayName: tableData.displayName,
    parentColumns: tableData.config.parentColumns.map(
      (col): TableColumn => ({
        id: col.field,
        field: col.field,
        header: col.header,
        width: col.width,
        visible: col.visible,
        removable: col.removable,
        order: col.order,
        parameter: createSelectedParameter(
          {
            kind: 'bim',
            id: col.field,
            name: col.header,
            type: 'string',
            value: null,
            fetchedGroup: 'Parameters',
            currentGroup: 'Parameters',
            visible: col.visible,
            isSystem: true,
            metadata: {}
          } as AvailableBimParameter,
          col.order,
          col.visible
        )
      })
    ),
    childColumns: tableData.config.childColumns.map(
      (col): TableColumn => ({
        id: col.field,
        field: col.field,
        header: col.header,
        width: col.width,
        visible: col.visible,
        removable: col.removable,
        order: col.order,
        parameter: createSelectedParameter(
          {
            kind: 'bim',
            id: col.field,
            name: col.header,
            type: 'string',
            value: null,
            fetchedGroup: 'Parameters',
            currentGroup: 'Parameters',
            visible: col.visible,
            isSystem: true,
            metadata: {}
          } as AvailableBimParameter,
          col.order,
          col.visible
        )
      })
    ),
    categoryFilters: tableData.categoryFilters || {
      selectedParentCategories: [],
      selectedChildCategories: []
    },
    selectedParameters: {
      parent: parentParams.map((param, index) => createSelectedParameter(param, index)),
      child: childParams.map((param, index) => createSelectedParameter(param, index))
    },
    sort: tableData.sort,
    filters: tableData.filters || [],
    lastUpdateTimestamp: tableData.lastUpdateTimestamp
  }
}

/**
 * Transform TableSettings to GraphQL input
 * @throws Error if any parameter is missing an id
 */

// is it still NEEDED OR NOT?
// export function transformTableToInput(table: TableSettings): TableInput {
//   // Validate parameters and ensure they have proper types
//   const validateParams = (params: SelectedParameter[]): SelectedParameter[] => {
//     // First validate using type guard
//     const validParams = params.filter((param): param is SelectedParameter => {
//       if (!isSelectedParameter(param)) return false

//       // Additional validation for required fields
//       if (!param.id || !param.name || !param.kind || !param.type) {
//         throw new Error(`Missing required fields in parameter`)
//       }
//       if (param.kind !== 'bim' && param.kind !== 'user') {
//         throw new Error(`Invalid parameter kind: ${param.kind}`)
//       }
//       return true
//     })

//     if (validParams.length !== params.length) {
//       throw new Error('Invalid parameters detected')
//     }

//     return validParams
//   }

//   const validParentParams = validateParams(table.selectedParameters.parent)
//   const validChildParams = validateParams(table.selectedParameters.child)

//   return {
//     name: table.name,
//     displayName: table.displayName,
//     config: {
//       parentColumns: table.parentColumns.map((col) => ({
//         field: col.field,
//         header: col.header,
//         width: col.width,
//         visible: col.visible,
//         removable: col.removable,
//         order: col.order
//       })),
//       childColumns: table.childColumns.map((col) => ({
//         field: col.field,
//         header: col.header,
//         width: col.width,
//         visible: col.visible,
//         removable: col.removable,
//         order: col.order
//       })),
//       selectedParameters: {
//         parent: validParentParams.map((param) => ({
//           id: param.id,
//           kind: param.kind,
//           name: param.name,
//           type: param.type,
//           value:
//             typeof param.value === 'string' ? param.value : JSON.stringify(param.value),
//           group: param.group,
//           visible: param.visible,
//           order: param.order,
//           category: param.category,
//           description: param.description,
//           metadata: param.metadata,
//           // Required fields from schema
//           field: param.id, // Use ID as field since it contains the full path
//           header: param.name, // Use name as header
//           removable: !param.metadata?.isSystem, // Not removable if system parameter
//           // BIM-specific required fields
//           ...(param.kind === 'bim' && {
//             fetchedGroup: param.group, // Use group as fetchedGroup for BIM parameters
//             currentGroup: param.group, // Use same group for currentGroup initially
//             sourceValue: param.value ? JSON.stringify(param.value) : 'null'
//           })
//         })),
//         child: validChildParams.map((param) => ({
//           id: param.id,
//           kind: param.kind,
//           name: param.name,
//           type: param.type,
//           value:
//             typeof param.value === 'string' ? param.value : JSON.stringify(param.value),
//           group: param.group,
//           visible: param.visible,
//           order: param.order,
//           category: param.category,
//           description: param.description,
//           metadata: param.metadata,
//           // Required fields from schema
//           field: param.id, // Use ID as field since it contains the full path
//           header: param.name, // Use name as header
//           removable: !param.metadata?.isSystem, // Not removable if system parameter
//           // BIM-specific required fields
//           ...(param.kind === 'bim' && {
//             fetchedGroup: param.group, // Use group as fetchedGroup for BIM parameters
//             currentGroup: param.group, // Use same group for currentGroup initially
//             sourceValue: param.value ? JSON.stringify(param.value) : 'null'
//           })
//         }))
//       }
//     },
//     categoryFilters: table.categoryFilters,
//     sort: table.sort,
//     filters: table.filters
//   }
// }

/**
 * Format table key for storage
 */
export function formatTableKey(table: TableSettings): string {
  const sanitizedName = table.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
  return `${sanitizedName}_${table.id}`
}

/**
 * Deep clone an object
 */
export function deepClone<T extends Record<string, unknown>>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T
}
