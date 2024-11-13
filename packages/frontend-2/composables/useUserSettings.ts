import { useSettingsState } from './settings/useSettingsState'
import { useSettingsTableOperations } from './settings/useSettingsTableOperations'
import type { NamedTableConfig } from './settings/types/scheduleTypes'

export type {
  ColumnConfig,
  BaseParameter,
  CustomParameter,
  NamedTableConfig,
  UserSettings
} from './settings/types/scheduleTypes'

export function useUserSettings() {
  const { settings, loading, error, loadSettings, saveSettings } = useSettingsState()

  const {
    updateTable,
    createTable,
    updateTableCategories,
    updateTableColumns,
    updateNamedTable,
    createNamedTable
  } = useSettingsTableOperations({
    settings,
    saveSettings
  })

  return {
    settings,
    loading,
    error,
    loadSettings,
    saveSettings,
    updateTable,
    updateTableCategories,
    updateTableColumns,
    updateNamedTable,
    createNamedTable,
    cleanup: () => {
      // No cleanup needed for now
    }
  }
}
