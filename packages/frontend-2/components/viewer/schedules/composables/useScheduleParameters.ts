import { computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type { CustomParameter, ProcessedHeader } from '~/composables/core/types'
import { CATEGORY_SETTINGS } from '../config/constants'
import { debug, DebugCategories } from '../debug/useDebug'
import { defaultColumns, defaultDetailColumns } from '../config/defaultColumns'

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
    selectedChildCategories
  } = options

  // Map headers to parameter definitions with improved defaults
  function mapHeadersToParameters(headers: ProcessedHeader[]): CustomParameter[] {
    return headers.map(
      (header): CustomParameter => ({
        id: header.field,
        name: header.header,
        field: header.field,
        type: 'fixed',
        value: '',
        header: header.header,
        category: header.category || CATEGORY_SETTINGS.defaultCategory,
        source: header.source,
        description: header.description || `Parameter for ${header.header}`,
        removable: true,
        visible: true,
        order: 0
      })
    )
  }

  // Filter headers by selected categories with default category always included
  function filterHeadersByCategory(
    headers: CustomParameter[],
    selectedCategories: string[]
  ): CustomParameter[] {
    // If no categories selected, show all headers
    if (!selectedCategories.length) {
      debug.log(
        DebugCategories.PARAMETERS,
        'No categories selected, showing all headers'
      )
      return headers
    }

    return headers.filter((header) => {
      const isDefaultCategory = header.category === CATEGORY_SETTINGS.defaultCategory
      const isSelectedCategory = selectedCategories.includes(header.category || '')
      const isFixedParameter = !header.removable

      // Always include fixed parameters and default category
      return isFixedParameter || isDefaultCategory || isSelectedCategory
    })
  }

  // Group parameters by source with improved sorting
  function groupParametersBySource(
    parameters: CustomParameter[]
  ): Record<string, CustomParameter[]> {
    const groups = parameters.reduce((acc, param) => {
      const source = param.source || 'Other'
      if (!acc[source]) {
        acc[source] = []
      }
      acc[source].push(param)
      return acc
    }, {} as Record<string, CustomParameter[]>)

    // Sort parameters within each group
    Object.keys(groups).forEach((source) => {
      groups[source].sort((a, b) => {
        // Fixed parameters first
        if (!a.removable && b.removable) return -1
        if (a.removable && !b.removable) return 1
        // Then by order
        return (a.order || 0) - (b.order || 0)
      })
    })

    return groups
  }

  // Get default parameters from default columns
  const defaultParentParameters = computed<CustomParameter[]>(() => {
    return defaultColumns.map(
      (col): CustomParameter => ({
        id: col.field,
        name: col.header,
        field: col.field,
        type: 'fixed',
        value: '',
        header: col.header,
        category: col.source || CATEGORY_SETTINGS.defaultCategory,
        source: col.source || 'Default',
        description: col.description || `Default parameter for ${col.header}`,
        removable: col.removable ?? false,
        visible: col.visible ?? true,
        order: col.order ?? 0
      })
    )
  })

  const defaultChildParameters = computed<CustomParameter[]>(() => {
    return defaultDetailColumns.map(
      (col): CustomParameter => ({
        id: col.field,
        name: col.header,
        field: col.field,
        type: 'fixed',
        value: '',
        header: col.header,
        category: col.source || CATEGORY_SETTINGS.defaultCategory,
        source: col.source || 'Default',
        description: col.description || `Default parameter for ${col.header}`,
        removable: col.removable ?? false,
        visible: col.visible ?? true,
        order: col.order ?? 0
      })
    )
  })

  // Available parameters (without merging with custom parameters)
  const availableParentParameters = computed<CustomParameter[]>(() => {
    const mappedHeaders = mapHeadersToParameters(availableHeaders.value.parent)
    const filteredHeaders = filterHeadersByCategory(
      mappedHeaders,
      selectedParentCategories.value
    )
    const groupedParameters = groupParametersBySource(filteredHeaders)

    // Merge with default parameters
    const mergedParameters = [
      ...defaultParentParameters.value,
      ...Object.values(groupedParameters).flat()
    ]

    debug.log(DebugCategories.PARAMETERS, 'Available parent parameters:', {
      defaultCount: defaultParentParameters.value.length,
      mappedHeadersCount: mappedHeaders.length,
      filteredHeadersCount: filteredHeaders.length,
      finalCount: mergedParameters.length,
      groups: Object.keys(groupedParameters)
    })

    return mergedParameters
  })

  const availableChildParameters = computed<CustomParameter[]>(() => {
    const mappedHeaders = mapHeadersToParameters(availableHeaders.value.child)
    const filteredHeaders = filterHeadersByCategory(
      mappedHeaders,
      selectedChildCategories.value
    )
    const groupedParameters = groupParametersBySource(filteredHeaders)

    // Merge with default parameters
    const mergedParameters = [
      ...defaultChildParameters.value,
      ...Object.values(groupedParameters).flat()
    ]

    debug.log(DebugCategories.PARAMETERS, 'Available child parameters:', {
      defaultCount: defaultChildParameters.value.length,
      mappedHeadersCount: mappedHeaders.length,
      filteredHeadersCount: filteredHeaders.length,
      finalCount: mergedParameters.length,
      groups: Object.keys(groupedParameters)
    })

    return mergedParameters
  })

  // Merged parameters (including custom parameters)
  const mergedParentParameters = computed<CustomParameter[]>(() => {
    const available = availableParentParameters.value
    const custom = customParameters.value

    // Ensure unique parameters by field
    const uniqueParameters = [...available]
    custom.forEach((customParam) => {
      const existingIndex = uniqueParameters.findIndex(
        (p) => p.field === customParam.field
      )
      if (existingIndex >= 0) {
        // Update existing parameter with custom values while preserving required fields
        uniqueParameters[existingIndex] = {
          ...uniqueParameters[existingIndex],
          ...customParam,
          type: customParam.type || 'fixed'
        }
      } else {
        // Add new custom parameter
        uniqueParameters.push(customParam)
      }
    })

    debug.log(DebugCategories.PARAMETERS, 'Merged parent parameters:', {
      availableCount: available.length,
      customCount: custom.length,
      uniqueCount: uniqueParameters.length
    })

    return uniqueParameters.map((param, index) => ({
      ...param,
      order: param.order ?? index
    }))
  })

  const mergedChildParameters = computed<CustomParameter[]>(() => {
    const available = availableChildParameters.value
    const custom = customParameters.value

    // Ensure unique parameters by field
    const uniqueParameters = [...available]
    custom.forEach((customParam) => {
      const existingIndex = uniqueParameters.findIndex(
        (p) => p.field === customParam.field
      )
      if (existingIndex >= 0) {
        // Update existing parameter with custom values while preserving required fields
        uniqueParameters[existingIndex] = {
          ...uniqueParameters[existingIndex],
          ...customParam,
          type: customParam.type || 'fixed'
        }
      } else {
        // Add new custom parameter
        uniqueParameters.push(customParam)
      }
    })

    debug.log(DebugCategories.PARAMETERS, 'Merged child parameters:', {
      availableCount: available.length,
      customCount: custom.length,
      uniqueCount: uniqueParameters.length
    })

    return uniqueParameters.map((param, index) => ({
      ...param,
      order: param.order ?? index
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
