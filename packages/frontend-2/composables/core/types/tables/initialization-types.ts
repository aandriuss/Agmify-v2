import type { ComputedRef } from 'vue'
import type { ColumnDef } from './column-types'
import type { ParameterValue } from '../parameters'
import type { EventEmits } from '../events/base-events'

/**
 * Table initialization state
 */
export interface TableInitializationState {
  selectedTableId: string
  tableName: string
  currentTableColumns: ColumnDef[]
  currentDetailColumns: ColumnDef[]
  selectedParentCategories: string[]
  selectedChildCategories: string[]
}

/**
 * Table initialization instance
 * Provides methods for initializing and managing table state
 */
export interface TableInitializationInstance {
  readonly state: ComputedRef<TableInitializationState>
  initialize: () => Promise<void>
  reset: () => Promise<void>
  update: (state: Partial<TableInitializationState>) => Promise<void>
}

/**
 * Table initialization options
 */
export interface TableInitializationOptions {
  initialState?: Partial<TableInitializationState>
  onUpdate?: (state: TableInitializationState) => Promise<void>
  onError?: (error: Error) => void
}

/**
 * Table row data interface
 * Combines fields from both ElementData and TableRow
 */
export interface TableRowData {
  id: string
  type: string
  isChild: boolean
  details?: unknown[]
  parameters?: Record<string, ParameterValue>
  metadata?: Record<string, unknown>
  name?: string
  field?: string
  header?: string
  visible?: boolean
  removable?: boolean
  [key: string]: unknown
}

/**
 * Table event handler types
 */
export interface TableEventHandlers {
  handleParameterVisibilityUpdate: (
    parameterId: string,
    visible: boolean
  ) => Promise<void>
  handleParameterOrderUpdate: (parameterId: string, newIndex: number) => Promise<void>
}

/**
 * Table initialization event payloads
 */
export interface TableInitializationEventPayloads {
  'row-expand': { row: TableRowData }
  'row-collapse': { row: TableRowData }
  'parameter-visibility-update': { parameterId: string; visible: boolean }
  'parameter-order-update': { parameterId: string; newIndex: number }
}

/**
 * Table initialization event emits
 */
export type TableInitializationEmits = EventEmits<TableInitializationEventPayloads>
