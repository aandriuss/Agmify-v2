import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import type { ElementData } from './elements'
import type { CustomParameter } from '~/composables/useUserSettings'

export interface TableConfig {
  id: string
  name: string
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
  categoryFilters?: {
    selectedParentCategories: string[]
    selectedChildCategories: string[]
  }
  customParameters?: CustomParameter[]
}

export interface TableRow extends Omit<ElementData, 'details'> {
  details?: TableRow[]
}

export interface TableUpdatePayload {
  tableId: string
  tableName: string
  data?: unknown
}
