/**
 * User settings interface - now only contains controlWidth
 * Other settings have been moved to their respective modules
 */
export interface UserSettings {
  controlWidth?: number
}

/**
 * Settings state interface for the composable
 */
export interface SettingsState {
  controlWidth?: number
  loading: boolean
  error: Error | null
}

/**
 * Settings update payload interface
 */
export interface SettingsUpdatePayload {
  controlWidth?: number
}
