import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/types'

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
  source?: string // Parameter group (e.g., 'Identity Data', 'Constraints')
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
