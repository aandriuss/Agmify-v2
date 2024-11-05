import type { ParameterDefinition } from '../../tables/DataTable/composables/parameters/parameterManagement'
import {
  mergeAndCategorizeParameters,
  fixedParentParameters
} from '../../tables/DataTable/composables/parameters/parameterManagement'

export const standardParameters: ParameterDefinition[] = [
  { field: 'id', header: 'ID', type: 'string', category: 'identification' },
  { field: 'category', header: 'Category', type: 'string', category: 'classification' },
  { field: 'mark', header: 'Mark', type: 'string', category: 'identification' },
  { field: 'host', header: 'Host', type: 'string', category: 'relationships' },
  { field: 'comment', header: 'Comment', type: 'string', category: 'documentation' }
]

export const extractParametersFromData = (data: any[]): ParameterDefinition[] => {
  if (!data?.length) return []

  const firstItem = data[0]

  const parameters = Object.keys(firstItem)
    .filter((key) => !['details', 'length', 'lastIndex', 'lastItem'].includes(key))
    .map((field) => ({
      field,
      header: field.charAt(0).toUpperCase() + field.slice(1),
      type: typeof firstItem[field]
    }))

  return parameters
}

export const mergeParameters = (
  standardParams: ParameterDefinition[],
  dataParams: ParameterDefinition[],
  selectedCategories: string[],
  isParent: boolean
): ParameterDefinition[] => {
  const fixedParams = isParent ? fixedParentParameters : fixedChildParameters
  return mergeAndCategorizeParameters(fixedParams, dataParams, selectedCategories)
}

// Re-export types and interfaces
export type { ParameterDefinition }
export { fixedParentParameters, fixedChildParameters }
