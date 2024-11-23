import { ref, computed } from 'vue'

export enum DebugCategories {
  // Core categories
  INITIALIZATION = 'initialization',
  STATE = 'state',
  ERROR = 'error',

  // Data categories
  DATA = 'data',
  DATA_TRANSFORM = 'data-transform',
  DATA_VALIDATION = 'data-validation',
  VALIDATION = 'validation',

  // Column categories
  COLUMNS = 'columns',
  COLUMN_VALIDATION = 'column-validation',
  COLUMN_UPDATES = 'column-updates',

  // Parameter categories
  PARAMETERS = 'parameters',
  PARAMETER_VALIDATION = 'parameter-validation',
  PARAMETER_UPDATES = 'parameter-updates',

  // Table categories
  TABLE_DATA = 'table-data',
  TABLE_UPDATES = 'table-updates',
  TABLE_VALIDATION = 'table-validation',

  // Category management
  CATEGORIES = 'categories',
  CATEGORY_UPDATES = 'category-updates',

  // Relationships
  RELATIONSHIPS = 'relationships'
}

interface DebugLog {
  timestamp: string
  category: DebugCategories
  level: 'log' | 'warn' | 'error'
  message: string
  data?: unknown
  state?: 'start' | 'complete'
  source?: string // Component or module that generated the log
  details?: {
    field?: string
    isValid?: boolean
    visible?: boolean
    fieldType?: string
    value?: unknown
    extracted?: unknown
    hasParameters?: boolean
    parameters?: unknown
  }
}

interface DebugState {
  isEnabled: boolean
  isPanelVisible: boolean
  enabledCategories: Set<DebugCategories>
  logs: DebugLog[]
  maxLogs: number
}

// Create a non-reactive state to prevent circular updates
let logBuffer: DebugLog[] = []
const LOG_FLUSH_INTERVAL = 100 // ms

// Categories that should be logged to console
const CONSOLE_LOG_CATEGORIES = new Set([
  DebugCategories.ERROR,
  DebugCategories.INITIALIZATION
])

// Critical state changes that should be logged regardless of category
const CRITICAL_STATE_CHANGES = new Set([
  'BIM elements initialized',
  'Data pipeline complete',
  'Store initialized',
  'Store reset complete',
  'Failed to initialize schedules',
  'World tree not available'
])

// Critical warnings that indicate potential issues
const CRITICAL_WARNINGS = new Set([
  'Cannot transform data before initialization',
  'No elements available for processing',
  'Failed to access viewer state',
  'Failed to initialize data'
])

class Debug {
  private state = ref<DebugState>({
    isEnabled: import.meta.env.DEV,
    isPanelVisible: false,
    enabledCategories: new Set(Object.values(DebugCategories)),
    logs: [],
    maxLogs: 1000
  })

  private flushTimeout: number | null = null

  // Computed properties
  public readonly isEnabled = computed(() => this.state.value.isEnabled)
  public readonly isPanelVisible = computed(() => this.state.value.isPanelVisible)
  public readonly enabledCategories = computed(() => this.state.value.enabledCategories)
  public readonly logs = computed(() => this.state.value.logs)
  public readonly filteredLogs = computed(() =>
    this.state.value.logs.filter((log) =>
      this.state.value.enabledCategories.has(log.category)
    )
  )

  // UI Actions
  public toggleDebug(): void {
    this.state.value.isEnabled = !this.state.value.isEnabled
  }

  public togglePanel(): void {
    this.state.value.isPanelVisible = !this.state.value.isPanelVisible
  }

  public toggleCategory(category: DebugCategories): void {
    if (this.state.value.enabledCategories.has(category)) {
      this.state.value.enabledCategories.delete(category)
    } else {
      this.state.value.enabledCategories.add(category)
    }
  }

  public clearLogs(): void {
    logBuffer = []
    this.state.value.logs = []
  }

  public enableAllCategories(): void {
    this.state.value.enabledCategories = new Set(Object.values(DebugCategories))
  }

  public disableAllCategories(): void {
    this.state.value.enabledCategories.clear()
  }

  // Logging methods
  public log(category: DebugCategories, message: string, data?: unknown): void {
    this.addLog({ category, level: 'log', message, data })
  }

  public warn(category: DebugCategories, message: string, data?: unknown): void {
    this.addLog({ category, level: 'warn', message, data })
  }

  public error(category: DebugCategories, message: string, data?: unknown): void {
    this.addLog({ category, level: 'error', message, data })
  }

  public startState(category: DebugCategories, message: string, data?: unknown): void {
    this.addLog({ category, level: 'log', message, data, state: 'start' })
  }

  public completeState(
    category: DebugCategories,
    message: string,
    data?: unknown
  ): void {
    this.addLog({ category, level: 'log', message, data, state: 'complete' })
  }

  // Internal methods
  private addLog(log: Omit<DebugLog, 'timestamp'>): void {
    if (!this.state.value.isEnabled) return

    const newLog = {
      ...log,
      timestamp: new Date().toISOString()
    }

    logBuffer.push(newLog)

    // Only log to console if:
    // 1. It's an error
    // 2. It's in the console log categories
    // 3. It's a critical state change
    // 4. It's a critical warning
    if (
      import.meta.env.DEV &&
      (log.level === 'error' ||
        CONSOLE_LOG_CATEGORIES.has(log.category) ||
        CRITICAL_STATE_CHANGES.has(log.message) ||
        (log.level === 'warn' && CRITICAL_WARNINGS.has(log.message)))
    ) {
      const consoleData = {
        ...(log.data || {}),
        ...(log.details || {})
      }

      const prefix = [
        `[${log.category}]`,
        log.state ? `[${log.state}]` : '',
        log.source ? `[${log.source}]` : ''
      ]
        .filter(Boolean)
        .join(' ')

      // eslint-disable-next-line no-console
      console[log.level](prefix, log.message, consoleData)
    }

    // Schedule a flush if not already scheduled
    if (!this.flushTimeout) {
      this.flushTimeout = window.setTimeout(() => this.flushLogs(), LOG_FLUSH_INTERVAL)
    }
  }

  private flushLogs(): void {
    if (logBuffer.length > 0) {
      this.state.value.logs = [...logBuffer, ...this.state.value.logs].slice(
        0,
        this.state.value.maxLogs
      )
      logBuffer = []
    }
    this.flushTimeout = null
  }
}

// Initialize singleton instance
const debugInstance = new Debug()

// Export singleton accessor
export function useDebug(): Debug {
  return debugInstance
}

// Export debug interface for direct use
export const debug = {
  log: (category: DebugCategories, message: string, data?: unknown) =>
    debugInstance.log(category, message, data),
  warn: (category: DebugCategories, message: string, data?: unknown) =>
    debugInstance.warn(category, message, data),
  error: (category: DebugCategories, message: string, data?: unknown) =>
    debugInstance.error(category, message, data),
  startState: (category: DebugCategories, message: string, data?: unknown) =>
    debugInstance.startState(category, message, data),
  completeState: (category: DebugCategories, message: string, data?: unknown) =>
    debugInstance.completeState(category, message, data),
  // State and actions
  isEnabled: debugInstance.isEnabled,
  isPanelVisible: debugInstance.isPanelVisible,
  enabledCategories: debugInstance.enabledCategories,
  logs: debugInstance.logs,
  filteredLogs: debugInstance.filteredLogs,
  toggleDebug: debugInstance.toggleDebug.bind(debugInstance),
  togglePanel: debugInstance.togglePanel.bind(debugInstance),
  toggleCategory: debugInstance.toggleCategory.bind(debugInstance),
  clearLogs: debugInstance.clearLogs.bind(debugInstance),
  enableAllCategories: debugInstance.enableAllCategories.bind(debugInstance),
  disableAllCategories: debugInstance.disableAllCategories.bind(debugInstance)
}
