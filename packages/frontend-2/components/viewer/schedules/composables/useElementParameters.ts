import type {
  ElementData,
  ProcessedHeader,
  ParameterValue,
  UseElementParametersOptions
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
    removable: false
  },
  {
    field: 'category',
    header: 'Category',
    type: 'string',
    category: 'essential',
    description: 'Element category',
    visible: true,
    order: 1,
    removable: false
  }
]

function getParameterValue(
  parameters: Record<string, ParameterValue> | undefined,
  field: string
): ParameterValue | undefined {
  if (!parameters) return undefined
  return parameters[field]
}

function discoverParameters(elements: ElementData[]): {
  parent: ProcessedHeader[]
  child: ProcessedHeader[]
} {
  const parentHeaders = new Map<string, ProcessedHeader>()
  const childHeaders = new Map<string, ProcessedHeader>()

  // Process parent elements
  elements.forEach((element) => {
    if (element.parameters) {
      Object.entries(element.parameters).forEach(([field, value]) => {
        if (!parentHeaders.has(field)) {
          parentHeaders.set(field, {
            field,
            header: field,
            source: 'parameters',
            type: typeof value === 'number' ? 'number' : 'string',
            category: element.category,
            description: `Parameter from ${element.category}`
          })
        }
      })
    }
  })

  // Process child elements
  elements.forEach((element) => {
    element.details?.forEach((child) => {
      if (child.parameters) {
        Object.entries(child.parameters).forEach(([field, value]) => {
          if (!childHeaders.has(field)) {
            childHeaders.set(field, {
              field,
              header: field,
              source: 'parameters',
              type: typeof value === 'number' ? 'number' : 'string',
              category: child.category,
              description: `Parameter from ${child.category}`
            })
          }
        })
      }
    })
  })

  return {
    parent: Array.from(parentHeaders.values()),
    child: Array.from(childHeaders.values())
  }
}

function createColumnDef(header: ProcessedHeader, index: number): ColumnDef {
  return {
    field: header.field,
    header: header.header,
    type: header.type,
    category: header.category,
    description: header.description,
    visible: true,
    order: index,
    removable: true
  }
}

/**
 * Pure function to process elements and extract parameters
 */
export function processParameters({
  filteredElements,
  essentialFieldsOnly = false
}: UseElementParametersOptions): ProcessParametersResult {
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

  // Discover available parameters
  const headers = discoverParameters(filteredElements)

  // Create columns for discovered parameters
  const parameterColumns = [
    ...essentialColumns,
    ...headers.parent.map((header, index) =>
      createColumnDef(header, essentialColumns.length + index)
    ),
    ...headers.child.map((header, index) =>
      createColumnDef(header, essentialColumns.length + headers.parent.length + index)
    )
  ]

  // Process elements and extract parameter values
  const processedElements = filteredElements.map((element) => {
    const processedElement = { ...element }

    // Process parent parameters
    if (element.parameters) {
      headers.parent.forEach((header) => {
        const value = getParameterValue(element.parameters, header.field)
        if (value !== undefined) {
          processedElement.parameters = {
            ...processedElement.parameters,
            [header.field]: value
          }
        }
      })
    }

    // Process child parameters
    if (element.details) {
      processedElement.details = element.details.map((child) => {
        const processedChild = { ...child }
        if (child.parameters) {
          headers.child.forEach((header) => {
            const value = getParameterValue(child.parameters, header.field)
            if (value !== undefined) {
              processedChild.parameters = {
                ...processedChild.parameters,
                [header.field]: value
              }
            }
          })
        }
        return processedChild
      })
    }

    return processedElement
  })

  debug.log(DebugCategories.PARAMETERS, 'Parameters processed', {
    elementCount: filteredElements.length,
    parentHeaders: headers.parent.length,
    childHeaders: headers.child.length,
    columns: parameterColumns.length,
    essentialColumns: essentialColumns.length
  })

  return {
    processedElements,
    parameterColumns,
    availableHeaders: headers
  }
}
