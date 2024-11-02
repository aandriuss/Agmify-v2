export interface ColumnDef {
  field: string
  header: string
  visible: boolean
  removable?: boolean
  width?: number
  order: number
  headerComponent?: any
  isFixed?: boolean
}

export interface ParameterDefinition {
  field: string
  header: string
  type?: string
  description?: string
  category?: string
  isFixed?: boolean
  order?: number
  visible?: boolean
}

export interface ParameterGroup {
  category: string
  parameters: ParameterDefinition[]
}

export interface TableState {
  columns: ColumnDef[]
  expandedRows: any[]
  sortField?: string
  sortOrder?: number
  filters?: Record<string, any>
}

export interface ColumnUpdateEvent {
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
}

export interface ColumnResizeEvent {
  element: HTMLElement
  delta: number
}

export interface ColumnReorderEvent {
  dragIndex: number
  dropIndex: number
  target: HTMLElement
}
