import type { ParameterValue } from '../parameters'

/**
 * Base element data interface
 */
export interface ElementData {
  id: string
  name?: string
  type: string // Required for element identification
  mark?: string
  category?: string
  parameters: Record<string, ParameterValue>
  metadata?: Record<string, unknown>
  details?: ElementData[]
  _visible?: boolean
  host?: string
  _raw?: unknown
  isChild?: boolean
}

/**
 * Element group interface
 */
export interface ElementGroup {
  id: string
  name: string
  elements: ElementData[]
  metadata?: Record<string, unknown>
}

/**
 * Element state interface
 */
export interface ElementState {
  elements: Map<string, ElementData>
  groups: Map<string, ElementGroup>
  loading: boolean
  error: Error | null
}
