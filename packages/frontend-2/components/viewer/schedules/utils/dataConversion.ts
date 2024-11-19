import type {
  TreeItemComponentModel,
  ElementData,
  BIMNode,
  ParameterValue
} from '../types'
import { debug, DebugCategories } from './debug'

export function convertToString(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (typeof value === 'object') {
    if ('id' in value && value.id) return String(value.id)
    if ('Mark' in value && value.Mark) return String(value.Mark)
    if ('Tag' in value && value.Tag) return String(value.Tag)
  }
  return ''
}

function extractParameters(
  raw: Record<string, unknown>
): Record<string, ParameterValue> {
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
  const raw = node.raw
  const identityData = raw['Identity Data'] || {}
  const constraints = raw.Constraints || {}
  const dimensions = raw.Other || {}
  const other = raw.Other || {}

  // Extract all parameters
  const parameters = extractParameters({
    ...raw,
    ...identityData,
    ...constraints,
    ...dimensions,
    ...other
  })

  // Ensure all values are properly converted to their expected types
  return {
    id: convertToString(raw.id),
    mark: convertToString(raw.Mark || raw.mark || identityData.Mark),
    category: convertToString(other.Category || raw.type),
    type: convertToString(raw.speckleType),
    name: convertToString(raw.Name),
    host: convertToString(constraints.Host),
    length: typeof dimensions.length === 'number' ? dimensions.length : undefined,
    height: typeof dimensions.height === 'number' ? dimensions.height : undefined,
    width: typeof dimensions.width === 'number' ? dimensions.width : undefined,
    thickness:
      typeof dimensions.thickness === 'number' ? dimensions.thickness : undefined,
    area: typeof dimensions.area === 'number' ? dimensions.area : undefined,
    parameters, // Store all parameters
    _visible: true
  }
}

export function convertTreeItemToElementData(
  treeItem: TreeItemComponentModel
): ElementData {
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
  debug.log(DebugCategories.DATA, 'Converting tree items to element data', {
    itemCount: treeItems.length
  })

  return treeItems.map(convertTreeItemToElementData)
}
