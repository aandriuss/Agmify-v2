import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/types'
import type { BIMNodeRaw } from '~/components/viewer/schedules/types'

// Base configuration for columns
export interface ColumnConfig {
  field: string
  header: string
  width?: number
  visible: boolean
  removable?: boolean
  order: number
}

// Base parameter interface
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

// Custom parameter interface extending base parameter
export interface CustomParameter extends BaseParameter {
  id: string
  name: string
  type: 'fixed' | 'equation'
  value?: string
  equation?: string
  group: string // Group name for organization (default: 'Custom')
  category?: string // Usually 'Custom Parameters'
  raw?: BIMNodeRaw // Raw BIM data for parameter
}

// Table configuration
export interface NamedTableConfig {
  id: string
  name: string
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
  categoryFilters: {
    selectedParentCategories: string[]
    selectedChildCategories: string[]
  }
  selectedParameterIds: string[]
  lastUpdateTimestamp?: number
}

// User settings interface
export interface UserSettings {
  controlsWidth?: number
  namedTables: Record<string, NamedTableConfig>
  customParameters: Record<string, CustomParameter>
}

// Parameter group interface
export interface ParameterGroup {
  id: string
  name: string
  isCustom?: boolean
}

// Type for new parameter creation
export type NewCustomParameter = Omit<CustomParameter, 'id'>

// Type guards
export function isUserSettings(value: unknown): value is UserSettings {
  if (!value || typeof value !== 'object') return false
  const settings = value as Record<string, unknown>
  if (typeof settings.namedTables !== 'object' || !settings.namedTables) return false
  if (settings.customParameters && typeof settings.customParameters !== 'object')
    return false
  return true
}

export function isCustomParameter(value: unknown): value is CustomParameter {
  if (!value || typeof value !== 'object') return false
  const param = value as Record<string, unknown>
  return (
    typeof param.id === 'string' &&
    typeof param.name === 'string' &&
    (param.type === 'fixed' || param.type === 'equation') &&
    typeof param.field === 'string' &&
    typeof param.header === 'string'
  )
}

// Form data interface for parameter editing
export interface ParameterFormData {
  id?: string
  name: string
  type: 'fixed' | 'equation'
  value?: string
  equation?: string
  group: string
  errors: {
    name?: string
    value?: string
    equation?: string
    general?: string
  }
}
