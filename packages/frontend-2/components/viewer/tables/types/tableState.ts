// tableState.ts
export interface NamedTableConfig {
  id: string
  name: string
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
  categoryFilters: {
    selectedParentCategories: string[]
    selectedChildCategories: string[]
  }
}

export interface TableState {
  namedTables: Record<string, NamedTableConfig>
  activeTableId: string | null
  currentView: 'parent' | 'child'
  isDirty: boolean
}
