// Re-export all types from their respective modules

// Error types
export * from './errors'

// Parameter System Types
export type {
  // Value Types
  PrimitiveValue,
  ParameterValueType,
  UserValueType,
  EquationValue,
  ParameterValue,
  ValidationRules,
  ValidationResult,

  // Parameter Types
  BaseParameter,
  BimParameter,
  UserParameter,
  Parameter,
  BimValueType,

  // Collections and State
  ParameterCollection,
  ParameterState,
  EvaluatedParameter,
  CreateParameterInput,
  ParameterValueState
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
  convertBimToUserType,
  PARAMETER_SETTINGS
} from './parameters'

// Element types
export type {
  ElementState,
  ElementGroup,
  ElementData,
  ViewerTableRow
} from './elements'

export { createElementData, toViewerTableRow, isElementData } from './elements'

// GraphQL types
export type {
  // Parameter Types
  GQLParameter,
  BimGQLParameter,
  UserGQLParameter,

  // Input Types
  CreateBimGQLInput,
  CreateUserGQLInput,
  UpdateBimGQLInput,
  UpdateUserGQLInput,

  // Response Types
  ParametersQueryResponse,
  GetParametersQueryResponse,
  SingleParameterResponse,
  ParametersOperationResponse,
  CreateParameterResponse,
  UpdateParameterResponse,
  DeleteParameterResponse,

  // Table Types
  TableResponse,
  CreateNamedTableInput,
  UpdateNamedTableInput,
  TablesQueryResponse,
  TablesMutationResponse,
  AddParameterToTableResponse,
  RemoveParameterFromTableResponse
} from './graphql'

// Table types
export type {
  ColumnDef,
  TableConfig,
  NamedTableConfig,
  TableState,
  TableInstanceState,
  TableRegistry,
  TableTypeSettings,
  TableUpdateOperation,
  TableUpdateOperationPayloads,
  TablesState,
  CategoryFilters,
  SortBy,
  SortByField,
  SortDirection,
  UseColumnsOptions,
  TableSettings,
  TableStateOptions,
  CoreTableState,
  NamedTableStateOptions,
  NamedTableState,
  FilterDef,
  DataTableState,
  DataTableStateOptions
} from './tables'

// Table Functions
export { createTableConfig } from '../tables/utils/'
export { createColumnDef } from '~/composables/parameters/'

// Data types
export type {
  TableRow,
  ElementsProcessingState,
  ElementsDataReturn,
  ProcessedData,
  DisplayData,
  DataState
} from './data'

// Store types
export type {
  ViewerState,
  StoreState,
  StoreMutations,
  StoreLifecycle,
  Store,
  StoreParameterValue,
  StoreParameterDefinition,
  TableInfo,
  TableInfoUpdatePayload,
  RawParameterValue,
  RawParameterDefinition
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

// Viewer types
export type {
  TreeItemComponentModel,
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
  ScheduleInitializationInstance,
  AvailableHeaders,
  ScheduleTreeItemModel
} from './viewer'

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

// Mappings
export type { ParameterMappings, ParameterTableMapping } from './mappings'
