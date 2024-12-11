import type { UserParameter } from '../parameters'
import type { NamedTableConfig } from '../tables'

/**
 * Base settings interface with required fields
 */
interface BaseSettings {
  controlWidth: number
  namedTables: Record<string, NamedTableConfig>
  customParameters: UserParameter[]
}

/**
 * User settings interface - all fields optional for API
 */
export interface UserSettings {
  controlWidth?: number
  namedTables?: Record<string, NamedTableConfig>
  customParameters?: UserParameter[]
  [key: string]: unknown // Allow for extensibility
}

/**
 * Settings state interface for the composable - all fields required with defaults
 */
export interface SettingsState extends BaseSettings {
  loading: boolean
  error: Error | null
}

/**
 * Settings update payload interface - all fields optional for partial updates
 */
export interface SettingsUpdatePayload {
  controlWidth?: number
  namedTables?: Record<string, NamedTableConfig>
  customParameters?: UserParameter[]
}

/**
 * Type for new parameter creation
 */
export type NewCustomParameter = Omit<UserParameter, 'id'>

/**
 * Default settings values
 */
export const DEFAULT_SETTINGS: BaseSettings = {
  controlWidth: 300,
  namedTables: {},
  customParameters: []
}

/**
 * Type guard for UserSettings
 */
export function isUserSettings(value: unknown): value is UserSettings {
  if (!value || typeof value !== 'object') return false

  const settings = value as Record<string, unknown>

  // Check controlWidth if present
  if (
    settings.controlWidth !== undefined &&
    typeof settings.controlWidth !== 'number'
  ) {
    return false
  }

  // Check namedTables if present
  if (settings.namedTables !== undefined) {
    if (typeof settings.namedTables !== 'object' || !settings.namedTables) {
      return false
    }
  }

  // Check customParameters if present
  if (settings.customParameters !== undefined) {
    if (!Array.isArray(settings.customParameters)) {
      return false
    }
    // Verify each custom parameter
    if (!settings.customParameters.every(isCustomParameter)) {
      return false
    }
  }

  return true
}

/**
 * Type guard for CustomParameter
 */
export function isCustomParameter(value: unknown): value is UserParameter {
  if (!value || typeof value !== 'object') return false

  const param = value as Record<string, unknown>

  return (
    typeof param.id === 'string' &&
    typeof param.name === 'string' &&
    typeof param.field === 'string' &&
    typeof param.type === 'string' &&
    typeof param.visible === 'boolean' &&
    (!param.header || typeof param.header === 'string') &&
    (!param.category || typeof param.category === 'string') &&
    (!param.description || typeof param.description === 'string') &&
    (!param.source || typeof param.source === 'string') &&
    (!param.metadata || typeof param.metadata === 'object')
  )
}

/**
 * Type guard for SettingsUpdatePayload
 */
export function isSettingsUpdatePayload(
  value: unknown
): value is SettingsUpdatePayload {
  if (!value || typeof value !== 'object') return false

  const payload = value as Record<string, unknown>

  // Check each optional field
  if (payload.controlWidth !== undefined && typeof payload.controlWidth !== 'number') {
    return false
  }

  if (payload.namedTables !== undefined && typeof payload.namedTables !== 'object') {
    return false
  }

  if (
    payload.customParameters !== undefined &&
    !Array.isArray(payload.customParameters)
  ) {
    return false
  }

  return true
}

/**
 * Helper to ensure settings have required fields with defaults
 */
export function ensureRequiredSettings(settings: UserSettings): BaseSettings {
  return {
    controlWidth: settings.controlWidth ?? DEFAULT_SETTINGS.controlWidth,
    namedTables: settings.namedTables ?? DEFAULT_SETTINGS.namedTables,
    customParameters: settings.customParameters ?? DEFAULT_SETTINGS.customParameters
  }
}

/**
 * Helper to safely access settings properties
 */
export function getSettingsValue<K extends keyof BaseSettings>(
  settings: UserSettings,
  key: K
): BaseSettings[K] {
  return (settings[key] as BaseSettings[K]) ?? DEFAULT_SETTINGS[key]
}
