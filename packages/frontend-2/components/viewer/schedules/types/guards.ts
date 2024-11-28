import type { BIMNodeRaw, NodeModel, BIMNode, DeepBIMNode } from './bim'
import type { ScheduleTreeItemModel } from './explorer'

// Type guard for NodeModel
export function isValidNodeModel(value: unknown): value is NodeModel {
  if (!value || typeof value !== 'object') return false
  const model = value as Partial<NodeModel>
  return (
    typeof model === 'object' &&
    model !== null &&
    ('raw' in model || 'children' in model || 'id' in model)
  )
}

// Type guard for BIMNodeRaw
export function isValidBIMNodeRaw(value: unknown): value is BIMNodeRaw {
  if (!value || typeof value !== 'object') return false
  const node = value as Record<string, unknown>
  return typeof node.id === 'string'
}

// Type guard for BIMNode
export function isValidBIMNode(value: unknown): value is BIMNode {
  if (!value || typeof value !== 'object') return false
  const node = value as Partial<BIMNode>
  return (
    typeof node === 'object' &&
    node !== null &&
    'raw' in node &&
    isValidBIMNodeRaw(node.raw) &&
    (!node.children || Array.isArray(node.children))
  )
}

// Type guard for DeepBIMNode
export function isValidDeepBIMNode(value: unknown): value is DeepBIMNode {
  if (!value || typeof value !== 'object') return false
  const node = value as Record<string, unknown>
  return (
    'raw' in node ||
    'model' in node ||
    'children' in node ||
    'elements' in node ||
    'id' in node
  )
}

// Type guard for ScheduleTreeItemModel
export function isValidScheduleTreeItemModel(
  value: unknown
): value is ScheduleTreeItemModel {
  if (!value || typeof value !== 'object') return false
  const model = value as Partial<ScheduleTreeItemModel>
  return (
    typeof model === 'object' &&
    model !== null &&
    typeof model.id === 'string' &&
    typeof model.label === 'string' &&
    (!model.rawNode || isValidBIMNode(model.rawNode)) &&
    (!model.children || Array.isArray(model.children))
  )
}

// Type guard for array of DeepBIMNode
export function isValidDeepBIMNodeArray(value: unknown): value is DeepBIMNode[] {
  return Array.isArray(value) && value.every(isValidDeepBIMNode)
}

// Type guard for array of ScheduleTreeItemModel
export function isValidScheduleTreeItemModelArray(
  value: unknown
): value is ScheduleTreeItemModel[] {
  return Array.isArray(value) && value.every(isValidScheduleTreeItemModel)
}

// Type guard for array of BIMNode
export function isValidBIMNodeArray(value: unknown): value is BIMNode[] {
  return Array.isArray(value) && value.every(isValidBIMNode)
}

// Type guard for array of NodeModel
export function isValidNodeModelArray(value: unknown): value is NodeModel[] {
  return Array.isArray(value) && value.every(isValidNodeModel)
}
