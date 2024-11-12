import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import type { CustomParameter } from '~/composables/useUserSettings'

export interface NamedTableConfig {
  id: string
  name: string
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
  categoryFilters: {
    selectedParentCategories: string[]
    selectedChildCategories: string[]
  }
  customParameters?: CustomParameter[]
  lastUpdateTimestamp?: number
}

export interface UserSettings {
  controlsWidth?: number
  namedTables: Record<string, NamedTableConfig>
}

export interface ParsedSettings {
  namedTables?: Record<string, NamedTableConfig>
  controlsWidth?: number
}
