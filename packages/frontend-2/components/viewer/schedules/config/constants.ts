export const DEFAULT_TABLE_ID = '4b2b04b4-4b19-4bd5-b1d2-6d82266ee1d2'
export const DEFAULT_TABLE_NAME = 'Default Schedule'

// Table refresh interval in milliseconds
export const TABLE_REFRESH_INTERVAL = 1000

// Maximum number of items to show in category lists
export const MAX_CATEGORY_ITEMS = 200

// Default column settings
export const DEFAULT_COLUMN_SETTINGS = {
  removable: true,
  visible: true,
  sortable: true
}

// Parameter types
export const PARAMETER_TYPES = {
  STRING: 'string',
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  EQUATION: 'equation'
} as const

// Category settings
export const CATEGORY_SETTINGS = {
  maxHeight: '200px',
  defaultCategory: 'Parameters',
  uncategorizedLabel: 'Uncategorized'
} as const
