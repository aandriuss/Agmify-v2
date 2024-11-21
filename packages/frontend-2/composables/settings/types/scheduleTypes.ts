import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/types'
import type { BIMNodeRaw } from '~/components/viewer/schedules/types'

export interface ColumnConfig {
  field: string
  header: string
  width?: number
  visible: boolean
  removable?: boolean
  order: number
}

export interface BaseParameter {
  field: string
  header: string
  category?: string
  source?: string // Legacy parameter group (for backward compatibility)
  fetchedGroup?: string // Group from raw data
  currentGroup?: string // Current group (initially same as fetchedGroup)
  isFetched?: boolean // Whether parameter was fetched from raw data or is custom
  color?: string
  description?: string
  removable?: boolean
  visible?: boolean
  order?: number
}

export interface CustomParameter extends BaseParameter {
  id: string
  name: string
  type: 'fixed' | 'equation'
  value?: string
  equation?: string
  raw?: BIMNodeRaw // Raw BIM data for parameter
}

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

// Type guard for settings
export function isUserSettings(value: unknown): value is UserSettings {
  if (!value || typeof value !== 'object') return false
  const settings = value as Record<string, unknown>
  if (typeof settings.namedTables !== 'object' || !settings.namedTables) return false
  return true
}
