/* eslint-disable no-console */
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import type { ElementData } from '../types'

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
  PARAMETER_EVALUATION = 'parameter-evaluation',
  RELATIONSHIPS = 'relationships' // New category for relationship debugging
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
  logRelationships: (
    parents: ElementData[],
    children: ElementData[],
    message?: string
  ) => void
  logRelationshipValidation: (
    element: ElementData,
    isValid: boolean,
    reason: string
  ) => void
  logMarkHostMatch: (
    child: ElementData,
    matchedParent: ElementData | undefined,
    success: boolean
  ) => void
}

interface ColumnVisibilityInfo {
  field: string | undefined
  visible: boolean
  category?: string
}

interface RelationshipValidationInfo {
  elementId: string
  elementType: string
  category: string
  isValid: boolean
  reason: string
  mark?: string
  host?: string
}

interface MarkHostMatchInfo {
  childId: string
  childType: string
  childCategory: string
  host: string | undefined
  parentId?: string
  parentType?: string
  parentCategory?: string
  parentMark?: string
  success: boolean
}

class Debug implements DebugLogger {
  private logWithLevel(
    level: LogLevel,
    category: DebugCategories | string,
    message: unknown,
    data?: unknown,
    state?: StateType
  ) {
    const timestamp = new Date().toISOString()
    const statePrefix = state ? `[${state.toUpperCase()}]` : ''
    const prefix = `[${timestamp}] [${category}] ${statePrefix}`

    if (data !== undefined) {
      console[level](prefix, String(message), data)
    } else {
      console[level](prefix, String(message))
    }
  }

  log(category: DebugCategories | string, message: unknown, data?: unknown) {
    this.logWithLevel('log', category, message, data)
  }

  warn(category: DebugCategories | string, message: unknown, data?: unknown) {
    this.logWithLevel('warn', category, message, data)
  }

  error(category: DebugCategories | string, message: unknown, data?: unknown) {
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
      field: col.field || undefined,
      visible: col.visible || false,
      category: col.category
    }))

    this.log(DebugCategories.COLUMNS, message, { columns: columnInfo })
  }

  // New method for logging relationship information
  logRelationships(
    parents: ElementData[],
    children: ElementData[],
    message = 'Relationship status:'
  ) {
    const relationshipInfo = {
      totalParents: parents.length,
      totalChildren: children.length,
      parentsWithMarks: parents.filter((p) => p.mark).length,
      childrenWithHosts: children.filter((c) => c.host).length,
      orphanedChildren: children.filter(
        (c) => !c.host || !parents.some((p) => p.mark === c.host)
      ).length,
      parentsWithoutChildren: parents.filter(
        (p) => !children.some((c) => c.host === p.mark)
      ).length,
      categories: {
        parents: [...new Set(parents.map((p) => p.category))],
        children: [...new Set(children.map((c) => c.category))]
      }
    }

    this.log(DebugCategories.RELATIONSHIPS, String(message), relationshipInfo)
  }

  // New method for logging relationship validation
  logRelationshipValidation(element: ElementData, isValid: boolean, reason: string) {
    const validationInfo: RelationshipValidationInfo = {
      elementId: element.id,
      elementType: element.type || 'unknown',
      category: element.category,
      isValid,
      reason,
      mark: element.mark,
      host: element.host
    }

    const level: LogLevel = isValid ? 'log' : 'warn'
    this.logWithLevel(
      level,
      DebugCategories.RELATIONSHIPS,
      'Relationship validation:',
      validationInfo
    )
  }

  // New method for logging mark/host matching
  logMarkHostMatch(
    child: ElementData,
    matchedParent: ElementData | undefined,
    success: boolean
  ) {
    const matchInfo: MarkHostMatchInfo = {
      childId: child.id,
      childType: child.type || 'unknown',
      childCategory: child.category,
      host: child.host,
      parentId: matchedParent?.id,
      parentType: matchedParent?.type || 'unknown',
      parentCategory: matchedParent?.category,
      parentMark: matchedParent?.mark,
      success
    }

    const level: LogLevel = success ? 'log' : 'warn'
    this.logWithLevel(
      level,
      DebugCategories.RELATIONSHIPS,
      'Mark/Host matching:',
      matchInfo
    )
  }
}

export const debug = new Debug()
