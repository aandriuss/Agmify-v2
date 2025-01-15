import type { ParameterValue } from '../parameters'

/**
 * Base interface for table rows that can be categorized
 */
export interface CategoryTableRow {
  id: string
  field: string
  header: string
  removable: boolean
  parameters: Record<string, ParameterValue>
}

/**
 * Type guard for CategoryTableRow
 */
export const isCategoryTableRow = (row: unknown): row is CategoryTableRow => {
  if (!row || typeof row !== 'object') return false
  const r = row as Partial<CategoryTableRow>
  return (
    typeof r.id === 'string' &&
    typeof r.field === 'string' &&
    typeof r.header === 'string' &&
    typeof r.removable === 'boolean' &&
    typeof r.parameters === 'object'
  )
}
