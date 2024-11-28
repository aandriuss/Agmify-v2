import type { BIMNode } from '../bim'

export interface TreeItemComponentModel {
  id: string
  label: string
  children?: TreeItemComponentModel[]
  data?: unknown
  rawNode?: BIMNode
}
