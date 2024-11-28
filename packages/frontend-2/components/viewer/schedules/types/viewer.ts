import type { Ref } from 'vue'
import type { Viewer } from '@speckle/viewer'

export interface ViewerState {
  viewer: {
    instance: Viewer | null
    init: {
      ref: Ref<boolean>
      promise: Promise<void>
    }
    metadata: {
      worldTree: Ref<unknown>
    }
  }
  projectId?: {
    value: string
  }
}

export function isValidViewerState(state: ViewerState | null): state is ViewerState {
  return (
    !!state &&
    !!state.viewer &&
    !!state.viewer.init &&
    !!state.viewer.init.ref &&
    !!state.viewer.metadata &&
    !!state.viewer.metadata.worldTree
  )
}

// Viewer Tree Types
export interface ViewerTree {
  _root: {
    model?: {
      raw?: BIMNodeRaw
      children?: NodeModel[]
    }
    children?: TreeNode[]
    isRoot?: () => boolean
    hasChildren?: () => boolean
  }
  getRenderTree: () => unknown
  init?: {
    ref?: {
      value?: boolean
    }
  }
  metadata?: {
    worldTree?: {
      value?: ViewerTree
    }
  }
}
