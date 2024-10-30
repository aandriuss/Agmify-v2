export interface ParameterDefinition {
  field: string
  header: string
  type?: string
  description?: string
  category?: string
}

export const standardParameters: ParameterDefinition[] = [
  { field: 'id', header: 'ID', type: 'string', category: 'identification' },
  { field: 'category', header: 'Category', type: 'string', category: 'classification' },
  { field: 'mark', header: 'Mark', type: 'string', category: 'identification' },
  { field: 'host', header: 'Host', type: 'string', category: 'relationships' },
  { field: 'comment', header: 'Comment', type: 'string', category: 'documentation' }
]

export const extractParametersFromData = (data: any[]): ParameterDefinition[] => {
  console.log('Extracting parameters from data:', {
    fullData: data,
    dataLength: data?.length,
    firstItem: data?.[0],
    firstItemKeys: data?.[0] ? Object.keys(data[0]) : [],
    firstItemDetails: data?.[0]?.details,
    firstDetailItem: data?.[0]?.details?.[0],
    firstDetailKeys: data?.[0]?.details?.[0] ? Object.keys(data[0].details[0]) : []
  })

  if (!data?.length) return []

  const firstItem = data[0]

  // Get unique categories from data
  const categories = [...new Set(data.map((item) => item.category))]
  console.log('Found categories:', categories)

  // For each category, find first item and its parameters
  categories.forEach((category) => {
    const categoryExample = data.find((item) => item.category === category)
    console.log(`Parameters for category ${category}:`, {
      mainFields: Object.keys(categoryExample || {}),
      detailFields: categoryExample?.details?.[0]
        ? Object.keys(categoryExample.details[0])
        : []
    })
  })

  // Original extraction logic
  const parameters = Object.keys(firstItem)
    .filter((key) => !['details', 'length', 'lastIndex', 'lastItem'].includes(key))
    .map((field) => ({
      field,
      header: field.charAt(0).toUpperCase() + field.slice(1),
      type: typeof firstItem[field]
    }))

  console.log('Extracted parameters:', parameters)

  return parameters
}

// Keep the merge function as is
export const mergeParameters = (
  standardParams: ParameterDefinition[],
  dataParams: ParameterDefinition[]
): ParameterDefinition[] => {
  const merged = [...standardParams]

  dataParams.forEach((dataParam) => {
    const exists = merged.some(
      (std) => std.field === dataParam.field && std.type === dataParam.type
    )
    if (!exists) {
      merged.push(dataParam)
    }
  })

  return merged.sort((a, b) => a.header.localeCompare(b.header))
}
