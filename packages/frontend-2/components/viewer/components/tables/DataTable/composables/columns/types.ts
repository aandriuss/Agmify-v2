export interface ColumnDef {
  field: string
  header: string
  type: string
  visible: boolean
  removable?: boolean
  width?: number
  order: number
  headerComponent?: unknown
  category?: string
  source?: string // Legacy parameter group (for backward compatibility)
  fetchedGroup?: string // Group from raw data
  currentGroup?: string // Current group (initially same as fetchedGroup)
  isFetched?: boolean // Whether parameter was fetched from raw data or is custom
  description?: string
  isFixed?: boolean
  isCustomParameter?: boolean
  parameterRef?: string
  color?: string
}

export interface ColumnGroup {
  category: string
  columns: ColumnDef[]
}

export interface DragItem {
  type: 'column' | 'parameter'
  data: ColumnDef
  sourceIndex: number
  sourceList: 'active' | 'available'
  sourceCategory?: string
}

export interface TableSettings {
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
  categoryFilters?: {
    selectedParentCategories: string[]
    selectedChildCategories: string[]
  }
}

export type SortBy = 'name' | 'category' | 'type' | 'fixed' | 'group'

export interface UseColumnsOptions {
  initialColumns: ColumnDef[]
  searchTerm?: Ref<string>
  isGrouped?: Ref<boolean>
  sortBy?: Ref<SortBy>
  selectedCategories?: Ref<string[]>
  onUpdate?: (columns: ColumnDef[]) => void
}

// Type guard for ColumnDef
export function isColumnDef(value: unknown): value is ColumnDef {
  if (!value || typeof value !== 'object') return false
  const col = value as Record<string, unknown>
  return (
    typeof col.field === 'string' &&
    typeof col.header === 'string' &&
    typeof col.type === 'string' &&
    typeof col.visible === 'boolean' &&
    typeof col.order === 'number' &&
    (col.source === undefined || typeof col.source === 'string') &&
    (col.fetchedGroup === undefined || typeof col.fetchedGroup === 'string') &&
    (col.currentGroup === undefined || typeof col.currentGroup === 'string') &&
    (col.isFetched === undefined || typeof col.isFetched === 'boolean')
  )
}
