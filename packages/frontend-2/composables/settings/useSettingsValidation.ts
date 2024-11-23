import { debug, DebugCategories } from '~/components/viewer/schedules/debug/useDebug'
import type { ParsedSettings, UserSettings } from './types'

function isJsonString(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    JSON.parse(value)
    return true
  } catch {
    return false
  }
}

function isValidParsedSettings(value: unknown): value is ParsedSettings {
  if (!value || typeof value !== 'object') return false

  const settings = value as Record<string, unknown>

  // Validate controlsWidth if present
  if (
    settings.controlsWidth !== undefined &&
    typeof settings.controlsWidth !== 'number'
  ) {
    return false
  }

  // Validate namedTables if present
  if (settings.namedTables !== undefined) {
    if (typeof settings.namedTables !== 'object' || settings.namedTables === null) {
      return false
    }

    // Validate each table in namedTables
    const tables = settings.namedTables as Record<string, unknown>
    for (const [_, table] of Object.entries(tables)) {
      if (!isValidTableConfig(table)) {
        return false
      }
    }
  }

  return true
}

function isValidTableConfig(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false

  const table = value as Record<string, unknown>

  // Required fields
  if (
    typeof table.id !== 'string' ||
    typeof table.name !== 'string' ||
    !Array.isArray(table.parentColumns) ||
    !Array.isArray(table.childColumns)
  ) {
    return false
  }

  // Validate categoryFilters
  if (
    !table.categoryFilters ||
    typeof table.categoryFilters !== 'object' ||
    !Array.isArray(
      (table.categoryFilters as Record<string, unknown>).selectedParentCategories
    ) ||
    !Array.isArray(
      (table.categoryFilters as Record<string, unknown>).selectedChildCategories
    )
  ) {
    return false
  }

  // Optional fields
  if (table.customParameters !== undefined && !Array.isArray(table.customParameters)) {
    return false
  }

  if (
    table.lastUpdateTimestamp !== undefined &&
    typeof table.lastUpdateTimestamp !== 'number'
  ) {
    return false
  }

  return true
}

export function parseSettings(rawSettings: unknown): ParsedSettings {
  let parsed: unknown

  if (isJsonString(rawSettings)) {
    parsed = JSON.parse(rawSettings)
  } else {
    parsed = rawSettings
  }

  if (!isValidParsedSettings(parsed)) {
    throw new Error('Invalid settings format')
  }

  return parsed
}

export function validateAndNormalizeSettings(
  parsedSettings: ParsedSettings
): UserSettings {
  try {
    // Create validated settings with required fields
    const validatedSettings: UserSettings = {
      namedTables: {},
      ...parsedSettings
    }

    debug.log(DebugCategories.INITIALIZATION, 'Settings validated', {
      namedTablesCount: Object.keys(validatedSettings.namedTables).length,
      namedTables: validatedSettings.namedTables
    })

    return validatedSettings
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Failed to validate settings', err)
    throw new Error('Failed to validate settings')
  }
}
