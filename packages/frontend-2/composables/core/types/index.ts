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
  DataState
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
  ColumnUpdateEvent,
  ColumnReorderEvent,
  SortEvent,
  FilterEvent,
  TableEventPayloads,
  ColumnResizeEvent,
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
  // Parameter Types
  BimGQLParameter,
  UserGQLParameter,
  GQLParameter,

  // Input Types
  CreateBimGQLInput,
  CreateUserGQLInput,
  UpdateBimGQLInput,
  UpdateUserGQLInput,

  // Response Types
  ParametersQueryResponse,
  GetParametersQueryResponse,
  ParameterMutationResponse,
  CreateParameterResponse,
  SingleParameterResponse,
  UpdateParameterResponse,
  DeleteParameterResponse,
  ParametersOperationResponse,

  // Table Types
  TableResponse,
  CreateNamedTableInput,
  UpdateNamedTableInput,
  TablesQueryResponse,
  TablesMutationResponse,
  AddParameterToTableResponse,
  RemoveParameterFromTableResponse
} from './graphql'

// Mappings
export type { ParameterMappings, ParameterTableMapping } from './mappings'

// Parameter System Types
export type {
  // Constants
  PARAMETER_SETTINGS,

  // Discovery Types
  BaseParameterDiscoveryOptions,
  DiscoveryProgressEvent,
  BaseParameterDiscoveryState,
  ParameterDiscoveryEvents,
  ParameterExtractionUtils,
  ParameterDiscoveryImplementation,

  // need to revise duplicates with viewer
  // ProcessedHeader,

  // Parameters, Collections and State
  ParameterValueState,
  Parameters,
  BaseParameter,
  BimParameter,
  UserParameter,
  Parameter,
  ParameterCollection,
  ParameterState,
  CreateParameterInput,
  EvaluatedBimParameter,
  EvaluatedUserParameter,
  EvaluatedParameter,

  // Value Types
  PrimitiveValue,
  BimValueType,
  UserValueType,
  EquationValue,
  ParameterValue,
  ValidationRules,
  ValidationResult,
  ParameterValueType // backward compatibility
} from './parameters'

// Parameter System Functions
export {
  // Type Guards
  isBimParameter,
  isUserParameter,
  isEquationValue,
  isPrimitiveValue,

  // Parameter Creation
  createBimParameter,
  createUserParameter,
  createParameterValueState,

  // Parameter Operations
  getParameterGroup,
  convertBimToUserType
} from './parameters'

export { createUserParameterWithDefaults } from './parameters'

// Settings types
export type {
  UserSettings,
  SettingsState,
  SettingsUpdatePayload,
  NewCustomParameter
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
  // Parameter Store Types
  StoreParameterValueState,
  StoreBimParameter,
  StoreUserParameter,
  StoreParameterValue,
  BaseStoreParameterDefinition,
  StoreBimParameterDefinition,
  StoreUserParameterDefinition,
  StoreParameterDefinition,

  // Store State Types
  RawParameterValue,
  RawParameterDefinition,
  TableInfo,
  TableInfoUpdatePayload,
  ViewerState,
  StoreState,
  StoreMutations,
  StoreLifecycle,
  Store
} from './store'

// Store utilities
export {
  convertToStoreParameterValue,
  convertToStoreParameterDefinition,
  convertParameterMap,
  convertDefinitionMap,
  isStoreParameterValue,
  isStoreParameterDefinition
} from './store'

// Table types
export type {
  // Base Table Types
  BaseTableRow,

  // Category Types
  CategoryTableRow,

  // Column Conversion Types
  ColumnConversionOptions,

  // Column Management Types
  ManagedColumnProps,
  ManagedBimColumnDef,
  ManagedUserColumnDef,
  ManagedColumnDef,
  ColumnManagementState,
  ColumnManagementOptions,

  // Column Types
  BaseColumnDef,
  BimColumnDef,
  UserColumnDef,
  ColumnDef,

  // DataTable Types
  DataTableColumnReorderEvent,
  DataTableColumnResizeEvent,

  // Event Types
  TableEvents,
  ParameterEvents,
  ScheduleEvents,
  BimTableEvents,
  UserTableEvents,
  CombinedTableEvents,
  BaseTableProps,
  TableState,
  BimTableProps,
  UserTableProps,
  CombinedTableProps,
  EmitsToProps,

  // Filter Types
  DataTableFilterMeta,
  DataTableFilterMetaData,
  DataTableOperatorFilterMetaData,
  DataTableFilterEvent,
  FilterEventPayload,

  // Initialization Types
  TableInitializationState,
  TableInitializationInstance,
  TableInitializationOptions,
  TableRowData,
  TableEventHandlers,
  TableEventEmits,

  // Instance Types
  TableInstanceState,
  TableTypeSettings,
  TableRegistry,
  TableUpdateOperationPayloads,
  TableUpdateOperation,
  TableUIState,

  // Parameter Table Types
  TableParameter,
  TableBimParameter,
  TableUserParameter,
  ParameterTableConfig,
  ParameterTableState,

  // Schedule Types
  ScheduleRow,

  // Settings Types
  TableSettings,
  NamedTableConfig,

  // Sorting Types
  SortByField,
  SortDirection,
  SortBy,
  UseColumnsOptions,
  CategoryFilters,

  // State Types
  FilterDef,
  TableStateOptions,
  CoreTableState,
  NamedTableStateOptions,
  NamedTableState,
  DataTableStateOptions,
  DataTableState,
  TableConfig
} from './tables'

export { createBimColumnDefWithDefaults, toTableParameters } from './tables'

// Table Functions
export { createTableConfig } from '../tables/utils/'
export { createColumnDef } from '~/composables/parameters/'

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
  ProcessingState,
  BIMNode,
  BIMNodeValue,
  TreeItemComponentModel,
  ScheduleInitializationInstance,
  ScheduleTreeItemModel,
  NodeConversionResult
} from './viewer'
