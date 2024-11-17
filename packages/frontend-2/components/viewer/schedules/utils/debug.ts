/* eslint-disable no-console */
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'

export enum DebugCategories {
  INITIALIZATION = 'initialization',
  STATE = 'state',
  TABLE_UPDATES = 'table-updates',
  COLUMNS = 'columns',
  PARAMETERS = 'parameters',
  ERROR = 'error',
  DEBUG = 'debug',
  DATA = 'data',
  DATA_TRANSFORM = 'data-transform',
  VALIDATION = 'validation',
  CATEGORIES = 'categories',
  PARAMETER_EVALUATION = 'parameter-evaluation'
}

type LogLevel = 'log' | 'warn' | 'error'
type StateType = 'start' | 'complete'

interface DebugLogger {
  log: (
    category: DebugCategories | string,
    message: string | unknown,
    data?: unknown
  ) => void
  warn: (
    category: DebugCategories | string,
    message: string | unknown,
    data?: unknown
  ) => void
  error: (
    category: DebugCategories | string,
    message: string | unknown,
    data?: unknown
  ) => void
  startState: (state: string) => void
  completeState: (state: string) => void
  logColumnVisibility: (columns: ColumnDef[], message?: string) => void
}

interface ColumnVisibilityInfo {
  field: string
  visible: boolean
  category?: string
}

class Debug implements DebugLogger {
  private logWithLevel(
    level: LogLevel,
    category: DebugCategories | string,
    message: string | unknown,
    data?: unknown,
    state?: StateType
  ) {
    const timestamp = new Date().toISOString()
    const statePrefix = state ? `[${state.toUpperCase()}]` : ''
    const prefix = `[${timestamp}] [${category}] ${statePrefix}`

    if (typeof message === 'string') {
      if (data !== undefined) {
        console[level](prefix, message, data)
      } else {
        console[level](prefix, message)
      }
    } else {
      console[level](prefix, message)
    }
  }

  log(category: DebugCategories | string, message: string | unknown, data?: unknown) {
    this.logWithLevel('log', category, message, data)
  }

  warn(category: DebugCategories | string, message: string | unknown, data?: unknown) {
    this.logWithLevel('warn', category, message, data)
  }

  error(category: DebugCategories | string, message: string | unknown, data?: unknown) {
    this.logWithLevel('error', category, message, data)
  }

  startState(state: string) {
    this.logWithLevel(
      'log',
      DebugCategories.STATE,
      `Starting ${state}`,
      undefined,
      'start'
    )
  }

  completeState(state: string) {
    this.logWithLevel(
      'log',
      DebugCategories.STATE,
      `Completed ${state}`,
      undefined,
      'complete'
    )
  }

  logColumnVisibility(columns: ColumnDef[], message = 'Column visibility:') {
    const columnInfo: ColumnVisibilityInfo[] = columns.map((col) => ({
      field: col.field,
      visible: col.visible || false,
      category: col.category
    }))

    this.log(DebugCategories.COLUMNS, message, { columns: columnInfo })
  }
}

export const debug = new Debug()
