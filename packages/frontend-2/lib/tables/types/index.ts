import type {
  ColumnDef,
  ParameterDefinition
} from '../../../components/viewer/components/tables/DataTable/composables/columns/types'

export interface TableTypeSettings {
  type: 'viewer' | 'schedule' | 'custom'
  availableColumns: ParameterDefinition[]
  defaultColumns: ColumnDef[]
  categoryFilters?: {
    selectedParentCategories: string[]
    selectedChildCategories: string[]
  }
}

export interface TableInstanceState {
  id: string
  type: string
  name: string
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
  categoryFilters: {
    selectedParentCategories: string[]
    selectedChildCategories: string[]
  }
  version: number
  lastUpdated: number
}

export interface TableRegistry {
  tables: Map<string, TableInstanceState>
  typeSettings: Map<string, TableTypeSettings>
}

export interface TableUpdateOperation {
  type:
    | 'ADD_COLUMN'
    | 'REMOVE_COLUMN'
    | 'REORDER_COLUMN'
    | 'UPDATE_VISIBILITY'
    | 'UPDATE_FILTERS'
  tableId: string
  targetView: 'parent' | 'child'
  payload: any
  timestamp: number
}
