// Re-export all types from their respective modules

// Common types
export type { BaseItem, BaseBimItem, BaseUserItem, BaseItemType } from './common'

// Data types
export type {
  TableRow,
  ElementsProcessingState,
  ElementsDataReturn,
  ProcessedData,
  DisplayData,
  DataState,
  ProcessingState,
  ParameterValuesRecord
} from './data'

// Element types
export type {
  ElementData,
  ViewerTableRow,
  ElementGroup,
  ElementState
} from './elements'

export {
  createElementData,
  toViewerTableRow,
  isElementData
} from './elements/elements-base'

// Error types
export * from './errors'

// Events
export type {
  BaseEventPayloads,
  ColumnEventPayloads,
  RowEventPayloads,
  DataEventPayloads,
  EventEmits,
  EventHandler,
  EventHandlerProps,
  TableEventPayloads,
  ParameterEventPayloads,
  ScheduleEventPayloads,
  TableEmits,
  ParameterEmits,
  ScheduleEmits,
  TableEventHandler,
  ParameterEventHandler,
  ScheduleEventHandler
} from './events'

// GraphQL types
export type {
  GetParametersQueryResponse,
  ParameterMutationResponse,
  CreateParameterResponse,
  UpdateParameterResponse,
  DeleteParameterResponse,
  AddParameterToTableResponse,
  RemoveParameterFromTableResponse
} from './graphql'

// Mappings
export type { ParameterMappings, ParameterTableMapping } from './mappings'

// Parameter System Types
export type {
  // Parameters and Collections
  RawParameter,
  AvailableBimParameter,
  AvailableUserParameter,
  AvailableParameter,

  // Value Types
  PrimitiveValue,
  BimValueType,
  UserValueType,
  EquationValue,
  ParameterValue,
  ValidationRules,
  ValidationResult,
  ParameterMetadata,
  Group,
  ElementParameter
} from './parameters'

// Parameter System Functions
export {
  // Constants
  PARAMETER_SETTINGS,

  // Type Guards
  isRawParameter,
  isAvailableBimParameter,
  isAvailableUserParameter,

  // Parameter Creation
  createAvailableBimParameter,
  createAvailableUserParameter,

  // Parameter Operations
  convertBimToUserType,
  isEquationValue,
  isPrimitiveValue,
  createElementParameter,
  isElementParameter
} from './parameters'

// Settings types
export type {
  // Settings Types
  UserSettings,
  SettingsState,
  SettingsUpdatePayload
} from './settings'

// Export settings constants and helpers
export {
  DEFAULT_SETTINGS,
  ensureRequiredSettings,
  getSettingsValue,
  isUserSettings,
  isSettingsUpdatePayload
} from './settings'

// Store types
export type {
  // Parameter Store State Types
  ParameterStoreState,
  ParameterStoreMutations,
  ParameterStoreGetters,
  ParameterStore,

  // Store State Types
  TableInfo,
  TableHeaders,
  TableInfoUpdatePayload,
  ViewerState,
  StoreState,
  StoreMutations,
  StoreLifecycle,
  Store
} from './store'

// Store utilities and functions
export {
  // State Factory
  createDefaultParameterStoreState
} from './store'

// Table types
export type {
  // Base Table Types
  BaseTableRow,
  TableColumn,
  TableCategoryFilters,
  BaseTableConfig,

  // Table Events
  ColumnVisibilityPayload,
  ColumnReorderPayload,
  ColumnResizePayload,
  TableUpdatePayload,
  ErrorPayload,
  FilterDef,
  ExpandableTableRow,
  TableSort,
  TableFilter
} from './tables'

export { createTableColumns, createTableColumn } from './tables'
// Table Functions
export { createTableConfig } from '../tables/utils/'

// Validators
export {
  ValidationError,
  isValidTreeItemComponentModel,
  isValidViewerTree,
  isValidArray,
  isValidBIMNodeRaw,
  isValidBIMNodeValue,
  isValidProcessedHeader,
  isValidElementData,
  validateWorldTreeStructure,
  validateElementDataArray
} from './validators'

// Viewer types
export type {
  AvailableHeaders,
  BIMNodeRaw,
  BIMNodeData,
  ViewerTree,
  TreeNode,
  DeepBIMNode,
  NodeModel,
  ProcessedHeader,
  BIMNode,
  BIMNodeValue,
  TreeItemComponentModel,
  ScheduleInitializationInstance,
  ScheduleTreeItemModel,
  NodeConversionResult,
  ViewerNode,
  WorldTreeRoot,
  ViewerNodeRaw
} from './viewer'

export type { TableSettings, TableStoreState, TableStore } from '../tables/store/types'

export type { ElementMetadata, DebugPanelProps } from './debug-panel'

// will fix later

export type {
  ComponentState,
  TableProps,
  ColumnManagerProps,
  TableWrapperProps
} from '~/components/tables/DataTable/types'

export { isBaseTableRow } from '~/components/tables/DataTable/types'
