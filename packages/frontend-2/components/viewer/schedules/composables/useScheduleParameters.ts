import { computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type { CustomParameter } from '~/composables/useUserSettings'
import type { ProcessedHeader } from '../types'
import { CATEGORY_SETTINGS } from '../config/constants'
import { debug, DebugCategories } from '../utils/debug'

interface UseScheduleParametersOptions {
  availableHeaders:
    | Ref<{ parent: ProcessedHeader[]; child: ProcessedHeader[] }>
    | ComputedRef<{ parent: ProcessedHeader[]; child: ProcessedHeader[] }>
  customParameters: Ref<CustomParameter[]> | ComputedRef<CustomParameter[]>
  selectedParentCategories: Ref<string[]> | ComputedRef<string[]>
  selectedChildCategories: Ref<string[]> | ComputedRef<string[]>
  isInitialized?: Ref<boolean>
}

export function useScheduleParameters(options: UseScheduleParametersOptions) {
  const {
    availableHeaders,
    customParameters,
    selectedParentCategories,
    selectedChildCategories,
    isInitialized
  } = options

  // Map headers to parameter definitions
  function mapHeadersToParameters(headers: ProcessedHeader[]): CustomParameter[] {
    return headers.map((header) => ({
      id: header.field,
      name: header.header, // Use header for display name
      field: header.field,
      type: 'fixed',
      value: '',
      header: header.header,
      category: header.category || CATEGORY_SETTINGS.defaultCategory,
      source: header.source, // Preserve source group
      description: header.description,
      removable: true,
      visible: true,
      order: 0
    }))
  }

  // Filter headers by selected categories
  function filterHeadersByCategory(
    headers: CustomParameter[],
    selectedCategories: string[]
  ): CustomParameter[] {
    if (!selectedCategories.length) return headers

    return headers.filter(
      (header) =>
        header.category === CATEGORY_SETTINGS.defaultCategory ||
        selectedCategories.includes(header.category || '')
    )
  }

  // Group parameters by source
  function groupParametersBySource(
    parameters: CustomParameter[]
  ): Record<string, CustomParameter[]> {
    return parameters.reduce((groups, param) => {
      const source = param.source || 'Other'
      if (!groups[source]) {
        groups[source] = []
      }
      groups[source].push(param)
      return groups
    }, {} as Record<string, CustomParameter[]>)
  }

  // Available parameters (without merging with custom parameters)
  const availableParentParameters = computed<CustomParameter[]>(() => {
    if (isInitialized?.value === false) return []

    const mappedHeaders = mapHeadersToParameters(availableHeaders.value.parent)
    const filteredHeaders = filterHeadersByCategory(
      mappedHeaders,
      selectedParentCategories.value
    )

    // Group parameters by source
    const groupedParameters = groupParametersBySource(filteredHeaders)

    debug.log(DebugCategories.PARAMETERS, 'Available parent parameters:', {
      mappedHeadersCount: mappedHeaders.length,
      filteredHeadersCount: filteredHeaders.length,
      groups: Object.keys(groupedParameters),
      parametersByGroup: Object.fromEntries(
        Object.entries(groupedParameters).map(([group, params]) => [
          group,
          params.length
        ])
      )
    })

    // Return flattened grouped parameters
    return Object.values(groupedParameters)
      .flat()
      .map((param, index) => ({
        ...param,
        order: index
      }))
  })

  const availableChildParameters = computed<CustomParameter[]>(() => {
    if (isInitialized?.value === false) return []

    const mappedHeaders = mapHeadersToParameters(availableHeaders.value.child)
    const filteredHeaders = filterHeadersByCategory(
      mappedHeaders,
      selectedChildCategories.value
    )

    // Group parameters by source
    const groupedParameters = groupParametersBySource(filteredHeaders)

    debug.log(DebugCategories.PARAMETERS, 'Available child parameters:', {
      mappedHeadersCount: mappedHeaders.length,
      filteredHeadersCount: filteredHeaders.length,
      groups: Object.keys(groupedParameters),
      parametersByGroup: Object.fromEntries(
        Object.entries(groupedParameters).map(([group, params]) => [
          group,
          params.length
        ])
      )
    })

    // Return flattened grouped parameters
    return Object.values(groupedParameters)
      .flat()
      .map((param, index) => ({
        ...param,
        order: index
      }))
  })

  // Merged parameters (including custom parameters)
  const mergedParentParameters = computed<CustomParameter[]>(() => {
    if (isInitialized?.value === false) return []

    const available = availableParentParameters.value
    const custom = customParameters.value

    debug.log(DebugCategories.PARAMETERS, 'Merged parent parameters:', {
      availableCount: available.length,
      customCount: custom.length
    })

    return [...available, ...custom].map((param, index) => ({
      ...param,
      order: index
    }))
  })

  const mergedChildParameters = computed<CustomParameter[]>(() => {
    if (isInitialized?.value === false) return []

    const available = availableChildParameters.value
    const custom = customParameters.value

    debug.log(DebugCategories.PARAMETERS, 'Merged child parameters:', {
      availableCount: available.length,
      customCount: custom.length
    })

    return [...available, ...custom].map((param, index) => ({
      ...param,
      order: index
    }))
  })

  return {
    // Available parameters (without custom parameters)
    availableParentParameters,
    availableChildParameters,
    // Merged parameters (with custom parameters)
    mergedParentParameters,
    mergedChildParameters
  }
}
