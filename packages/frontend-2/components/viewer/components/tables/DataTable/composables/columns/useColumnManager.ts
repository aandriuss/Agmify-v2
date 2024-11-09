import { ref, computed, onMounted } from 'vue'
import type { ColumnDef, ParameterDefinition } from '../types'
import { useColumnStateManager } from './useColumnStateManager'
import { useUserSettings } from '~/composables/useUserSettings'

export interface UseColumnManagerOptions {
  tableId: string
  initialParentColumns: ColumnDef[]
  initialChildColumns: ColumnDef[]
  availableParentParameters: ParameterDefinition[]
  availableChildParameters: ParameterDefinition[]
}

export interface ColumnOperation {
  type: 'add' | 'remove' | 'reorder' | 'visibility'
  column?: ColumnDef | ParameterDefinition
  fromIndex?: number
  toIndex?: number
  visible?: boolean
}

export interface ColumnStateResult {
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
  tableName: string
  tableId: string
}

export function useColumnManager({
  tableId,
  initialParentColumns,
  initialChildColumns,
  availableParentParameters,
  availableChildParameters
}: UseColumnManagerOptions) {
  const { settings, saveSettings, loadSettings } = useUserSettings()

  // State
  const isUpdating = ref(false)
  const lastUpdate = ref<{ timestamp: number; source: string } | null>(null)
  const initialized = ref(false)

  // Sort columns by order
  function sortColumnsByOrder<T extends { order?: number }>(columns: T[]): T[] {
    return [...columns].sort((a, b) => {
      const orderA = typeof a.order === 'number' ? a.order : 0
      const orderB = typeof b.order === 'number' ? b.order : 0
      return orderA - orderB
    })
  }

  // Initialize state manager with sorted columns
  const sortedParentColumns = sortColumnsByOrder(initialParentColumns)
  const sortedChildColumns = sortColumnsByOrder(initialChildColumns)

  const columnStateManager = useColumnStateManager({
    initialParentColumns: sortedParentColumns,
    initialChildColumns: sortedChildColumns,
    _tableId: tableId,
    onStateChange: (_changes: unknown) => {
      // Don't auto-sync on every change, let the user control when to save
      return
    }
  })

  // Computed properties for available parameters
  const availableParameters = computed(() => {
    const params =
      columnStateManager.state.value.activeView === 'parent'
        ? availableParentParameters
        : availableChildParameters

    const currentActive = columnStateManager.activeColumns.value

    return params.filter(
      (param: ParameterDefinition) =>
        !currentActive.some((col: ColumnDef) => col.field === param.field)
    )
  })

  // Column operations
  const handleColumnOperation = (operation: ColumnOperation): boolean => {
    if (isUpdating.value) return false

    const view = columnStateManager.state.value.activeView

    const createNewColumn = (column: ParameterDefinition): ColumnDef => ({
      ...column,
      visible: true,
      removable: true,
      order: columnStateManager.activeColumns.value.length
    })

    try {
      switch (operation.type) {
        case 'add':
          if (!operation.column) break
          columnStateManager.updateColumns(
            [
              ...columnStateManager.activeColumns.value,
              createNewColumn(operation.column as ParameterDefinition)
            ],
            view
          )
          break

        case 'remove':
          if (!operation.column) break
          columnStateManager.updateColumns(
            columnStateManager.activeColumns.value.filter(
              (col: ColumnDef) => col.field !== operation.column!.field
            ),
            view
          )
          break

        case 'reorder':
          if (
            typeof operation.fromIndex !== 'number' ||
            typeof operation.toIndex !== 'number'
          )
            break
          columnStateManager.handleReorder(operation.fromIndex, operation.toIndex, view)
          break

        case 'visibility':
          if (!operation.column || typeof operation.visible !== 'boolean') break
          columnStateManager.updateVisibility(
            operation.column as ColumnDef,
            operation.visible,
            view
          )
          break
      }
      return true
    } catch {
      return false
    }
  }

  const saveChanges = async (): Promise<ColumnStateResult | null> => {
    if (!initialized.value) {
      try {
        await loadSettings()
        initialized.value = true
      } catch (err) {
        throw new Error('Failed to load settings')
      }
    }

    try {
      isUpdating.value = true

      const currentSettings = settings.value || { namedTables: {} }
      const existingTable = currentSettings.namedTables[tableId]

      if (!existingTable) {
        throw new Error('Table not found')
      }

      // Get current columns and ensure they're sorted by order
      const currentParentColumns = sortColumnsByOrder(
        columnStateManager.state.value.parentColumns
      )
      const currentChildColumns = sortColumnsByOrder(
        columnStateManager.state.value.childColumns
      )

      // Prepare updated columns with proper order and defaults
      const updatedParentColumns = currentParentColumns.map((col, index) => ({
        ...col,
        order: index,
        visible: col.visible ?? true,
        removable: col.removable ?? true,
        field: col.field,
        header: col.header,
        category: col.category,
        type: col.type || 'string'
      }))

      const updatedChildColumns = currentChildColumns.map((col, index) => ({
        ...col,
        order: index,
        visible: col.visible ?? true,
        removable: col.removable ?? true,
        field: col.field,
        header: col.header,
        category: col.category,
        type: col.type || 'string'
      }))

      // Create updated settings preserving all existing data
      const updatedSettings = {
        ...currentSettings,
        namedTables: {
          ...currentSettings.namedTables,
          [tableId]: {
            ...existingTable,
            id: tableId,
            name: existingTable.name,
            parentColumns: updatedParentColumns,
            childColumns: updatedChildColumns,
            categoryFilters: existingTable.categoryFilters || {
              selectedParentCategories: [],
              selectedChildCategories: []
            },
            lastUpdateTimestamp: Date.now()
          }
        }
      }

      // Save changes
      const success = await saveSettings(updatedSettings)
      if (!success) {
        throw new Error('Failed to save settings')
      }

      // Update last update timestamp
      lastUpdate.value = {
        timestamp: Date.now(),
        source: 'saveChanges'
      }

      // Clear pending changes after successful save
      columnStateManager.clearPendingChanges()

      return {
        parentColumns: updatedParentColumns,
        childColumns: updatedChildColumns,
        tableName: existingTable.name,
        tableId
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Failed to save changes')
    } finally {
      isUpdating.value = false
    }
  }

  // Initialize settings on mount
  onMounted(async () => {
    if (!initialized.value) {
      try {
        await loadSettings()
        initialized.value = true
      } catch (err) {
        throw new Error('Failed to load settings')
      }
    }
  })

  return {
    // State
    currentView: computed(() => columnStateManager.state.value.activeView),
    activeColumns: columnStateManager.activeColumns,
    availableParameters,
    isUpdating,
    lastUpdate,

    // Methods
    setView: columnStateManager.setView,
    handleColumnOperation,
    saveChanges,

    // Column state for external access
    columnState: computed(() => ({
      parentColumns: columnStateManager.state.value.parentColumns,
      childColumns: columnStateManager.state.value.childColumns,
      activeColumns: columnStateManager.activeColumns.value,
      availableParameters: availableParameters.value,
      pendingChanges: columnStateManager.state.value.pendingChanges
    }))
  }
}
