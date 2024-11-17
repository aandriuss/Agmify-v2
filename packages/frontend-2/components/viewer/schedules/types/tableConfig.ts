import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'

export interface TableConfig {
  name: string
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
}

export function createTableConfig(
  name: string,
  parentColumns: ColumnDef[],
  childColumns: ColumnDef[]
): TableConfig {
  return {
    name,
    parentColumns,
    childColumns
  }
}
