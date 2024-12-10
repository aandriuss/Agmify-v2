import type {
  ViewerTree,
  BIMNode,
  NodeModel,
  TreeItemComponentModel
} from '~/composables/core/types'
import { isValidBIMNodeRaw, isValidBIMNodeData } from '~/composables/core/types/viewer'
import { debug, DebugCategories } from '../debug'

/**
 * Convert NodeModel to TreeItemComponentModel
 */
export function convertNodeModelToTreeItem(
  model: NodeModel
): TreeItemComponentModel | null {
  try {
    if (!model?.id || !model?.type || !model?.data) {
      debug.warn(
        DebugCategories.DATA_TRANSFORM,
        'Invalid node model: missing required properties'
      )
      return null
    }

    debug.startState(
      DebugCategories.DATA_TRANSFORM,
      'Converting node model to tree item',
      {
        id: model.id,
        type: model.type
      }
    )

    if (!isValidBIMNodeData(model.data)) {
      debug.warn(DebugCategories.DATA_TRANSFORM, 'Invalid node model: invalid data')
      return null
    }

    const bimNode: BIMNode = {
      id: model.id,
      type: model.type,
      value: null,
      data: model.data,
      children: []
    }

    const children: TreeItemComponentModel[] = []

    if (Array.isArray(model.children)) {
      model.children.forEach((child) => {
        if (child) {
          const childItem = convertNodeModelToTreeItem(child)
          if (childItem && childItem.rawNode) {
            children.push(childItem)
            bimNode.children.push({
              id: childItem.id,
              type: childItem.type,
              value: null,
              data: childItem.rawNode.data,
              children: childItem.rawNode.children
            })
          }
        }
      })
    }

    const result: TreeItemComponentModel = {
      id: model.id,
      name: model.type,
      type: model.type,
      data: model.data,
      children,
      rawNode: bimNode
    }

    debug.completeState(DebugCategories.DATA_TRANSFORM, 'Node model converted', {
      id: result.id,
      childCount: children.length
    })

    return result
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Failed to convert node model:', err)
    throw err instanceof Error ? err : new Error('Failed to convert node model')
  }
}

/**
 * Convert ViewerTree to TreeItemComponentModel
 */
export function convertViewerTreeToTreeItem(
  tree: ViewerTree
): TreeItemComponentModel | null {
  try {
    if (!tree?.id || !tree?.data) {
      debug.warn(
        DebugCategories.DATA_TRANSFORM,
        'Invalid viewer tree: missing required properties'
      )
      return null
    }

    debug.startState(
      DebugCategories.DATA_TRANSFORM,
      'Converting viewer tree to tree item'
    )

    if (!isValidBIMNodeRaw(tree.data)) {
      debug.warn(DebugCategories.DATA_TRANSFORM, 'Invalid viewer tree: invalid data')
      return null
    }

    const nodeModel: NodeModel = {
      id: tree.id,
      type: tree.data.type,
      data: {
        parameters: {},
        ...tree.data,
        id: tree.id,
        type: tree.data.type
      },
      children: Array.isArray(tree.children)
        ? tree.children.map((child) => ({
            id: child.id,
            type: child.data.type,
            data: {
              parameters: {},
              ...child.data,
              id: child.id,
              type: child.data.type
            },
            children: []
          }))
        : []
    }

    const result = convertNodeModelToTreeItem(nodeModel)
    if (!result) {
      debug.warn(DebugCategories.DATA_TRANSFORM, 'Failed to convert root model')
      return null
    }

    debug.completeState(DebugCategories.DATA_TRANSFORM, 'Viewer tree converted', {
      rootId: result.id,
      childCount: result.children?.length || 0
    })

    return result
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Failed to convert viewer tree:', err)
    throw err instanceof Error ? err : new Error('Failed to convert viewer tree')
  }
}
