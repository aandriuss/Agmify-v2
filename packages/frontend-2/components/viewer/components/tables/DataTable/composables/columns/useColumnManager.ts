import { ref, computed } from 'vue'
import type { ColumnDef, ColumnGroup } from './types'
import type { UnifiedParameter } from '~/components/viewer/schedules/types'
import { debug, DebugCategories } from '~/components/viewer/schedules/debug/useDebug'

type View = 'parent' | 'child'
type ColumnOperation =
  | { type: 'add'; column: UnifiedParameter }
  | { type: 'remove'; column: ColumnDef }
  | { type: 'visibility'; column: ColumnDef; visible: boolean }
  | { type: 'reorder'; fromIndex: number; toIndex: number }

interface UseColumnManagerOptions {
  tableId: string
  initialParentColumns: ColumnDef[]
  initialChildColumns: ColumnDef[]
  availableParentParameters: UnifiedParameter[]
  availableChildParameters: UnifiedParameter[]
  searchTerm?: string
  sortBy?: 'name' | 'category' | 'type' | 'fixed' | 'group'
  selectedCategories?: string[]
  onUpdate?: (columns: ColumnDef[]) => void
}

interface ColumnState {
  pendingChanges: ColumnOperation[]
  visibility: Map<string, boolean>
}

export function useColumnManager(options: UseColumnManagerOptions) {
  const {
    tableId,
    initialParentColumns,
    initialChildColumns,
    availableParentParameters,
    availableChildParameters,
    searchTerm = '',
    sortBy = 'group',
    selectedCategories = [],
    onUpdate
  } = options

  // State
  const currentView = ref<View>('parent')
  const isUpdating = ref(false)
  const columnState = ref<ColumnState>({
    pendingChanges: [],
    visibility: new Map()
  })
  const parentColumns = ref<ColumnDef[]>(initialParentColumns)
  const childColumns = ref<ColumnDef[]>(initialChildColumns)

  // Active columns are the ones currently in use for the current view
  const activeColumns = computed(() => {
    const columns = currentView.value === 'parent' ? parentColumns : childColumns
    return columns.value.filter((col) => col.visible !== false)
  })

  // Available parameters for the current view (excluding active ones)
  const availableParameters = computed(() => {
    const active = new Set(activeColumns.value.map((col) => col.field))
    const available =
      currentView.value === 'parent'
        ? availableParentParameters
        : availableChildParameters

    return available.filter((param) => !active.has(param.field))
  })

  // Filtered and sorted columns
  const processedColumns = computed(() => {
    let result =
      currentView.value === 'parent'
        ? [...parentColumns.value]
        : [...childColumns.value]

    // Filter by search term
    if (searchTerm) {
      result = result.filter(
        (col) =>
          col.header.toLowerCase().includes(searchTerm.toLowerCase()) ||
          col.field.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by selected categories
    if (selectedCategories.length > 0) {
      result = result.filter((col) =>
        selectedCategories.includes(col.category || 'Uncategorized')
      )
    }

    // Sort columns
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.header.localeCompare(b.header)
        case 'category':
          return (a.category || 'Uncategorized').localeCompare(
            b.category || 'Uncategorized'
          )
        case 'type':
          return (a.type || 'string').localeCompare(b.type || 'string')
        case 'fixed':
          return (a.isFixed ? 0 : 1) - (b.isFixed ? 0 : 1)
        case 'group': {
          // Sort by source (group) first, then by header
          const sourceA = a.source || 'Ungrouped'
          const sourceB = b.source || 'Ungrouped'
          return sourceA === sourceB
            ? a.header.localeCompare(b.header)
            : sourceA.localeCompare(sourceB)
        }
        default:
          return 0
      }
    })

    return result
  })

  // Grouped columns
  const groupedColumns = computed(() => {
    const groups: Record<string, ColumnDef[]> = {}

    processedColumns.value.forEach((col) => {
      // Use source as group if available, otherwise use category
      const group = col.source || col.category || 'Ungrouped'
      if (!groups[group]) {
        groups[group] = []
      }
      groups[group].push(col)
    })

    // Sort groups by name, but keep essential groups at the top
    return Object.entries(groups)
      .sort(([a], [b]) => {
        // Essential groups first
        if (a === 'Basic' || a === 'essential') return -1
        if (b === 'Basic' || b === 'essential') return 1
        // Then sort alphabetically
        return a.localeCompare(b)
      })
      .map(
        ([group, columns]): ColumnGroup => ({
          category: group,
          columns: columns.sort((a, b) => a.header.localeCompare(b.header))
        })
      )
  })

  // View management
  function setView(view: View) {
    debug.log(DebugCategories.COLUMN_UPDATES, 'View changed', {
      from: currentView.value,
      to: view,
      activeColumns: activeColumns.value.length,
      availableParameters: availableParameters.value.length
    })
    currentView.value = view
  }

  // Convert parameter to column
  function createColumnFromParameter(
    param: UnifiedParameter,
    order: number
  ): ColumnDef {
    return {
      field: param.field,
      header: param.name,
      type: param.type === 'equation' ? 'number' : 'string',
      visible: param.visible ?? true,
      removable: param.removable ?? true,
      order,
      category: param.category || 'Parameters',
      source: param.source || 'Parameters',
      description: param.description,
      isFixed: false
    }
  }

  // Column operations
  function handleColumnOperation(operation: ColumnOperation): void {
    debug.startState(DebugCategories.COLUMN_UPDATES, 'Processing column operation', {
      type: operation.type,
      view: currentView.value,
      pendingChanges: columnState.value.pendingChanges.length
    })

    isUpdating.value = true
    try {
      const columns = currentView.value === 'parent' ? parentColumns : childColumns

      switch (operation.type) {
        case 'add': {
          const newColumn = createColumnFromParameter(
            operation.column,
            columns.value.length
          )
          columns.value.push(newColumn)
          columnState.value.pendingChanges.push(operation)

          debug.log(DebugCategories.COLUMN_UPDATES, 'Column added', {
            field: newColumn.field,
            source: newColumn.source,
            category: newColumn.category,
            view: currentView.value
          })
          break
        }
        case 'remove': {
          columns.value = columns.value.filter(
            (col) => col.field !== operation.column.field
          )
          columnState.value.pendingChanges.push(operation)

          debug.log(DebugCategories.COLUMN_UPDATES, 'Column removed', {
            field: operation.column.field,
            source: operation.column.source,
            category: operation.column.category,
            view: currentView.value
          })
          break
        }
        case 'visibility': {
          const column = columns.value.find(
            (col) => col.field === operation.column.field
          )
          if (column) {
            column.visible = operation.visible
            columnState.value.visibility.set(column.field, operation.visible)
            columnState.value.pendingChanges.push(operation)

            debug.log(DebugCategories.COLUMN_UPDATES, 'Column visibility changed', {
              field: column.field,
              visible: operation.visible,
              source: column.source,
              category: column.category,
              view: currentView.value
            })
          }
          break
        }
        case 'reorder': {
          const [removed] = columns.value.splice(operation.fromIndex, 1)
          columns.value.splice(operation.toIndex, 0, removed)
          columnState.value.pendingChanges.push(operation)

          debug.log(DebugCategories.COLUMN_UPDATES, 'Column reordered', {
            field: removed.field,
            fromIndex: operation.fromIndex,
            toIndex: operation.toIndex,
            source: removed.source,
            category: removed.category,
            view: currentView.value
          })
          break
        }
      }

      updateColumns()
      debug.completeState(
        DebugCategories.COLUMN_UPDATES,
        'Column operation completed',
        {
          operation,
          tableId,
          currentView: currentView.value,
          groupCounts: groupedColumns.value.reduce((acc, group) => {
            acc[group.category] = group.columns.length
            return acc
          }, {} as Record<string, number>)
        }
      )
    } catch (error) {
      debug.error(DebugCategories.ERROR, 'Column operation failed', error)
      throw error
    } finally {
      isUpdating.value = false
    }
  }

  // Update callback
  function updateColumns() {
    // Update order based on current position
    const columns = currentView.value === 'parent' ? parentColumns : childColumns
    columns.value = columns.value.map((col, index) => ({
      ...col,
      order: index
    }))

    if (onUpdate) {
      onUpdate(columns.value)
    }
  }

  // Save changes
  function saveChanges() {
    debug.startState(DebugCategories.STATE, 'Saving column changes', {
      tableId,
      pendingChanges: columnState.value.pendingChanges.length
    })

    isUpdating.value = true
    try {
      // Update both parent and child columns
      parentColumns.value = parentColumns.value.map((col, index) => ({
        ...col,
        order: index
      }))

      childColumns.value = childColumns.value.map((col, index) => ({
        ...col,
        order: index
      }))

      // Clear pending changes after successful save
      columnState.value.pendingChanges = []

      debug.completeState(DebugCategories.STATE, 'Column changes saved', {
        tableId,
        parentColumns: parentColumns.value.length,
        childColumns: childColumns.value.length,
        groupCounts: groupedColumns.value.reduce((acc, group) => {
          acc[group.category] = group.columns.length
          return acc
        }, {} as Record<string, number>)
      })

      return {
        parentColumns: parentColumns.value,
        childColumns: childColumns.value
      }
    } catch (error) {
      debug.error(DebugCategories.ERROR, 'Error saving column changes', error)
      return false
    } finally {
      isUpdating.value = false
    }
  }

  return {
    // State
    currentView,
    isUpdating,
    columnState,
    activeColumns,
    availableParameters,

    // Computed
    processedColumns,
    groupedColumns,

    // Methods
    setView,
    handleColumnOperation,
    saveChanges
  }
}
