// composables/useUserSettings.ts
import { ref, watch } from 'vue'

export interface TableConfig {
  columns: Array<{
    field: string
    header: string
    visible: boolean
    removable: boolean
  }>
}

export function useUserSettings(tableId: string) {
  const tableConfig = ref<TableConfig['columns']>([])

  // Load from localStorage
  const loadSettings = () => {
    const saved = localStorage.getItem(`table-config-${tableId}`)
    if (saved) {
      tableConfig.value = JSON.parse(saved)
    }
  }

  // Save to localStorage
  const saveSettings = (columns: TableConfig['columns']) => {
    tableConfig.value = columns
    localStorage.setItem(`table-config-${tableId}`, JSON.stringify(columns))
  }

  // Load initial settings
  loadSettings()

  return {
    tableConfig,
    saveSettings
  }
}
