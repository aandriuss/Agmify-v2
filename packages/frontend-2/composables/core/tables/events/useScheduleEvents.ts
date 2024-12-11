import type { CombinedTableEvents } from '../../types/tables/event-types'
import type { BaseItem } from '../../types/common/base-types'
import { useDebug, DebugCategories } from '../../utils/debug'

export interface UseScheduleEventsOptions {
  onError?: (error: Error) => void
  onRetry?: () => void
}

export function useScheduleEvents<TRow extends BaseItem = BaseItem>(
  options: UseScheduleEventsOptions = {}
) {
  const debug = useDebug()

  const createHandler = <K extends keyof CombinedTableEvents<TRow>>(
    handler: (payload: CombinedTableEvents<TRow>[K]) => void
  ) => {
    return (payload: CombinedTableEvents<TRow>[K]) => {
      try {
        handler(payload)
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        options.onError?.(error)
      }
    }
  }

  const handleRowExpand = createHandler<'row-expand'>((payload) => {
    debug.log(DebugCategories.TABLE_DATA, 'Row expanded', {
      id: payload.row.id
    })
  })

  const handleRowCollapse = createHandler<'row-collapse'>((payload) => {
    debug.log(DebugCategories.TABLE_DATA, 'Row collapsed', {
      id: payload.row.id
    })
  })

  const handleColumnVisibilityChange = createHandler<'column-visibility-change'>(
    (payload) => {
      debug.log(DebugCategories.COLUMNS, 'Column visibility changed', {
        field: payload.column.field,
        visible: payload.visible
      })
    }
  )

  const handleColumnReorder = createHandler<'column-reorder'>((payload) => {
    debug.log(DebugCategories.COLUMNS, 'Column reordered', {
      dragIndex: payload.dragIndex,
      dropIndex: payload.dropIndex
    })
  })

  const handleColumnResize = createHandler<'column-resize'>((payload) => {
    debug.log(DebugCategories.COLUMNS, 'Column resized', {
      delta: payload.delta
    })
  })

  const handleCategoryUpdate = createHandler<'category-update'>((payload) => {
    debug.log(DebugCategories.CATEGORIES, 'Categories updated', {
      categories: payload.categories
    })
  })

  const handleParameterClick = createHandler<'parameter-click'>((payload) => {
    debug.log(DebugCategories.PARAMETERS, 'Parameter clicked', {
      id: payload.parameter.id
    })
  })

  const handleCreateParameter = createHandler<'create-parameter'>((payload) => {
    debug.log(DebugCategories.PARAMETERS, 'Create parameter requested', {
      timestamp: payload.timestamp
    })
  })

  const handleEditParameters = createHandler<'edit-parameters'>((payload) => {
    debug.log(DebugCategories.PARAMETERS, 'Edit parameters requested', {
      timestamp: payload.timestamp
    })
  })

  const handleTestModeUpdate = createHandler<'update:is-test-mode'>((payload) => {
    debug.log(DebugCategories.STATE, 'Test mode updated', { value: payload.value })
  })

  const handleError = createHandler<'error'>((payload) => {
    debug.error(DebugCategories.ERROR, 'Schedule error:', {
      name: payload.error.name,
      message: payload.error.message,
      stack: payload.error.stack
    })
    options.onError?.(payload.error)
  })

  const handleRetry = createHandler<'retry'>((payload) => {
    debug.log(DebugCategories.STATE, 'Retry requested', {
      timestamp: payload.timestamp
    })
    options.onRetry?.()
  })

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
