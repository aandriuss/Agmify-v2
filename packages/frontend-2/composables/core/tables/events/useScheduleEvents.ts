import type { BaseItem } from '../../types/common/base-types'
import type { ScheduleEventPayloads } from '../../types/events/table-events'
import { useDebug, DebugCategories } from '../../utils/debug'
import { useStore } from '../../store'

export interface UseScheduleEventsOptions {
  onError?: (error: Error) => void
  onRetry?: () => void
}

/**
 * Creates a type-safe event handler for a specific event
 */
function createHandler<
  TRow extends BaseItem,
  K extends keyof ScheduleEventPayloads<TRow>
>(
  debug: ReturnType<typeof useDebug>,
  store: ReturnType<typeof useStore>,
  options: UseScheduleEventsOptions,
  handler: (payload: ScheduleEventPayloads<TRow>[K]) => void | Promise<void>
) {
  return (payload: ScheduleEventPayloads<TRow>[K]) => {
    try {
      const result = handler(payload)
      if (result instanceof Promise) {
        return result.catch((err) => {
          const error = err instanceof Error ? err : new Error(String(err))
          options.onError?.(error)
        })
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      options.onError?.(error)
    }
  }
}

/**
 * Schedule events composable
 */
export function useScheduleEvents<TRow extends BaseItem = BaseItem>(
  options: UseScheduleEventsOptions = {}
) {
  const debug = useDebug()
  const store = useStore()

  const handleRowExpand = createHandler<TRow, 'row-expand'>(
    debug,
    store,
    options,
    (payload) => {
      debug.log(DebugCategories.TABLE_DATA, 'Row expanded', {
        id: payload.row.id
      })
      // Store update not needed - UI state only
    }
  )

  const handleRowCollapse = createHandler<TRow, 'row-collapse'>(
    debug,
    store,
    options,
    (payload) => {
      debug.log(DebugCategories.TABLE_DATA, 'Row collapsed', {
        id: payload.row.id
      })
      // Store update not needed - UI state only
    }
  )

  const handleColumnVisibilityChange = createHandler<TRow, 'column-visibility-change'>(
    debug,
    store,
    options,
    async (payload) => {
      debug.log(DebugCategories.COLUMNS, 'Column visibility changed', {
        field: payload.column.field,
        visible: payload.visible
      })
      await store.lifecycle.update({
        parentVisibleColumns: store.parentVisibleColumns.value.map((col) =>
          col.id === payload.column.id ? { ...col, visible: payload.visible } : col
        ),
        childVisibleColumns: store.childVisibleColumns.value.map((col) =>
          col.id === payload.column.id ? { ...col, visible: payload.visible } : col
        )
      })
    }
  )

  const handleColumnReorder = createHandler<TRow, 'column-reorder'>(
    debug,
    store,
    options,
    async (payload) => {
      debug.log(DebugCategories.COLUMNS, 'Column reordered', {
        dragIndex: payload.dragIndex,
        dropIndex: payload.dropIndex
      })

      const reorderColumns = (columns: typeof store.parentVisibleColumns.value) => {
        const newColumns = [...columns]
        const [col] = newColumns.splice(payload.dragIndex, 1)
        newColumns.splice(payload.dropIndex, 0, col)
        return newColumns
      }

      await store.lifecycle.update({
        parentVisibleColumns: reorderColumns(store.parentVisibleColumns.value),
        childVisibleColumns: reorderColumns(store.childVisibleColumns.value)
      })
    }
  )

  const handleColumnResize = createHandler<TRow, 'column-resize'>(
    debug,
    store,
    options,
    (payload) => {
      debug.log(DebugCategories.COLUMNS, 'Column resized', {
        delta: payload.delta
      })
      // Store update not needed - UI state only
    }
  )

  const handleCategoryUpdate = createHandler<TRow, 'category-update'>(
    debug,
    store,
    options,
    async (payload) => {
      debug.log(DebugCategories.CATEGORIES, 'Categories updated', {
        categories: payload.categories
      })
      await store.lifecycle.update({
        selectedCategories: new Set(payload.categories)
      })
    }
  )

  const handleParameterClick = createHandler<TRow, 'parameter-click'>(
    debug,
    store,
    options,
    (payload) => {
      debug.log(DebugCategories.PARAMETERS, 'Parameter clicked', {
        id: payload.parameter.id
      })
      // Store update not needed - UI event only
    }
  )

  const handleCreateParameter = createHandler<TRow, 'create-parameter'>(
    debug,
    store,
    options,
    (payload) => {
      debug.log(DebugCategories.PARAMETERS, 'Create parameter requested', {
        timestamp: payload.timestamp
      })
      // Parameter creation handled by ParameterManager component
    }
  )

  const handleEditParameters = createHandler<TRow, 'edit-parameters'>(
    debug,
    store,
    options,
    (payload) => {
      debug.log(DebugCategories.PARAMETERS, 'Edit parameters requested', {
        timestamp: payload.timestamp
      })
      // Parameter editing handled by ParameterManager component
    }
  )

  const handleTestModeUpdate = createHandler<TRow, 'update:is-test-mode'>(
    debug,
    store,
    options,
    (payload) => {
      debug.log(DebugCategories.STATE, 'Test mode updated', { value: payload.value })
      // Test mode state handled by parent component
    }
  )

  const handleError = createHandler<TRow, 'error'>(
    debug,
    store,
    options,
    async (payload) => {
      debug.error(DebugCategories.ERROR, 'Schedule error:', {
        name: payload.error.name,
        message: payload.error.message,
        stack: payload.error.stack
      })
      await store.lifecycle.update({
        error: payload.error
      })
      options.onError?.(payload.error)
    }
  )

  const handleRetry = createHandler<TRow, 'retry'>(
    debug,
    store,
    options,
    async (payload) => {
      debug.log(DebugCategories.STATE, 'Retry requested', {
        timestamp: payload.timestamp
      })
      await store.lifecycle.update({
        error: null
      })
      options.onRetry?.()
    }
  )

  return {
    handleRowExpand,
    handleRowCollapse,
    handleColumnVisibilityChange,
    handleColumnReorder,
    handleColumnResize,
    handleCategoryUpdate,
    handleParameterClick,
    handleCreateParameter,
    handleEditParameters,
    handleTestModeUpdate,
    handleError,
    handleRetry
  }
}
