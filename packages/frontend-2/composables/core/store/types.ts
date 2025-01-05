import type { TableColumn, ElementData } from '~/composables/core/types'

// Type guards for store state
export function isValidColumn(col: unknown): col is TableColumn {
  if (!col || typeof col !== 'object') return false
  const candidate = col as { id?: unknown }
  return typeof candidate.id === 'string'
}

export function isValidElement(el: unknown): el is ElementData {
  if (!el || typeof el !== 'object') return false
  const candidate = el as { id?: unknown }
  return typeof candidate.id === 'string'
}
