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
  PARAMETERS = 'parameters', // Raw/fetched parameters
  SAVED_PARAMETERS = 'saved-parameters', // Selected/created parameters
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
  hiddenGroups: Set<string> // Groups hidden in UI
  logs: DebugLog[]
  maxLogs: number
}

// Create a non-reactive state to prevent circular updates
let logBuffer: DebugLog[] = []
const LOG_FLUSH_INTERVAL = 100 // ms

// Categories that should be logged to console
const CONSOLE_LOG_CATEGORIES = new Set([
  DebugCategories.ERROR,
  DebugCategories.INITIALIZATION,
  DebugCategories.PARAMETER_VALIDATION
])

// Critical state changes that should be logged regardless of category
const CRITICAL_STATE_CHANGES = new Set([
  'BIM elements initialized',
  'Data pipeline complete',
  'Store initialized',
  'Store reset complete',
  'Failed to initialize schedules',
  'World tree not available',
  'Selected parameters updated',
  'Parameter state verification failed',
  'Parameters loaded from PostgreSQL',
  'Default parameters created'
])

// Critical warnings that indicate potential issues
const CRITICAL_WARNINGS = new Set([
  'Cannot transform data before initialization',
  'No elements available for processing',
  'Failed to access viewer state',
  'Failed to initialize data',
  'No parameters found in store',
  'Failed to parse nested parameter',
  'Invalid parameters detected',
  'Parameter state verification failed'
])

interface CategoryGroups {
  core: DebugCategories[]
  data: DebugCategories[]
  parameters: DebugCategories[]
  columns: DebugCategories[]
  tables: DebugCategories[]
  categories: DebugCategories[]
  [key: string]: string[]
}

class Debug {
  public readonly categoryGroups: CategoryGroups = {
    core: [
      DebugCategories.INITIALIZATION,
      DebugCategories.STATE,
      DebugCategories.ERROR
    ],
    data: [
      DebugCategories.DATA,
      DebugCategories.DATA_TRANSFORM,
      DebugCategories.DATA_VALIDATION
    ],
    parameters: [
      DebugCategories.PARAMETERS,
      DebugCategories.SAVED_PARAMETERS,
      DebugCategories.PARAMETER_VALIDATION,
      DebugCategories.PARAMETER_UPDATES
    ],
    columns: [
      DebugCategories.COLUMNS,
      DebugCategories.COLUMN_VALIDATION,
      DebugCategories.COLUMN_UPDATES
    ],
    tables: [
      DebugCategories.TABLE_DATA,
      DebugCategories.TABLE_UPDATES,
      DebugCategories.TABLE_VALIDATION
    ],
    categories: [DebugCategories.CATEGORIES, DebugCategories.CATEGORY_UPDATES]
  }

  private state = ref<DebugState>({
    isEnabled: import.meta.env.DEV,
    isPanelVisible: false,
    enabledCategories: new Set(Object.values(DebugCategories)),
    hiddenGroups: new Set<string>(),
    logs: [],
    maxLogs: 1000
  })

  private flushTimeout: ReturnType<typeof setTimeout> | null = null

  // Computed properties
  public readonly isEnabled = computed(() => this.state.value.isEnabled)
  public readonly isPanelVisible = computed(() => this.state.value.isPanelVisible)
  public readonly enabledCategories = computed(() => this.state.value.enabledCategories)
  public readonly logs = computed(() => this.state.value.logs)
  // Group logs by category for better filtering
  private readonly groupedLogs = computed(() => {
    const groups = new Map<DebugCategories, DebugLog[]>()
    this.state.value.logs.forEach((log) => {
      const existing = groups.get(log.category) || []
      groups.set(log.category, [...existing, log])
    })
    return groups
  })

  // Get visible logs based on enabled categories and hidden groups
  public readonly filteredLogs = computed(() => {
    const logs: DebugLog[] = []

    // Find which group a category belongs to
    const getCategoryGroup = (category: DebugCategories): string | undefined => {
      const entries = Object.entries(this.categoryGroups) as [
        string,
        DebugCategories[]
      ][]
      for (const [groupName, categories] of entries) {
        if (categories.includes(category)) return groupName
      }
      return undefined
    }

    this.state.value.logs.forEach((log) => {
      // Get the group for this log's category
      const group = getCategoryGroup(log.category)

      // If the group is hidden in UI, skip this log unless it's critical
      if (group && this.state.value.hiddenGroups.has(group)) {
        if (
          log.level === 'error' ||
          CRITICAL_STATE_CHANGES.has(log.message) ||
          (log.level === 'warn' && CRITICAL_WARNINGS.has(log.message))
        ) {
          logs.push(log)
        }
        return
      }
      // Check if any category in the group is enabled
      const isGroupEnabled = (category: DebugCategories): boolean => {
        const groups = Object.values(this.categoryGroups) as DebugCategories[][]
        const group = groups.find((g) => g.includes(category))
        if (!group) return this.state.value.enabledCategories.has(category)
        return group.some((c) => this.state.value.enabledCategories.has(c))
      }

      // Always show critical logs
      if (
        log.level === 'error' ||
        CRITICAL_STATE_CHANGES.has(log.message) ||
        (log.level === 'warn' && CRITICAL_WARNINGS.has(log.message))
      ) {
        logs.push(log)
        return
      }

      // For state updates, check state and related categories
      if (log.category === DebugCategories.STATE) {
        if (isGroupEnabled(DebugCategories.STATE)) {
          logs.push(log)
        }
        return
      }

      // For data updates, check data and related categories
      if (log.category === DebugCategories.DATA) {
        if (isGroupEnabled(DebugCategories.DATA)) {
          logs.push(log)
        }
        return
      }

      // For parameter updates, check parameter and related categories
      if (
        log.category === DebugCategories.PARAMETERS ||
        log.category === DebugCategories.SAVED_PARAMETERS ||
        log.category === DebugCategories.PARAMETER_UPDATES
      ) {
        if (isGroupEnabled(log.category)) {
          logs.push(log)
        }
        return
      }

      // For all other categories, show if category or its group is enabled
      if (isGroupEnabled(log.category)) {
        logs.push(log)
      }
    })

    return logs
  })

  // Get logs for a specific category
  public getLogsForCategory(category: DebugCategories): DebugLog[] {
    return this.groupedLogs.value.get(category) || []
  }

  // Get related logs for a category
  public getRelatedLogs(category: DebugCategories): DebugLog[] {
    const logs: DebugLog[] = []
    const categoryLogs = this.groupedLogs.value.get(category) || []

    // Add logs from the requested category
    logs.push(...categoryLogs)

    // Add related logs based on category relationships
    if (category === DebugCategories.STATE) {
      // Include data transform logs for state changes
      const dataLogs = this.groupedLogs.value.get(DebugCategories.DATA_TRANSFORM) || []
      logs.push(...dataLogs)
    }

    if (category === DebugCategories.DATA) {
      // Include parameter logs for data operations
      const parameterLogs = this.groupedLogs.value.get(DebugCategories.PARAMETERS) || []
      logs.push(...parameterLogs)
    }

    return logs.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  }

  // UI visibility actions
  public toggleGroupVisibility(groupName: string): void {
    if (this.state.value.hiddenGroups.has(groupName)) {
      this.state.value.hiddenGroups.delete(groupName)
    } else {
      this.state.value.hiddenGroups.add(groupName)
    }
  }

  public showAllGroups(): void {
    this.state.value.hiddenGroups.clear()
  }

  public hideAllGroups(): void {
    Object.keys(this.categoryGroups).forEach((group) => {
      this.state.value.hiddenGroups.add(group)
    })
  }

  // Debug state actions
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

    // Skip if category is disabled (unless it's an error or critical message)
    if (
      !this.state.value.enabledCategories.has(log.category) &&
      log.level !== 'error' &&
      !CRITICAL_STATE_CHANGES.has(log.message) &&
      !(log.level === 'warn' && CRITICAL_WARNINGS.has(log.message))
    ) {
      return
    }

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
    if (!this.flushTimeout && typeof window !== 'undefined') {
      this.flushTimeout = setTimeout(() => this.flushLogs(), LOG_FLUSH_INTERVAL)
    } else {
      // If no window, flush immediately
      this.flushLogs()
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
  // Category groups for UI organization
  categoryGroups: debugInstance.categoryGroups,
  // Logging methods
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
  disableAllCategories: debugInstance.disableAllCategories.bind(debugInstance),

  // Advanced filtering
  getLogsForCategory: debugInstance.getLogsForCategory.bind(debugInstance),
  getRelatedLogs: debugInstance.getRelatedLogs.bind(debugInstance),

  // UI visibility controls
  toggleGroupVisibility: debugInstance.toggleGroupVisibility.bind(debugInstance),
  showAllGroups: debugInstance.showAllGroups.bind(debugInstance),
  hideAllGroups: debugInstance.hideAllGroups.bind(debugInstance)
}
