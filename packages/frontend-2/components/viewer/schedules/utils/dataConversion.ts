import type {
  TreeItemComponentModel,
  ElementData,
  BIMNode,
  ParameterValue,
  BIMNodeRaw
} from '../types'
import { debug, DebugCategories } from './debug'
import { isValidBIMNodeRaw } from '../types'

export function convertToString(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>
    if ('id' in obj && obj.id) return String(obj.id)
    if ('Mark' in obj && obj.Mark) return String(obj.Mark)
    if ('Tag' in obj && obj.Tag) return String(obj.Tag)
  }
  return ''
}

function isValidBIMNode(node: unknown): node is BIMNode {
  if (!node || typeof node !== 'object') return false
  const bimNode = node as { raw?: unknown }
  return bimNode.raw !== undefined && isValidBIMNodeRaw(bimNode.raw)
}

function isValidTreeItem(item: unknown): item is TreeItemComponentModel {
  if (!item || typeof item !== 'object') return false
  const treeItem = item as { rawNode?: unknown; children?: unknown[] }
  return (
    isValidBIMNode(treeItem.rawNode) &&
    (treeItem.children === undefined ||
      (Array.isArray(treeItem.children) &&
        treeItem.children.every((child) => isValidTreeItem(child))))
  )
}

function extractParameters(raw: BIMNodeRaw): Record<string, ParameterValue> {
  const parameters: Record<string, ParameterValue> = {}

  // Helper to safely convert values
  const convertValue = (value: unknown): ParameterValue => {
    if (value === null) return null
    if (typeof value === 'string') return value
    if (typeof value === 'number') return value
    if (typeof value === 'boolean') return value
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
  }

  // Process each property
  Object.entries(raw).forEach(([key, value]) => {
    if (key !== '_raw' && value !== undefined) {
      parameters[key] = convertValue(value)
    }
  })

  return parameters
}

function extractElementData(node: BIMNode): ElementData {
  if (!isValidBIMNodeRaw(node.raw)) {
    throw new Error('Invalid BIM node data')
  }

  const raw = node.raw
  const constraints = raw.Constraints || {}
  const other = raw.Other || {}

  // Extract all parameters
  const parameters = extractParameters(raw)

  // Extract essential fields
  return {
    id: convertToString(raw.id),
    mark: convertToString(raw.Mark || raw.mark || ''),
    category: convertToString(other.Category || raw.type),
    type: convertToString(raw.speckleType),
    name: convertToString(raw.Name),
    host: convertToString(constraints.Host),
    parameters,
    _visible: true
  }
}

export function convertTreeItemToElementData(
  treeItem: TreeItemComponentModel
): ElementData {
  if (!isValidTreeItem(treeItem)) {
    throw new Error('Invalid tree item data')
  }

  debug.log(DebugCategories.DATA, 'Converting tree item to element data', {
    nodeId: convertToString(treeItem.rawNode.raw.id),
    nodeType: convertToString(treeItem.rawNode.raw.type),
    childCount: treeItem.children?.length || 0
  })

  const elementData = extractElementData(treeItem.rawNode)

  if (treeItem.children?.length) {
    elementData.details = treeItem.children.map(convertTreeItemToElementData)
  }

  return elementData
}

export function convertTreeItemsToElementData(
  treeItems: TreeItemComponentModel[]
): ElementData[] {
  if (!Array.isArray(treeItems) || !treeItems.every(isValidTreeItem)) {
    throw new Error('Invalid tree items data')
  }

  debug.log(DebugCategories.DATA, 'Converting tree items to element data', {
    itemCount: treeItems.length
  })

  return treeItems.map(convertTreeItemToElementData)
}
