import { ref, computed } from 'vue'
import type { TableColumn } from '~/composables/core/types'

export interface ColumnStateChange {
  type: 'ADD' | 'REMOVE' | 'REORDER' | 'UPDATE' | 'VISIBILITY'
  timestamp: number
  view: 'parent' | 'child'
  columnDef: TableColumn
  previousState?: TableColumn
  sourceIndex?: number
  targetIndex?: number
}

export interface ColumnState {
  parentColumns: TableColumn[]
  childColumns: TableColumn[]
  activeView: 'parent' | 'child'
  pendingChanges: ColumnStateChange[]
  lastSyncTimestamp: number
}

export interface UseColumnStateManagerOptions {
  initialParentColumns: TableColumn[]
  initialChildColumns: TableColumn[]
  _tableId: string
  onStateChange?: (changes: ColumnStateChange[]) => void
}

export function useColumnStateManager({
  initialParentColumns,
  initialChildColumns,
  _tableId,
  onStateChange
}: UseColumnStateManagerOptions) {
  // Sort columns by order
  function sortColumnsByOrder<T extends { order?: number }>(columns: T[]): T[] {
    return [...columns].sort((a, b) => {
      const orderA = typeof a.order === 'number' ? a.order : 0
      const orderB = typeof b.order === 'number' ? b.order : 0
      return orderA - orderB
    })
  }

  // Core state - initialize with sorted columns
  const state = ref<ColumnState>({
    parentColumns: sortColumnsByOrder([...(initialParentColumns || [])]).map(
      (col, index) => ({
        ...col,
        order: typeof col.order === 'number' ? col.order : index,
        visible: col.visible ?? true,
        removable: col.removable ?? true
      })
    ),
    childColumns: sortColumnsByOrder([...(initialChildColumns || [])]).map(
      (col, index) => ({
        ...col,
        order: typeof col.order === 'number' ? col.order : index,
        visible: col.visible ?? true,
        removable: col.removable ?? true
      })
    ),
    activeView: 'parent',
    pendingChanges: [],
    lastSyncTimestamp: Date.now()
  })

  // Validation helper
  const validateColumns = (columns: unknown[]): columns is TableColumn[] => {
    return (
      Array.isArray(columns) &&
      columns.every(
        (col) =>
          col &&
          typeof col === 'object' &&
          'field' in col &&
          'header' in col &&
          typeof col.field === 'string' &&
          typeof col.header === 'string'
      )
    )
  }

  // Track changes
  const trackChange = (change: ColumnStateChange) => {
    state.value.pendingChanges.push(change)
    state.value.lastSyncTimestamp = change.timestamp
    onStateChange?.(state.value.pendingChanges)
  }

  // Update columns with change tracking
  const updateColumns = (
    newColumns: TableColumn[],
    view: 'parent' | 'child'
  ): boolean => {
    if (!validateColumns(newColumns)) {
      return false
    }

    const changes = trackChanges(newColumns, view)

    // Update state with explicit order preservation
    const updatedColumns = sortColumnsByOrder(
      newColumns.map((col, index) => ({
        ...col,
        order: typeof col.order === 'number' ? col.order : index,
        visible: col.visible ?? true,
        removable: col.removable ?? true
      }))
    )

    // Update state
    if (view === 'parent') {
      state.value.parentColumns = updatedColumns
    } else {
      state.value.childColumns = updatedColumns
    }

    // Notify state change
    if (changes.length > 0) {
      onStateChange?.(changes)
    }

    return true
  }

  const trackChanges = (
    newColumns: TableColumn[],
    view: 'parent' | 'child'
  ): ColumnStateChange[] => {
    const currentColumns =
      view === 'parent' ? state.value.parentColumns : state.value.childColumns
    const changes: ColumnStateChange[] = []
    const timestamp = Date.now()

    // Track removals
    currentColumns.forEach((oldCol) => {
      if (!newColumns.find((newCol) => newCol.field === oldCol.field)) {
        changes.push({
          type: 'REMOVE',
          timestamp,
          view,
          columnDef: oldCol,
          previousState: oldCol
        })
      }
    })

    // Track additions and updates
    newColumns.forEach((newCol) => {
      const oldCol = currentColumns.find((col) => col.field === newCol.field)
      if (!oldCol) {
        changes.push({
          type: 'ADD',
          timestamp,
          view,
          columnDef: newCol
        })
      } else if (
        oldCol.visible !== newCol.visible ||
        oldCol.order !== newCol.order ||
        oldCol.width !== newCol.width
      ) {
        changes.push({
          type: 'UPDATE',
          timestamp,
          view,
          columnDef: newCol,
          previousState: oldCol
        })
      }
    })

    return changes
  }

  // Handle reordering with explicit order preservation
  const handleReorder = (
    fromIndex: number,
    toIndex: number,
    view: 'parent' | 'child'
  ): boolean => {
    const columns =
      view === 'parent' ? [...state.value.parentColumns] : [...state.value.childColumns]

    // Get the moved column
    const [moved] = columns.splice(fromIndex, 1)
    columns.splice(toIndex, 0, moved)

    // Update order properties explicitly
    const reordered = columns.map((col, index) => ({
      ...col,
      order: index,
      field: col.field,
      header: col.header,
      type: col.type || 'string',
      visible: col.visible ?? true,
      removable: col.removable ?? true,
      width: col.width,
      category: col.category,
      description: col.description,
      isFixed: col.isFixed
    }))

    trackChange({
      type: 'REORDER',
      timestamp: Date.now(),
      view,
      columnDef: moved,
      sourceIndex: fromIndex,
      targetIndex: toIndex
    })

    return updateColumns(reordered, view)
  }

  // Handle visibility changes
  const updateVisibility = (
    column: TableColumn,
    visible: boolean,
    view: 'parent' | 'child'
  ): boolean => {
    const columns =
      view === 'parent' ? [...state.value.parentColumns] : [...state.value.childColumns]

    const updated = columns.map((col) =>
      col.field === column.field ? { ...col, visible } : col
    )

    trackChange({
      type: 'VISIBILITY',
      timestamp: Date.now(),
      view,
      columnDef: { ...column, visible },
      previousState: column
    })

    return updateColumns(updated, view)
  }

  // Clear pending changes
  const clearPendingChanges = () => {
    state.value.pendingChanges = []
  }

  // Active columns computed property
  const activeColumns = computed(() => {
    const columns =
      state.value.activeView === 'parent'
        ? state.value.parentColumns
        : state.value.childColumns

    // Return columns sorted by order
    return sortColumnsByOrder(columns)
  })

  return {
    // State
    state,
    activeColumns,

    // Methods
    updateColumns,
    handleReorder,
    updateVisibility,
    clearPendingChanges,

    // View management
    setView: (view: 'parent' | 'child') => {
      state.value.activeView = view
    }
  }
}
