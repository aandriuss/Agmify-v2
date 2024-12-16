export interface ViewerNodeRaw {
  id?: string
  type?: string
  Other?: {
    Category?: string
  }
  'Identity Data'?: {
    Mark?: string
  }
  Name?: string
  speckleType?: string
  parameters?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export interface ViewerNode {
  id: string
  model: {
    id?: string
    type?: string
    raw?: ViewerNodeRaw
  }
  children?: ViewerNode[]
}

export interface WorldTreeRoot {
  _root: {
    children: ViewerNode[]
  }
}
