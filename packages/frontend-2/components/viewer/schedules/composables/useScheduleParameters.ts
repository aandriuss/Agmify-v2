import { computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type { CustomParameter } from '~/composables/useUserSettings'
import { CATEGORY_SETTINGS } from '../config/constants'
import { debug } from '../utils/debug'

interface ProcessedHeader {
  field: string
  header?: string
  category?: string
}

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
      name: header.field,
      field: header.field,
      type: 'fixed',
      value: '',
      header: header.header || header.field,
      category: header.category || CATEGORY_SETTINGS.defaultCategory,
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

  const mergedParentParameters = computed<CustomParameter[]>(() => {
    if (isInitialized?.value === false) return []

    const mappedHeaders = mapHeadersToParameters(availableHeaders.value.parent)
    const customParams = customParameters.value
    const filteredHeaders = filterHeadersByCategory(
      mappedHeaders,
      selectedParentCategories.value
    )

    debug.log('Merged parent parameters:', {
      mappedHeadersCount: mappedHeaders.length,
      customParamsCount: customParams.length,
      filteredHeadersCount: filteredHeaders.length
    })

    return [...filteredHeaders, ...customParams].map((param, index) => ({
      ...param,
      order: index
    }))
  })

  const mergedChildParameters = computed<CustomParameter[]>(() => {
    if (isInitialized?.value === false) return []

    const mappedHeaders = mapHeadersToParameters(availableHeaders.value.child)
    const customParams = customParameters.value
    const filteredHeaders = filterHeadersByCategory(
      mappedHeaders,
      selectedChildCategories.value
    )

    debug.log('Merged child parameters:', {
      mappedHeadersCount: mappedHeaders.length,
      customParamsCount: customParams.length,
      filteredHeadersCount: filteredHeaders.length
    })

    return [...filteredHeaders, ...customParams].map((param, index) => ({
      ...param,
      order: index
    }))
  })

  return {
    mergedParentParameters,
    mergedChildParameters
  }
}
