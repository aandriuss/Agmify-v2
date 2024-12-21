/**
 * Settings Types and Utilities
 *
 * This module defines the core settings types and utilities for managing application state.
 * Settings include:
 * - UI preferences (control width, etc.)
 * - Named table configurations
 * - Selected parameters (both BIM and user parameters)
 *
 * Note: customParameters has been replaced with selectedParameters in table configs
 * to better align with the parameter system architecture.
 */

import type { TableSettings } from '../tables'

/**
 * Base settings interface with required fields
 */
interface BaseSettings {
  controlWidth: number
  namedTables: Record<string, TableSettings>
  // No global parameters - they are now part of table configs
}

/**
 * User settings interface - all fields optional for API
 */
export interface UserSettings {
  controlWidth?: number
  namedTables?: Record<string, TableSettings>
  // No global parameters - they are now part of table configs
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
  namedTables?: Record<string, TableSettings>
  // No global parameters - they are now part of table configs
}

/**
 * Default settings values
 */
export const DEFAULT_SETTINGS: BaseSettings = {
  controlWidth: 300,
  namedTables: {}
  // No global parameters - they are now part of table configs
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

  return true
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

  return true
}

/**
 * Helper to ensure settings have required fields with defaults
 */
export function ensureRequiredSettings(settings: UserSettings): BaseSettings {
  return {
    controlWidth: settings.controlWidth ?? DEFAULT_SETTINGS.controlWidth,
    namedTables: settings.namedTables ?? DEFAULT_SETTINGS.namedTables
    // No global parameters - they are now part of table configs
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
