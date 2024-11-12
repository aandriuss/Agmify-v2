// Debug utility for BIM Schedule data inspection
const prefix = '[BIM Schedule]'

// Debug categories
export const DebugCategories = {
  DATA: 'data',
  UI: 'ui',
  ERROR: 'error'
} as const

export const debug = {
  log: (message: string, data?: unknown) => {
    console.log(`${prefix} ${message}`, data)
  },
  warn: (message: string, data?: unknown) => {
    console.warn(`${prefix} ${message}`, data)
  },
  error: (message: string, data?: unknown) => {
    console.error(`${prefix} ${message}`, data)
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
