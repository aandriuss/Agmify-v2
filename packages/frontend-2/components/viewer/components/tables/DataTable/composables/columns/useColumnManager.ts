import { ref, computed, watch } from 'vue'
import type { ColumnDef, ParameterDefinition } from '../types'

export interface UseColumnManagerOptions {
  tableId: string
  initialParentColumns: ColumnDef[]
  initialChildColumns: ColumnDef[]
  availableParentParameters: ParameterDefinition[]
  availableChildParameters: ParameterDefinition[]
}

export function useColumnManager({
  tableId,
  initialParentColumns,
  initialChildColumns,
  availableParentParameters,
  availableChildParameters
}: UseColumnManagerOptions) {
  // State
  const currentView = ref<'parent' | 'child'>('parent')
  const parentColumns = ref<ColumnDef[]>(initialParentColumns || [])
  const childColumns = ref<ColumnDef[]>(initialChildColumns || [])
  const isUpdating = ref(false)
  const lastUpdate = ref<{ timestamp: number; source: string } | null>(null)

  // Validation helper
  const validateColumns = (columns: any[]): columns is ColumnDef[] => {
    return (
      Array.isArray(columns) &&
      columns.every(
        (col) => col && typeof col === 'object' && 'field' in col && 'header' in col
      )
    )
  }

  // Computed properties with validation
  const activeColumns = computed(() => {
    const columns =
      currentView.value === 'parent' ? parentColumns.value : childColumns.value
    console.log('Active columns computed:', {
      view: currentView.value,
      count: columns.length,
      columns,
      timestamp: Date.now()
    })
    return validateColumns(columns) ? columns : []
  })

  const availableParameters = computed(() => {
    const currentParams =
      currentView.value === 'parent'
        ? availableParentParameters
        : availableChildParameters

    const currentActive = activeColumns.value

    const filtered = currentParams.filter(
      (param) => !currentActive.some((col) => col.field === param.field)
    )

    console.log('Available parameters computed:', {
      view: currentView.value,
      total: currentParams.length,
      filtered: filtered.length,
      timestamp: Date.now()
    })

    return filtered
  })

  // State update method with validation
  const updateState = (
    newColumns: ColumnDef[],
    type: 'parent' | 'child',
    source: string
  ) => {
    if (!validateColumns(newColumns)) {
      console.error('Invalid column data:', newColumns)
      return false
    }

    isUpdating.value = true
    try {
      const processed = newColumns.map((col, index) => ({
        ...col,
        order: index,
        visible: col.visible ?? true,
        removable: col.removable ?? true
      }))

      if (type === 'parent') {
        parentColumns.value = processed
      } else {
        childColumns.value = processed
      }

      lastUpdate.value = {
        timestamp: Date.now(),
        source
      }

      console.log(`State updated (${type}):`, {
        columnsCount: processed.length,
        source,
        timestamp: lastUpdate.value.timestamp
      })

      return true
    } finally {
      isUpdating.value = false
    }
  }

  // Column operations
  const handleColumnOperation = async (operation: {
    type: 'add' | 'remove' | 'reorder'
    column?: ColumnDef | ParameterDefinition
    fromIndex?: number
    toIndex?: number
  }) => {
    if (isUpdating.value) return

    const currentColumns = [...activeColumns.value]
    let updatedColumns: ColumnDef[] = []

    switch (operation.type) {
      case 'add':
        if (!operation.column) break
        updatedColumns = [
          ...currentColumns,
          {
            ...operation.column,
            visible: true,
            removable: true,
            order: currentColumns.length
          }
        ]
        break

      case 'remove':
        if (!operation.column) break
        updatedColumns = currentColumns.filter(
          (col) => col.field !== operation.column!.field
        )
        break

      case 'reorder':
        if (
          typeof operation.fromIndex !== 'number' ||
          typeof operation.toIndex !== 'number'
        )
          break
        updatedColumns = [...currentColumns]
        const [moved] = updatedColumns.splice(operation.fromIndex, 1)
        updatedColumns.splice(operation.toIndex, 0, moved)
        break
    }

    if (updatedColumns.length > 0) {
      updateState(updatedColumns, currentView.value, `operation-${operation.type}`)
    }
  }

  // Watch for external updates to initial columns
  watch(
    [() => initialParentColumns, () => initialChildColumns],
    ([newParentCols, newChildCols], _, onCleanup) => {
      if (isUpdating.value) return

      const cleanup = { cancelled: false }
      onCleanup(() => {
        cleanup.cancelled = true
      })

      if (validateColumns(newParentCols) && !cleanup.cancelled) {
        updateState(newParentCols, 'parent', 'initial-update')
      }
      if (validateColumns(newChildCols) && !cleanup.cancelled) {
        updateState(newChildCols, 'child', 'initial-update')
      }
    },
    { deep: true }
  )

  return {
    // State
    currentView,
    activeColumns,
    availableParameters,
    isUpdating,
    lastUpdate,

    // Methods
    setView: (view: 'parent' | 'child') => {
      currentView.value = view
      console.log('View changed:', {
        view,
        activeCount: activeColumns.value.length,
        availableCount: availableParameters.value.length
      })
    },
    handleColumnOperation,

    // Column state for external access
    columnState: computed(() => ({
      activeColumns: activeColumns.value,
      availableParameters: availableParameters.value
    }))
  }
}
