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
    source: 'Essential',
    fetchedGroup: 'Essential',
    currentGroup: 'Essential',
    isFetched: true
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
    source: 'Essential',
    fetchedGroup: 'Essential',
    currentGroup: 'Essential',
    isFetched: true
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
    source: 'Essential',
    fetchedGroup: 'Essential',
    currentGroup: 'Essential',
    isFetched: true
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
    fetchedGroup: header.fetchedGroup,
    currentGroup: header.currentGroup,
    isFetched: header.isFetched,
    visible: true,
    order: index,
    removable: true
  }
}

function isValidParameterValue(value: unknown): value is ParameterValue {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null
  )
}

interface ParameterInfo {
  value: ParameterValue
  group: string
}

function processRawParameters(
  raw: BIMNodeRaw | null | undefined
): Record<string, ParameterInfo> {
  const parameters: Record<string, ParameterInfo> = {}

  if (!raw) {
    debug.warn(DebugCategories.PARAMETERS, 'No raw data available for processing')
    return parameters
  }

  try {
    // Process parameters object
    if (raw.parameters && typeof raw.parameters === 'object') {
      Object.entries(raw.parameters).forEach(([key, value]) => {
        if (key !== '_raw' && isValidParameterValue(value)) {
          const paramKey = key.replace(/\s+/g, '_').toLowerCase()
          parameters[paramKey] = {
            value,
            group: 'Parameters'
          }
        }
      })
    }

    // Process Identity Data
    if (raw['Identity Data'] && typeof raw['Identity Data'] === 'object') {
      Object.entries(raw['Identity Data'] as Record<string, unknown>).forEach(
        ([key, value]) => {
          if (isValidParameterValue(value)) {
            const paramKey = key.replace(/\s+/g, '_').toLowerCase()
            parameters[paramKey] = {
              value,
              group: 'Identity Data'
            }
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
            parameters[paramKey] = {
              value,
              group: 'Constraints'
            }
          }
        }
      )
    }

    // Process Other
    if (raw.Other && typeof raw.Other === 'object') {
      Object.entries(raw.Other as Record<string, unknown>).forEach(([key, value]) => {
        if (isValidParameterValue(value)) {
          const paramKey = key.replace(/\s+/g, '_').toLowerCase()
          parameters[paramKey] = {
            value,
            group: 'Other'
          }
        }
      })
    }

    // Process top-level properties
    Object.entries(raw).forEach(([key, value]) => {
      if (
        !['parameters', '_raw', 'Identity Data', 'Constraints', 'Other'].includes(
          key
        ) &&
        isValidParameterValue(value)
      ) {
        const paramKey = key.replace(/\s+/g, '_').toLowerCase()
        parameters[paramKey] = {
          value,
          group: 'General'
        }
      }
    })

    debug.log(DebugCategories.PARAMETERS, 'Parameters processed successfully', {
      parameterCount: Object.keys(parameters).length,
      groups: [...new Set(Object.values(parameters).map((p) => p.group))],
      sample: Object.entries(parameters)
        .slice(0, 3)
        .map(([key, info]) => ({ key, value: info.value, group: info.group }))
    })

    return parameters
  } catch (error) {
    debug.error(DebugCategories.ERROR, 'Error processing parameters:', error)
    return parameters
  }
}

/**
 * Pure function to process elements and extract parameters
 */
export function processParameters({
  filteredElements,
  essentialFieldsOnly = false,
  initialColumns
}: UseElementParametersOptions): ProcessParametersResult {
  debug.log(DebugCategories.PARAMETERS, 'Starting parameter processing', {
    elementCount: filteredElements.length,
    essentialFieldsOnly,
    hasInitialColumns: !!initialColumns,
    elementCategories: [...new Set(filteredElements.map((el) => el.category))]
  })

  // Use initialColumns if provided, otherwise fall back to essentialColumns
  const baseColumns = initialColumns || essentialColumns

  if (essentialFieldsOnly) {
    debug.log(DebugCategories.PARAMETERS, 'Processing essential fields only', {
      elementCount: filteredElements.length,
      baseColumnsCount: baseColumns.length
    })

    return {
      processedElements: filteredElements,
      parameterColumns: baseColumns,
      availableHeaders: {
        parent: [],
        child: []
      }
    }
  }

  // Process elements and extract parameter values
  const processedElements = filteredElements.map((element) => {
    const processedElement = { ...element } as ElementData

    try {
      // Process raw data if available
      const raw = Object.getOwnPropertyDescriptor(element, '_raw')?.value as BIMNodeRaw
      const parameterInfo = processRawParameters(raw)

      // Store parameter values
      const parameters: Record<string, ParameterValue> = {}
      Object.entries(parameterInfo).forEach(([key, info]) => {
        parameters[key] = info.value
      })

      processedElement.parameters = parameters

      // Copy parameters to top level
      Object.entries(parameters).forEach(([key, value]) => {
        processedElement[key] = value
      })

      debug.log(DebugCategories.PARAMETERS, 'Element parameters processed', {
        elementId: element.id,
        parameterCount: Object.keys(parameters).length,
        sampleParameters: Object.entries(parameters)
          .slice(0, 3)
          .map(([key, value]) => ({ key, value }))
      })
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
      const raw = Object.getOwnPropertyDescriptor(element, '_raw')?.value as BIMNodeRaw
      const parameterInfo = processRawParameters(raw)

      Object.entries(parameterInfo).forEach(([key, info]) => {
        if (!targetHeaders.has(key)) {
          targetHeaders.set(key, {
            field: key,
            header: key,
            fetchedGroup: info.group,
            currentGroup: info.group,
            source: info.group,
            type: typeof info.value as 'string' | 'number' | 'boolean',
            category: element.category,
            description: `${info.group} > ${key}`,
            isFetched: true
          })
        }
      })
    } catch (error) {
      debug.error(DebugCategories.ERROR, 'Error processing headers:', error)
    }
  })

  // Create columns for all parameters, starting with base columns
  const parameterColumns = [
    ...baseColumns,
    ...Array.from(parentHeaders.values()).map((header, index) =>
      createColumnDef(header, baseColumns.length + index)
    ),
    ...Array.from(childHeaders.values()).map((header, index) =>
      createColumnDef(header, baseColumns.length + parentHeaders.size + index)
    )
  ]

  debug.log(DebugCategories.PARAMETERS, 'Parameters processed', {
    elementCount: filteredElements.length,
    columns: parameterColumns.length,
    baseColumnsCount: baseColumns.length,
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
