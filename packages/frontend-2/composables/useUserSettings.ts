import { useSettingsState } from './settings/useSettingsState'
import { useSettingsTableOperations } from './settings/useSettingsTableOperations'

export function useUserSettings() {
  const { settings, loading, error, loadSettings, saveSettings } = useSettingsState()

  const {
    updateTable,
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
