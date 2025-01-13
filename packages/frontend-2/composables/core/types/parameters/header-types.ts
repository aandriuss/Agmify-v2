import type { BimValueType } from './value-types'
import type { Group } from '../../types'

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
  group: Group
  source: string
  description?: string
  metadata?: Record<string, unknown>
  isFetched?: boolean
  order?: number
  removable?: boolean
  visible?: boolean
}
