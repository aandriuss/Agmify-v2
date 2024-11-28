import type { TreeItemComponentModel } from '~~/lib/viewer/helpers/sceneExplorer'
import type { BIMNode } from './bim'

// Extended tree item model that includes our BIM structure
export interface ScheduleTreeItemModel extends TreeItemComponentModel {
  id: string
  label: string
  rawNode?: BIMNode
  children?: ScheduleTreeItemModel[]
}

// Helper type for node conversion
export interface NodeConversionResult {
  node: ScheduleTreeItemModel
  children: ScheduleTreeItemModel[]
}

// Type guard for ScheduleTreeItemModel
export function isScheduleTreeItemModel(
  value: unknown
): value is ScheduleTreeItemModel {
  if (!value || typeof value !== 'object') return false
  const node = value as Partial<ScheduleTreeItemModel>
  return typeof node.id === 'string' && typeof node.label === 'string'
}
