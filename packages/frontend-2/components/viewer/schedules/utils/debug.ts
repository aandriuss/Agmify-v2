// Debug utility for BIM Schedule data inspection
const prefix = '[BIM Schedule]'

// Debug categories
export const DebugCategories = {
  DATA: 'data',
  UI: 'ui',
  ERROR: 'error',
  VALIDATION: 'validation',
  COLUMNS: 'columns',
  DATA_TRANSFORM: 'data_transform',
  INITIALIZATION: 'initialization',
  STATE: 'state',
  PARAMETERS: 'parameters',
  CATEGORIES: 'categories',
  TABLE_UPDATES: 'table_updates',
  PERFORMANCE: 'performance'
} as const

export type DebugCategory = (typeof DebugCategories)[keyof typeof DebugCategories]

export const debug = {
  log: (category: DebugCategory, message: string, data?: unknown) => {
    console.log(`${prefix} [${category}] ${message}`, data)
  },
  warn: (category: DebugCategory, message: string, data?: unknown) => {
    console.warn(`${prefix} [${category}] ${message}`, data)
  },
  error: (category: DebugCategory, message: string, data?: unknown) => {
    console.error(`${prefix} [${category}] ${message}`, data)
  },
  startState: (stateName: string) => {
    console.log(`${prefix} ▶️ Starting ${stateName}`)
  },
  completeState: (stateName: string) => {
    console.log(`${prefix} ✅ Completed ${stateName}`)
  },
  validateColumns: (columns: unknown) => {
    return (
      Array.isArray(columns) &&
      columns.every((col) => col && typeof col === 'object' && 'field' in col)
    )
  },
  logColumnVisibility: (columns: unknown, source?: string) => {
    if (!Array.isArray(columns)) return
    console.log(
      `${prefix} 👁️ Column Visibility ${source ? `[${source}]` : ''}:`,
      columns.map((col) => ({
        field: (col as any).field,
        visible: (col as any).visible
      }))
    )
  }
}
