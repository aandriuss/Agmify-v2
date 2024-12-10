import type { ColumnDef, BimColumnDef, UserColumnDef } from './column-types'

/**
 * Extended column properties for management
 */
export interface ManagedColumnProps {
  source?: string
  category?: string
  description?: string
}

/**
 * Managed BIM column definition
 */
export interface ManagedBimColumnDef extends BimColumnDef, ManagedColumnProps {
  kind: 'bim'
}

/**
 * Managed user column definition
 */
export interface ManagedUserColumnDef extends UserColumnDef, ManagedColumnProps {
  kind: 'user'
}

/**
 * Union type for all managed column types
 */
export type ManagedColumnDef = ManagedBimColumnDef | ManagedUserColumnDef

/**
 * Column management state interface
 */
export interface ColumnManagementState {
  currentTableColumns: ColumnDef[]
  currentDetailColumns: ColumnDef[]
  parameterColumns: ColumnDef[]
  mergedTableColumns: ColumnDef[]
  mergedDetailColumns: ColumnDef[]
}

/**
 * Column management options interface
 */
export interface ColumnManagementOptions {
  state: ColumnManagementState
  updateMergedColumns: (tableColumns: ColumnDef[], detailColumns: ColumnDef[]) => void
  updateCurrentColumns: (tableColumns: ColumnDef[], detailColumns: ColumnDef[]) => void
  updateParameterVisibility?: (paramId: string, visible: boolean) => void
  handleError: (error: Error) => void
  defaultSource?: string
  defaultCategory?: string
}

/**
 * Type guards
 */
export function isManagedBimColumnDef(value: unknown): value is ManagedBimColumnDef {
  return (
    typeof value === 'object' &&
    value !== null &&
    'kind' in value &&
    value.kind === 'bim' &&
    'source' in value
  )
}

export function isManagedUserColumnDef(value: unknown): value is ManagedUserColumnDef {
  return (
    typeof value === 'object' &&
    value !== null &&
    'kind' in value &&
    value.kind === 'user' &&
    'source' in value
  )
}

export function isManagedColumnDef(value: unknown): value is ManagedColumnDef {
  return isManagedBimColumnDef(value) || isManagedUserColumnDef(value)
}

/**
 * Helper functions
 */
export function toManagedColumn(
  column: ColumnDef,
  defaultSource: string = 'Parameters',
  defaultCategory: string = 'Parameters'
): ManagedColumnDef {
  const base = {
    ...column,
    source: column.kind === 'bim' ? column.source : defaultSource,
    category: column.category || defaultCategory,
    description:
      column.description ||
      `${column.kind === 'bim' ? column.source : defaultSource} > ${column.header}`
  }

  if (column.kind === 'bim') {
    return {
      ...base,
      kind: 'bim'
    } as ManagedBimColumnDef
  }

  return {
    ...base,
    kind: 'user'
  } as ManagedUserColumnDef
}

export function fromManagedColumn(column: ManagedColumnDef): ColumnDef {
  const { source, ...rest } = column
  if (column.kind === 'bim') {
    return {
      ...rest,
      kind: 'bim'
    } as BimColumnDef
  }
  return {
    ...rest,
    kind: 'user'
  } as UserColumnDef
}
