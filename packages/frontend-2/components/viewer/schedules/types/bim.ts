// import type { ViewerBase } from './viewer'

// The raw data we get from Speckle
export interface BIMNodeRaw {
  id: string
  speckleType?: string
  type?: string
  Mark?: string
  parameters?: Record<string, unknown>
  Other?: {
    Category?: string
    Type?: string
    Family?: string
    [key: string]: unknown
  }
  Constraints?: {
    Host?: string
    [key: string]: unknown
  }
  Identity_Data?: {
    Category?: string
    Mark?: string
    [key: string]: unknown
  }
  elements?: Array<{
    expressID: number
    fileId: string
    id: string
    type: string
    parseTime: string
    speckle_type: string
    totalChildrenCount: number
    __closure: Record<string, number>
  }>
  expressID?: number
  fileId?: string
  parseTime?: string
  totalChildrenCount?: number
  __closure?: Record<string, number>
  [key: string]: unknown
}

export interface BIMNode {
  raw: BIMNodeRaw
  children?: BIMNode[]
}

// For traversing the Speckle tree structure
export interface NodeModel {
  raw?: BIMNodeRaw
  children?: NodeModel[]
  atomic?: boolean
  id?: string
  speckle_type?: string
  type?: string
}

export interface TreeNode {
  model?: NodeModel
  children?: TreeNode[]
}

// Extended node type for deep traversal
export interface DeepBIMNode {
  raw?: BIMNodeRaw
  model?: NodeModel
  children?: DeepBIMNode[]
  elements?: DeepBIMNode[]
  id?: string
  atomic?: boolean
  speckle_type?: string
  type?: string
}

// // BIM-specific viewer tree that extends ViewerBase
// export interface BIMViewerTree extends ViewerBase {
//   _root: {
//     model: {
//       raw: BIMNodeRaw
//       children: NodeModel[]
//     }
//     children: TreeNode[]
//     isRoot: () => boolean
//     hasChildren: () => boolean
//   }
//   getRenderTree: () => unknown
//   init: {
//     ref: {
//       value: boolean
//     }
//   }
//   metadata: {
//     worldTree: {
//       value: BIMViewerTree
//     }
//   }
// }

// Type guard functions
export function isBIMNodeRaw(node: unknown): node is BIMNodeRaw {
  if (!node || typeof node !== 'object') return false
  const rawNode = node as BIMNodeRaw
  return typeof rawNode.id === 'string'
}

export function isBIMNode(node: unknown): node is BIMNode {
  if (!node || typeof node !== 'object') return false
  const bimNode = node as BIMNode
  return isBIMNodeRaw(bimNode.raw)
}

export function isNodeModel(node: unknown): node is NodeModel {
  if (!node || typeof node !== 'object') return false
  const model = node as NodeModel
  return !model.raw || isBIMNodeRaw(model.raw)
}

export function isTreeNode(node: unknown): node is TreeNode {
  if (!node || typeof node !== 'object') return false
  const treeNode = node as TreeNode
  return !treeNode.model || isNodeModel(treeNode.model)
}

export function isDeepBIMNode(node: unknown): node is DeepBIMNode {
  if (!node || typeof node !== 'object') return false
  const deepNode = node as DeepBIMNode
  return (
    (!deepNode.raw || isBIMNodeRaw(deepNode.raw)) &&
    (!deepNode.model || isNodeModel(deepNode.model))
  )
}

// export function isBIMViewerTree(tree: unknown): tree is BIMViewerTree {
//   if (!tree || typeof tree !== 'object') return false
//   const bimTree = tree as BIMViewerTree
//   return (
//     '_root' in bimTree &&
//     !!bimTree._root &&
//     'model' in bimTree._root &&
//     !!bimTree._root.model &&
//     'raw' in bimTree._root.model &&
//     isBIMNodeRaw(bimTree._root.model.raw)
//   )
// }

export interface WorldTreeNode {
  _root: {
    model?: {
      raw?: BIMNodeRaw
      children?: NodeModel[]
    }
    children?: TreeNode[]
    isRoot?: () => boolean
    hasChildren?: () => boolean
  }
}
