import type { UnifiedParameter } from '../parameters'

/**
 * Available headers structure for parameter organization
 */
export interface AvailableHeaders {
  parent: UnifiedParameter[]
  child: UnifiedParameter[]
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
  [key: string]: unknown
}

/**
 * Processed header interface
 */
export interface ProcessedHeader {
  id: string
  name: string
  type: string
  value: unknown
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
  data: Record<string, unknown>
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
  rawNode?: BIMNode
  children: ScheduleTreeItemModel[]
}

/**
 * Node conversion result interface
 */
export interface NodeConversionResult {
  node: ScheduleTreeItemModel
  children: ScheduleTreeItemModel[]
}
