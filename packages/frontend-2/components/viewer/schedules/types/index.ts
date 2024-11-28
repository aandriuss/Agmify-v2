// Main types barrel file - exports everything
import type {
  ElementData,
  Parameters,
  RawElementData,
  ElementsDataReturn,
  ElementsProcessingState
} from './elements'
import type {
  ParameterValue,
  ParameterValueState,
  ParameterType,
  ProcessedHeader
} from './parameters'
import type { ViewerState, ViewerTree } from './viewer'
import type { Store, StoreState } from './store'
import type { TableConfig, TableRow, TableUpdatePayload } from './table'
import type {
  BIMNode,
  BIMNodeRaw,
  WorldTreeNode,
  NodeModel,
  TreeNode,
  DeepBIMNode
} from './bim'
import type { ValidationError } from './definitions'
import type { TreeItemComponentModel } from '~~/lib/viewer/helpers/sceneExplorer'
import type { ScheduleTreeItemModel, NodeConversionResult } from './explorer'

export type {
  // Elements
  ElementData,
  Parameters,
  RawElementData,
  ElementsDataReturn,
  ElementsProcessingState,

  // Parameters
  ParameterValue,
  ParameterValueState,
  ParameterType,
  ProcessedHeader,

  // Viewer
  ViewerState,
  ViewerTree,
  TreeItemComponentModel,

  // Store
  Store,
  StoreState,

  // Table
  TableConfig,
  TableRow,
  TableUpdatePayload,

  // BIM
  BIMNode,
  BIMNodeRaw,
  WorldTreeNode,
  NodeModel,
  TreeNode,
  DeepBIMNode,

  // Explorer
  ScheduleTreeItemModel,
  NodeConversionResult,

  // Definitions
  ValidationError
}

export * from './elements'
export * from './parameters'
export * from './viewer'
export * from './store'
export * from './table'
export * from './bim'
export * from './components'
export * from './definitions'
export * from './viewer/components'
export * from './explorer'
export * from './guards'
