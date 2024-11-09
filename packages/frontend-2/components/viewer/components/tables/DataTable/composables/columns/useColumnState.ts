import { ref, computed, watch } from 'vue'
import type {
  ColumnDef,
  ParameterDefinition
} from '~/components/viewer/components/tables/DataTable/composables/types'
import { useUserSettings } from '~/composables/useUserSettings'

export interface UseColumnStateOptions {
  tableId: string
  initialParentColumns: ColumnDef[]
  initialChildColumns: ColumnDef[]
  availableParentParameters: ParameterDefinition[]
  availableChildParameters: ParameterDefinition[]
}

export interface DragItem {
  item: ColumnDef | ParameterDefinition
  sourceList: 'active' | 'available'
}

interface PendingOperation {
  id: string
  type:
    | 'ADD_COLUMN'
    | 'REMOVE_COLUMN'
    | 'REORDER'
    | 'UPDATE_VISIBILITY'
    | 'UPDATE_FILTERS'
  targetView: 'parent' | 'child'
  data: Record<string, unknown>
  timestamp: number
}

export function useColumnState({
  tableId,
  initialParentColumns,
  initialChildColumns,
  availableParentParameters,
  availableChildParameters
}: UseColumnStateOptions) {
  const validateColumns = (cols: ColumnDef[]): boolean =>
    Array.isArray(cols) && cols.length > 0

  // User settings
  const { settings, updateNamedTable } = useUserSettings()

  // View state
  const currentView = ref<'parent' | 'child'>('parent')

  // Column state
  const parentColumns = ref<ColumnDef[]>(
    validateColumns(initialParentColumns) ? initialParentColumns : []
  )
  const childColumns = ref<ColumnDef[]>(
    validateColumns(initialChildColumns) ? initialChildColumns : []
  )

  // Loading state
  const settingsLoading = ref(false)
  const isUpdating = ref(false)
  const initialized = ref(false)
  const isDirty = ref(false)

  const pendingOperations = ref<PendingOperation[]>([])

  const draggedItem = ref<{
    item: ColumnDef | ParameterDefinition
    sourceList: 'active' | 'available'
    sourceIndex: number
  } | null>(null)

  async function saveColumnState() {
    if (!initialized.value) {
      console.log('Not saving - not initialized')
      return
    }

    isUpdating.value = true
    try {
      const currentSettings = settings.value?.namedTables?.[tableId]
      if (!currentSettings) {
        console.warn('No current settings found for table:', tableId)
        return
      }

      const updatedColumns = {
        ...currentSettings,
        parentColumns: parentColumns.value.map((col: ColumnDef, index: number) => ({
          ...col,
          order: index,
          visible: col.visible ?? true,
          removable: col.removable ?? true
        })),
        childColumns: childColumns.value.map((col: ColumnDef, index: number) => ({
          ...col,
          order: index,
          visible: col.visible ?? true,
          removable: col.removable ?? true
        }))
      }

      console.log('Saving column state:', {
        parentColumnsCount: updatedColumns.parentColumns.length,
        childColumnsCount: updatedColumns.childColumns.length
      })

      await updateNamedTable(tableId, updatedColumns)
      isDirty.value = false
    } catch (error) {
      console.error('Failed to save column state:', error)
      throw error
    } finally {
      isUpdating.value = false
    }
  }

  // Computed values
  const activeColumns = computed(() => {
    return currentView.value === 'parent' ? parentColumns.value : childColumns.value
  })

  const availableParameters = computed(() => {
    const params =
      currentView.value === 'parent'
        ? availableParentParameters
        : availableChildParameters

    return params
  })

  // Watch for column changes
  watch(
    [parentColumns, childColumns],
    async (newVal, oldVal) => {
      if (
        !isUpdating.value &&
        initialized.value &&
        JSON.stringify(newVal) !== JSON.stringify(oldVal)
      ) {
        console.log('Columns changed, saving state:', {
          parentCount: parentColumns.value.length,
          childCount: childColumns.value.length
        })
        await saveColumnState()
      }
    },
    { deep: true }
  )

  return {
    // State
    currentView,
    parentColumns,
    childColumns,
    activeColumns,
    availableParameters,
    isDirty,
    pendingOperations,
    draggedItem,
    settings,
    settingsLoading,
    isUpdating,
    initialized,

    // Methods
    saveColumnState,
    setView: (view: 'parent' | 'child') => {
      currentView.value = view
    }
  }
}
