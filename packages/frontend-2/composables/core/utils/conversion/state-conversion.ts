import type { TableState, FilterDef, BaseTableRow } from '~/composables/core/types'
import type { ComponentState } from '~/components/tables/DataTable/types'

/**
 * Convert component state to core table state
 */
export function toCoreState<T extends BaseTableRow>(
  state: Partial<ComponentState<T>>
): TableState<T> {
  return {
    columns: state.columns || [],
    detailColumns: state.detailColumns,
    expandedRows: new Set(state.expandedRows?.map((row) => row.id) || []),
    selectedRows: new Set(state.selectedRows?.map((row) => row.id) || []),
    sortField: state.sortField,
    sortOrder: state.sortOrder,
    filters: state.filters as Record<string, FilterDef> | undefined
  }
}

/**
 * Convert core table state to component state
 * Note: This requires the full row data as core state only stores IDs
 */
export function toComponentState<T extends BaseTableRow>(
  state: Partial<TableState<T>>,
  getRowById: (id: string) => T | undefined
): ComponentState<T> {
  const expandedIds = state.expandedRows ? Array.from(state.expandedRows) : []
  const selectedIds = state.selectedRows ? Array.from(state.selectedRows) : []

  return {
    columns: state.columns || [],
    detailColumns: state.detailColumns,
    expandedRows: expandedIds
      .map((id) => getRowById(id))
      .filter((row): row is T => row !== undefined),
    selectedRows: selectedIds
      .map((id) => getRowById(id))
      .filter((row): row is T => row !== undefined),
    sortField: state.sortField,
    sortOrder: state.sortOrder,
    filters: state.filters
  }
}

/**
 * Convert array of rows to Set of IDs
 */
export function toIdSet<T extends BaseTableRow>(rows: T[]): Set<string> {
  return new Set(rows.map((row) => row.id))
}

/**
 * Convert Set of IDs to array of rows
 */
export function toRowArray<T extends BaseTableRow>(
  ids: Set<string>,
  getRowById: (id: string) => T | undefined
): T[] {
  return Array.from(ids)
    .map((id) => getRowById(id))
    .filter((row): row is T => row !== undefined)
}
