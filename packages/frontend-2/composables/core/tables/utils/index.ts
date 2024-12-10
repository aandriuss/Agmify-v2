// Column operations
export {
  isColumnDef,
  createBaseColumnDef,
  createBimColumnDefWithDefaults,
  createUserColumnDefWithDefaults,
  getColumnGroup,
  getColumnDisplayName,
  isColumnSortable,
  isColumnFilterable,
  isColumnVisible,
  isColumnRemovable,
  getColumnWidth,
  getColumnOrder
} from './column'

// Table configuration
export { createTableConfig, TABLE_SORT_DIRECTIONS, TABLE_VIEW_MODES } from './config'

// BIM utilities
export { inferBimValueType, getDefaultValueForType } from './bim'

// Data pipeline
export { processDataPipeline } from './dataPipeline'
export type { DataPipelineOptions, DataPipelineResult } from './dataPipeline'

// Header processing
export { useProcessedHeaders } from './header-processing'

// Validation utilities
export { isValidHeader, processHeaders } from '../../types/validation/header-validation'
