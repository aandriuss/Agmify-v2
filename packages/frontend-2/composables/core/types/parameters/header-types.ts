import type { BimValueType } from './value-types'

/**
 * Processed header from raw data
 */
export interface ProcessedHeader {
  id: string
  name: string
  field: string
  header: string
  type: BimValueType
  category: string
  source: string
  description?: string
  metadata?: Record<string, unknown>
  isFetched?: boolean
  fetchedGroup?: string
  currentGroup?: string
  order?: number
  removable?: boolean
  visible?: boolean
}
