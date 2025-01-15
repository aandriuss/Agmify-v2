import type { ElementData, TableRow, TableColumn } from './index'

export interface ElementMetadata {
  isParent?: boolean
  category?: string
  [key: string]: unknown
}

export interface DebugPanelProps {
  // Core props
  showTestMode?: boolean
  showTableCategories?: boolean
  showParameterCategories?: boolean
  showBimData?: boolean
  showParameterStats?: boolean
  showDataStructure?: boolean

  // Data props (optional, only needed for specific sections)
  scheduleData?: ElementData[]
  evaluatedData?: ElementData[]
  tableData?: (TableRow & { metadata?: ElementMetadata })[]
  parentElements?: ElementData[]
  childElements?: ElementData[]
  parentParameterColumns?: TableColumn[]
  childParameterColumns?: TableColumn[]
  availableParentHeaders?: TableColumn[]
  availableChildHeaders?: TableColumn[]
}
