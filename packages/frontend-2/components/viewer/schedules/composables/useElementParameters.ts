import type {
  ElementData,
  ProcessedHeader,
  ParameterValue,
  UseElementParametersOptions,
  BIMNodeRaw
} from '../types'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import { debug, DebugCategories } from '../utils/debug'

interface ProcessParametersResult {
  processedElements: ElementData[]
  parameterColumns: ColumnDef[]
  availableHeaders: {
    parent: ProcessedHeader[]
    child: ProcessedHeader[]
  }
}

// Essential columns that are always included
const essentialColumns: ColumnDef[] = [
  {
    field: 'mark',
    header: 'Mark',
    type: 'string',
    category: 'essential',
    description: 'Element mark',
    visible: true,
    order: 0,
    removable: false,
    isFixed: true,
    source: 'Basic'
  },
  {
    field: 'category',
    header: 'Category',
    type: 'string',
    category: 'essential',
    description: 'Element category',
    visible: true,
    order: 1,
    removable: false,
    isFixed: true,
    source: 'Basic'
  },
  {
    field: 'host',
    header: 'Host',
    type: 'string',
    category: 'essential',
    description: 'Host element mark',
    visible: true,
    order: 2,
    removable: false,
    isFixed: true,
    source: 'Basic'
  },
  {
    field: 'endLevelOffset',
    header: 'End Level Offset',
    type: 'string',
    category: 'essential',
    description: 'End level offset',
    visible: true,
    order: 3,
    removable: true,
    source: 'Basic'
  }
]

function createColumnDef(header: ProcessedHeader, index: number): ColumnDef {
  return {
    field: header.field,
    header: header.header,
    type: header.type,
    category: header.category,
    description: header.description,
    source: header.source,
    visible: true,
    order: index,
    removable: true
  }
}

function isValidParameterValue(value: unknown): value is ParameterValue {
  return (
    typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
  )
}

function processRawParameters(
  raw: BIMNodeRaw | null | undefined,
  processedElement: ElementData & Record<string, ParameterValue>
): void {
  if (!raw) {
    debug.warn(DebugCategories.PARAMETERS, 'No raw data available for processing')
    processedElement.parameters = {}
    return
  }

  const parameters: Record<string, ParameterValue> = {}
  const parameterGroups: Record<string, string> = {}

  try {
    // Process parameters object
    if (raw.parameters && typeof raw.parameters === 'object') {
      const params = raw.parameters as Record<string, unknown>
      const groups = (params._groups || {}) as Record<string, string>

      Object.entries(params).forEach(([key, value]) => {
        if (key !== '_groups' && key !== '_raw' && isValidParameterValue(value)) {
          const paramKey = key.replace(/\s+/g, '_').toLowerCase()
          parameters[paramKey] = value
          parameterGroups[paramKey] = groups[key] || 'Parameters'
        }
      })
    }

    // Process Identity Data
    if (raw['Identity Data'] && typeof raw['Identity Data'] === 'object') {
      Object.entries(raw['Identity Data'] as Record<string, unknown>).forEach(
        ([key, value]) => {
          if (isValidParameterValue(value)) {
            const paramKey = key.replace(/\s+/g, '_').toLowerCase()
            parameters[paramKey] = value
            parameterGroups[paramKey] = 'Identity Data'
          }
        }
      )
    }

    // Process Constraints
    if (raw.Constraints && typeof raw.Constraints === 'object') {
      Object.entries(raw.Constraints as Record<string, unknown>).forEach(
        ([key, value]) => {
          if (isValidParameterValue(value)) {
            const paramKey = key.replace(/\s+/g, '_').toLowerCase()
            parameters[paramKey] = value
            parameterGroups[paramKey] = 'Constraints'
          }
        }
      )
    }

    // Process Other
    if (raw.Other && typeof raw.Other === 'object') {
      Object.entries(raw.Other as Record<string, unknown>).forEach(([key, value]) => {
        if (isValidParameterValue(value)) {
          const paramKey = key.replace(/\s+/g, '_').toLowerCase()
          parameters[paramKey] = value
          parameterGroups[paramKey] = 'Other'
        }
      })
    }

    // Process top-level properties
    Object.entries(raw).forEach(([key, value]) => {
      if (
        ![
          'parameters',
          '_raw',
          '_groups',
          'Identity Data',
          'Constraints',
          'Other'
        ].includes(key) &&
        isValidParameterValue(value)
      ) {
        const paramKey = key.replace(/\s+/g, '_').toLowerCase()
        parameters[paramKey] = value
        parameterGroups[paramKey] = 'General'
      }
    })

    // Store parameters and groups
    processedElement.parameters = parameters
    Object.defineProperty(processedElement.parameters, '_groups', {
      value: parameterGroups,
      enumerable: false,
      configurable: true,
      writable: true
    })

    // Copy parameters to top level
    Object.entries(parameters).forEach(([key, value]) => {
      processedElement[key] = value
    })

    debug.log(DebugCategories.PARAMETERS, 'Parameters processed successfully', {
      parameterCount: Object.keys(parameters).length,
      groupCount: Object.keys(parameterGroups).length,
      groups: [...new Set(Object.values(parameterGroups))]
    })
  } catch (error) {
    debug.error(DebugCategories.ERROR, 'Error processing parameters:', error)
    processedElement.parameters = {}
  }
}

/**
 * Pure function to process elements and extract parameters
 */
export function processParameters({
  filteredElements,
  essentialFieldsOnly = false
}: UseElementParametersOptions): ProcessParametersResult {
  debug.log(DebugCategories.PARAMETERS, 'Starting parameter processing', {
    elementCount: filteredElements.length,
    essentialFieldsOnly,
    elementCategories: [...new Set(filteredElements.map((el) => el.category))]
  })

  if (essentialFieldsOnly) {
    debug.log(DebugCategories.PARAMETERS, 'Processing essential fields only', {
      elementCount: filteredElements.length,
      essentialColumns: essentialColumns.length
    })

    return {
      processedElements: filteredElements,
      parameterColumns: essentialColumns,
      availableHeaders: {
        parent: [],
        child: []
      }
    }
  }

  // Process elements and extract parameter values
  const processedElements = filteredElements.map((element) => {
    const processedElement = { ...element } as ElementData &
      Record<string, ParameterValue>

    try {
      // Process raw data if available
      const raw = Object.getOwnPropertyDescriptor(element, '_raw')?.value as BIMNodeRaw
      processRawParameters(raw, processedElement)
    } catch (error) {
      debug.error(DebugCategories.ERROR, 'Error processing element:', error)
      processedElement.parameters = {}
    }

    return processedElement
  })

  // Create headers for all parameters
  const parentHeaders = new Map<string, ProcessedHeader>()
  const childHeaders = new Map<string, ProcessedHeader>()

  processedElements.forEach((element) => {
    try {
      const targetHeaders = element.isChild ? childHeaders : parentHeaders
      const params = element.parameters || {}
      const groups =
        (Object.getOwnPropertyDescriptor(params, '_groups')?.value as Record<
          string,
          string
        >) || {}

      Object.entries(params).forEach(([key, value]) => {
        if (
          key !== '_groups' &&
          !targetHeaders.has(key) &&
          isValidParameterValue(value)
        ) {
          const group = groups[key] || 'Parameters'
          targetHeaders.set(key, {
            field: key,
            header: key,
            source: group,
            type: typeof value as 'string' | 'number' | 'boolean',
            category: element.category,
            description: `${group} > ${key}`
          })
        }
      })
    } catch (error) {
      debug.error(DebugCategories.ERROR, 'Error processing headers:', error)
    }
  })

  // Create columns for all parameters
  const parameterColumns = [
    ...essentialColumns,
    ...Array.from(parentHeaders.values()).map((header, index) =>
      createColumnDef(header, essentialColumns.length + index)
    ),
    ...Array.from(childHeaders.values()).map((header, index) =>
      createColumnDef(header, essentialColumns.length + parentHeaders.size + index)
    )
  ]

  debug.log(DebugCategories.PARAMETERS, 'Parameters processed', {
    elementCount: filteredElements.length,
    columns: parameterColumns.length,
    essentialColumns: essentialColumns.length,
    sampleElement: processedElements[0],
    sampleParameters: processedElements[0]?.parameters,
    parameterGroups: [
      ...new Set([
        ...Array.from(parentHeaders.values()).map((h) => h.source),
        ...Array.from(childHeaders.values()).map((h) => h.source)
      ])
    ]
  })

  return {
    processedElements,
    parameterColumns,
    availableHeaders: {
      parent: Array.from(parentHeaders.values()),
      child: Array.from(childHeaders.values())
    }
  }
}
