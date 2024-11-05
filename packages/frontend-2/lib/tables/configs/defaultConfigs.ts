import type { TableTypeSettings } from '../types'

export const defaultViewerColumns = [
  { field: 'category', header: 'Category', visible: true, removable: false, order: 0 },
  { field: 'id', header: 'ID', visible: true, removable: true, order: 1 },
  { field: 'mark', header: 'Mark', visible: true, removable: true, order: 2 },
  { field: 'host', header: 'Host', visible: true, removable: true, order: 3 },
  { field: 'comment', header: 'Comment', visible: true, removable: true, order: 4 }
]

export const defaultTableTypes: Record<string, TableTypeSettings> = {
  viewer: {
    type: 'viewer',
    availableColumns: [], // This will be populated dynamically from parameter definitions
    defaultColumns: defaultViewerColumns,
    categoryFilters: {
      selectedParentCategories: [],
      selectedChildCategories: []
    }
  },
  schedule: {
    type: 'schedule',
    availableColumns: [], // This will be populated dynamically
    defaultColumns: defaultViewerColumns,
    categoryFilters: {
      selectedParentCategories: [],
      selectedChildCategories: []
    }
  }
}
