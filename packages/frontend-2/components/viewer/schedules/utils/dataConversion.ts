import type { TreeItemComponentModel, ElementData, BIMNode } from '../types'

function extractElementData(node: BIMNode): ElementData {
  const raw = node.raw
  const identityData = raw['Identity Data'] || {}
  const constraints = raw.Constraints || {}
  const dimensions = raw.Dimensions || {}
  const other = raw.Other || {}

  return {
    id: raw.id,
    mark: raw.Mark || raw.mark || identityData.Mark || '',
    category: other.Category || raw.type || '',
    type: raw.speckle_type,
    name: raw.Name,
    host: constraints.Host,
    length: dimensions.length,
    height: dimensions.height,
    width: dimensions.width,
    thickness: dimensions.thickness,
    area: dimensions.area,
    parameters: {},
    _visible: true
  }
}

export function convertTreeItemToElementData(
  treeItem: TreeItemComponentModel
): ElementData {
  const elementData = extractElementData(treeItem.rawNode)

  if (treeItem.children?.length) {
    elementData.details = treeItem.children.map(convertTreeItemToElementData)
  }

  return elementData
}

export function convertTreeItemsToElementData(
  treeItems: TreeItemComponentModel[]
): ElementData[] {
  return treeItems.map(convertTreeItemToElementData)
}
