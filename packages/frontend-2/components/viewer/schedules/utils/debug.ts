// Debug utility for BIM Schedule data inspection
const prefix = '[BIM Schedule]'

interface DebugState {
  currentState: string | null
  startTime: number | null
}

const state: DebugState = {
  currentState: null,
  startTime: null
}

export const debug = {
  // Core logging methods
  log: (message: string, data?: unknown) => {
    console.log(`${prefix} ${message}`, data)
  },
  warn: (message: string, data?: unknown) => {
    console.warn(`${prefix} ${message}`, data)
  },
  error: (message: string, data?: unknown) => {
    console.error(`${prefix} ${message}`, data)
  },
  // State tracking
  startState: (stateName: string) => {
    state.currentState = stateName
    state.startTime = performance.now()
    console.log(`${prefix} ▶️ Starting ${stateName}`)
  },
  completeState: (stateName: string) => {
    if (state.currentState === stateName && state.startTime) {
      const duration = performance.now() - state.startTime
      console.log(`${prefix} ✅ Completed ${stateName} (${duration.toFixed(2)}ms)`)
    }
    state.currentState = null
    state.startTime = null
  },
  // Data validation
  validateColumns: (columns: unknown) => {
    return (
      Array.isArray(columns) &&
      columns.every((col) => col && typeof col === 'object' && 'field' in col)
    )
  },
  // Make source parameter optional to match existing usage
  logColumnVisibility: (columns: unknown, source?: string) => {
    if (!Array.isArray(columns)) return
    console.log(
      `${prefix} 👁️ Column Visibility ${source ? `[${source}]` : ''}:`,
      columns.map((col) => ({
        field: (col as any).field,
        visible: (col as any).visible
      }))
    )
  },
  // Data inspection for BIM elements
  inspectWorldTree: (worldTree: unknown) => {
    console.log(`${prefix} 🌳 WorldTree:`, {
      hasValue: !!worldTree,
      hasRoot: !!(worldTree as any)?._root,
      rootType: (worldTree as any)?._root?.type,
      childCount: (worldTree as any)?._root?.children?.length || 0
    })
  },
  inspectNode: (node: unknown, depth = 0) => {
    const indent = '  '.repeat(depth)
    console.log(`${prefix} ${indent}📦 Node:`, {
      hasRawNode: !!(node as any)?.rawNode,
      hasChildren: !!(node as any)?.children,
      childCount: (node as any)?.children?.length || 0,
      raw: (node as any)?.rawNode?.raw
    })
  },
  inspectElement: (element: unknown) => {
    console.log(`${prefix} 🏗️ Element:`, {
      type: (element as any)?.type,
      name: (element as any)?.name,
      mark: (element as any)?.mark,
      category: (element as any)?.category,
      hasDetails: !!(element as any)?.details?.length,
      detailCount: (element as any)?.details?.length || 0
    })
  },
  dumpRawData: (data: unknown) => {
    console.log(`${prefix} 📝 Raw Data:`, {
      type: typeof data,
      isArray: Array.isArray(data),
      keys: data && typeof data === 'object' ? Object.keys(data as object) : [],
      value: data
    })
  }
}
