import { ref, computed, watch, type Ref } from 'vue'
import type { ElementData, ProcessedHeader, ParameterValue } from '../types'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import { debug, DebugCategories } from '../utils/debug'

interface UseElementParametersOptions {
  filteredElements: ElementData[]
}

interface UseElementParametersReturn {
  parameterColumns: Ref<ColumnDef[]>
  availableHeaders: Ref<{
    parent: ProcessedHeader[]
    child: ProcessedHeader[]
  }>
  processedElements: ElementData[]
  updateParameterVisibility: (field: string, visible: boolean) => void
  stopParameterWatch: () => void
}

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

export function useElementParameters({
  filteredElements
}: UseElementParametersOptions): UseElementParametersReturn {
  const availableHeaders = ref<{
    parent: ProcessedHeader[]
    child: ProcessedHeader[]
  }>({
    parent: [],
    child: []
  })

  const parameterColumns = ref<ColumnDef[]>([])

  // Process elements and extract parameter values
  const processedElements = computed(() => {
    return filteredElements.map((element) => {
      const processedElement = { ...element }

      // Process parent parameters
      if (element.parameters) {
        availableHeaders.value.parent.forEach((header) => {
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
            availableHeaders.value.child.forEach((header) => {
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
  })

  // Update parameter visibility
  function updateParameterVisibility(field: string, visible: boolean) {
    const columnIndex = parameterColumns.value.findIndex((col) => col.field === field)
    if (columnIndex !== -1) {
      parameterColumns.value[columnIndex] = {
        ...parameterColumns.value[columnIndex],
        visible
      }
    }
  }

  // Watch for changes in filtered elements to update parameters
  const stopParameterWatch = watch(
    () => filteredElements,
    (newElements) => {
      const headers = discoverParameters(newElements)
      availableHeaders.value = headers

      // Create columns for discovered parameters
      parameterColumns.value = [
        ...headers.parent.map((header, index) => createColumnDef(header, index)),
        ...headers.child.map((header, index) =>
          createColumnDef(header, headers.parent.length + index)
        )
      ]

      debug.log(DebugCategories.PARAMETERS, 'Parameters updated', {
        parentHeaders: headers.parent.length,
        childHeaders: headers.child.length,
        columns: parameterColumns.value.length
      })
    },
    { deep: true, immediate: true }
  )

  return {
    parameterColumns,
    availableHeaders,
    processedElements: processedElements.value,
    updateParameterVisibility,
    stopParameterWatch
  }
}
