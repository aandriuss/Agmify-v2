import type { Parameter } from '../parameters'
import type { BaseItem } from '../common/base-types'

/**
 * Available headers structure for parameter organization
 */
export interface AvailableHeaders {
  parent: Parameter[]
  child: Parameter[]
}

/**
 * Raw BIM node interface
 */
export interface BIMNodeRaw {
  id: string
  type: string
  [key: string]: unknown
}

/**
 * BIM node data interface
 */
export interface BIMNodeData {
  id: string
  type: string
  parameters: Record<string, unknown>
  metadata?: Record<string, unknown>
  [key: string]: unknown
}

/**
 * Viewer tree interface
 */
export interface ViewerTree {
  id: string
  children: ViewerTree[]
  data: BIMNodeRaw
}

/**
 * Tree node interface
 */
export interface TreeNode {
  id: string
  children: TreeNode[]
  data: BIMNodeRaw
  parent?: TreeNode
  level: number
}

/**
 * Deep BIM node interface
 */
export interface DeepBIMNode extends BIMNodeRaw {
  children: DeepBIMNode[]
}

/**
 * Node model interface
 */
export interface NodeModel {
  id: string
  type: string
  children: NodeModel[]
  data: BIMNodeData
}

/**
 * Processed header interface extending BaseItem
 */
export interface ProcessedHeader extends BaseItem {
  // BaseItem requirements
  id: string
  name: string
  field: string
  header: string
  visible: boolean
  removable: boolean
  order?: number
  category?: string
  description?: string

  // Additional ProcessedHeader properties
  type: string
  value: unknown
  source: string
  fetchedGroup: string
  currentGroup: string
  isFetched: boolean
  isCustom?: boolean
  isCustomParameter?: boolean
  parameterRef?: string

  // Index signature for additional properties
  [key: string]: unknown
}

/**
 * Processing state interface
 */
export interface ProcessingState {
  isProcessingElements: boolean
  processedCount: number
  totalCount: number
  error?: Error
}

/**
 * BIM node interface
 */
export interface BIMNode {
  id: string
  type: string
  value: BIMNodeValue
  children: BIMNode[]
  data: BIMNodeData
}

/**
 * BIM node value type
 */
export type BIMNodeValue = string | number | boolean | null | undefined

/**
 * Tree item component model interface
 */
export interface TreeItemComponentModel {
  id: string
  name: string
  type: string
  children: TreeItemComponentModel[]
  data: BIMNodeData
  rawNode?: BIMNode
}

/**
 * Schedule initialization instance interface
 */
export interface ScheduleInitializationInstance {
  init: () => Promise<void>
  update: (state: Record<string, unknown>) => Promise<void>
  cleanup: () => void
}

/**
 * Schedule tree item model interface
 */
export interface ScheduleTreeItemModel extends TreeItemComponentModel {
  id: string
  label: string
  rawNode: BIMNode
  children: ScheduleTreeItemModel[]
}

/**
 * Node conversion result interface
 */
export interface NodeConversionResult {
  node: ScheduleTreeItemModel
  children: ScheduleTreeItemModel[]
}

/**
 * Type guards
 */
export function isValidTreeItemComponentModel(
  value: unknown
): value is TreeItemComponentModel {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    'type' in value &&
    'children' in value &&
    'data' in value &&
    Array.isArray((value as TreeItemComponentModel).children)
  )
}

export function isValidViewerTree(value: unknown): value is ViewerTree {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'children' in value &&
    'data' in value &&
    Array.isArray((value as ViewerTree).children)
  )
}

export function isValidBIMNodeRaw(value: unknown): value is BIMNodeRaw {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'type' in value &&
    typeof (value as BIMNodeRaw).id === 'string' &&
    typeof (value as BIMNodeRaw).type === 'string'
  )
}

export function isValidBIMNodeData(value: unknown): value is BIMNodeData {
  if (!value || typeof value !== 'object') return false
  const data = value as BIMNodeData
  return (
    typeof data.id === 'string' &&
    typeof data.type === 'string' &&
    typeof data.parameters === 'object' &&
    data.parameters !== null
  )
}

export function isValidBIMNodeValue(value: unknown): value is BIMNodeValue {
  return (
    value === null ||
    value === undefined ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  )
}

export function isValidProcessedHeader(value: unknown): value is ProcessedHeader {
  if (!value || typeof value !== 'object') return false

  const header = value as ProcessedHeader
  return (
    // BaseItem properties
    typeof header.id === 'string' &&
    typeof header.name === 'string' &&
    typeof header.field === 'string' &&
    typeof header.header === 'string' &&
    typeof header.visible === 'boolean' &&
    typeof header.removable === 'boolean' &&
    // ProcessedHeader properties
    typeof header.type === 'string' &&
    'value' in header &&
    typeof header.source === 'string' &&
    typeof header.fetchedGroup === 'string' &&
    typeof header.currentGroup === 'string' &&
    typeof header.isFetched === 'boolean'
  )
}
