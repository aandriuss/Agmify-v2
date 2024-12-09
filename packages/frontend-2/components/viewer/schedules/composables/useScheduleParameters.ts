import { computed, type ComputedRef, type Ref } from 'vue'
import type {
  Parameter,
  UserParameter,
  ProcessedHeader
} from '~/composables/core/types'
import {
  createUserParameter,
  convertBimToUserType,
  PARAMETER_SETTINGS
} from '~/composables/core/types'
import { defaultColumns, defaultDetailColumns } from '../config/defaultColumns'

interface UseScheduleParametersOptions {
  availableHeaders:
    | Ref<{ parent: ProcessedHeader[]; child: ProcessedHeader[] }>
    | ComputedRef<{ parent: ProcessedHeader[]; child: ProcessedHeader[] }>
  parameters: Ref<Parameter[]> | ComputedRef<Parameter[]>
  selectedParentCategories: Ref<string[]> | ComputedRef<string[]>
  selectedChildCategories: Ref<string[]> | ComputedRef<string[]>
}

// Map headers to parameter definitions with improved defaults
function mapHeadersToParameters(headers: ProcessedHeader[]): UserParameter[] {
  return headers.map((header) =>
    createUserParameter({
      id: header.id,
      name: header.name,
      field: header.field,
      header: header.header,
      type: convertBimToUserType(header.type),
      group: header.category || PARAMETER_SETTINGS.defaultGroup,
      visible: true,
      removable: true,
      value: null,
      description: header.description || `${header.category} > ${header.name}`,
      metadata: {
        source: header.source || PARAMETER_SETTINGS.systemGroup
      }
    })
  )
}

// Filter parameters by category
function filterHeadersByCategory(
  parameters: UserParameter[],
  selectedCategories: string[]
): UserParameter[] {
  // If no categories selected, show all parameters
  if (!selectedCategories.length) {
    return parameters
  }

  return parameters.filter((param) => {
    const category = param.group
    return (
      selectedCategories.includes(category) ||
      (!category &&
        selectedCategories.includes(PARAMETER_SETTINGS.uncategorizedGroup)) ||
      param.removable // Always show removable parameters
    )
  })
}

// Group parameters by source
function groupParametersBySource(
  parameters: UserParameter[]
): Record<string, UserParameter[]> {
  const groups = parameters.reduce((acc, param) => {
    const source = param.metadata?.source || 'Unknown'
    if (!acc[source]) {
      acc[source] = []
    }
    acc[source].push(param)
    return acc
  }, {} as Record<string, UserParameter[]>)

  // Sort parameters within each group
  Object.values(groups).forEach((params) => {
    params.sort((a, b) => {
      // First by removable status
      if (a.removable !== b.removable) {
        return a.removable ? 1 : -1
      }
      // Then by order if present
      if (
        a.metadata?.order !== undefined &&
        b.metadata?.order !== undefined &&
        a.metadata.order !== b.metadata.order
      ) {
        return (a.metadata.order as number) - (b.metadata.order as number)
      }
      // Finally by name
      return a.name.localeCompare(b.name)
    })
  })

  return groups
}

export function useScheduleParameters({
  availableHeaders,
  parameters: _parameters, // Unused for now
  selectedParentCategories,
  selectedChildCategories
}: UseScheduleParametersOptions) {
  // Get default parameters from default columns
  const defaultParentParameters = computed<UserParameter[]>(() =>
    defaultColumns.map((col) =>
      createUserParameter({
        id: col.field,
        name: col.header,
        field: col.field,
        header: col.header,
        type: 'fixed',
        group: PARAMETER_SETTINGS.systemGroup,
        visible: true,
        removable: false,
        value: null,
        metadata: {
          source: PARAMETER_SETTINGS.systemGroup,
          order: 0
        }
      })
    )
  )

  const defaultChildParameters = computed<UserParameter[]>(() =>
    defaultDetailColumns.map((col) =>
      createUserParameter({
        id: col.field,
        name: col.header,
        field: col.field,
        header: col.header,
        type: 'fixed',
        group: PARAMETER_SETTINGS.systemGroup,
        visible: true,
        removable: false,
        value: null,
        metadata: {
          source: PARAMETER_SETTINGS.systemGroup,
          order: 0
        }
      })
    )
  )

  // Available parameters (without merging with custom parameters)
  const availableParentParameters = computed<UserParameter[]>(() => {
    const mappedHeaders = mapHeadersToParameters(availableHeaders.value.parent)
    return [...defaultParentParameters.value, ...mappedHeaders]
  })

  const availableChildParameters = computed<UserParameter[]>(() => {
    const mappedHeaders = mapHeadersToParameters(availableHeaders.value.child)
    return [...defaultChildParameters.value, ...mappedHeaders]
  })

  // Filtered parameters by category
  const filteredParentParameters = computed(() =>
    filterHeadersByCategory(
      availableParentParameters.value,
      selectedParentCategories.value
    )
  )

  const filteredChildParameters = computed(() =>
    filterHeadersByCategory(
      availableChildParameters.value,
      selectedChildCategories.value
    )
  )

  // Grouped parameters by source
  const groupedParentParameters = computed(() =>
    groupParametersBySource(filteredParentParameters.value)
  )

  const groupedChildParameters = computed(() =>
    groupParametersBySource(filteredChildParameters.value)
  )

  return {
    availableParentParameters,
    availableChildParameters,
    filteredParentParameters,
    filteredChildParameters,
    groupedParentParameters,
    groupedChildParameters
  }
}
