import type { BaseTableRow } from '../../tables/DataTable/types'

export interface ScheduleRow extends BaseTableRow {
  name: string
  category?: string
  sourceValue?: unknown
  equation?: string
  kind?: string
}
