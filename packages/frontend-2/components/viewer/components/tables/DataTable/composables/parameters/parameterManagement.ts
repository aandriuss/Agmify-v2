export interface ParameterDefinition {
  name: string
  field: string
  type: string
  header: string
  category?: string
  color?: string
  description?: string
  removable?: boolean
  visible?: boolean
}

export const fixedParentParameters: ParameterDefinition[] = [
  {
    name: 'Category',
    field: 'category',
    type: 'string',
    header: 'Category',
    category: 'Classification',
    removable: false,
    visible: true
  },
  {
    name: 'ID',
    field: 'id',
    type: 'string',
    header: 'ID',
    category: 'Classification',
    removable: true,
    visible: true
  },
  {
    name: 'Mark',
    field: 'mark',
    type: 'string',
    header: 'Mark',
    category: 'Classification',
    removable: true,
    visible: true
  },
  {
    name: 'Host',
    field: 'host',
    type: 'string',
    header: 'Host',
    category: 'Classification',
    removable: true,
    visible: true
  },
  {
    name: 'Comment',
    field: 'comment',
    type: 'string',
    header: 'Comment',
    category: 'Classification',
    removable: true,
    visible: true
  },
  // Add numeric parameters
  {
    name: 'Width',
    field: 'width',
    type: 'number',
    header: 'Width',
    category: 'Dimensions',
    removable: true,
    visible: true
  },
  {
    name: 'Height',
    field: 'height',
    type: 'number',
    header: 'Height',
    category: 'Dimensions',
    removable: true,
    visible: true
  },
  {
    name: 'Thickness',
    field: 'thickness',
    type: 'number',
    header: 'Thickness',
    category: 'Dimensions',
    removable: true,
    visible: true
  },
  {
    name: 'Area',
    field: 'area',
    type: 'number',
    header: 'Area',
    category: 'Dimensions',
    removable: true,
    visible: true
  }
]

export const fixedChildParameters: ParameterDefinition[] = [
  {
    name: 'Category',
    field: 'category',
    type: 'string',
    header: 'Category',
    category: 'Classification',
    removable: false,
    visible: true
  },
  {
    name: 'ID',
    field: 'id',
    type: 'string',
    header: 'ID',
    category: 'Classification',
    removable: true,
    visible: true
  },
  {
    name: 'Mark',
    field: 'mark',
    type: 'string',
    header: 'Mark',
    category: 'Classification',
    removable: true,
    visible: true
  },
  {
    name: 'Width',
    field: 'width',
    type: 'number',
    header: 'Width',
    category: 'Dimensions',
    removable: true,
    visible: true
  },
  {
    name: 'Height',
    field: 'height',
    type: 'number',
    header: 'Height',
    category: 'Dimensions',
    removable: true,
    visible: true
  },
  {
    name: 'Length',
    field: 'length',
    type: 'number',
    header: 'Length',
    category: 'Dimensions',
    removable: true,
    visible: true
  }
]

type ParameterCategory = 'Classification' | 'Dimensions' | 'Custom Parameters'

const categoryOrder: Record<ParameterCategory, number> = {
  Classification: 0,
  Dimensions: 1,
  'Custom Parameters': 2
}

export function mergeAndCategorizeParameters(
  fixedParams: ParameterDefinition[],
  availableParams: ParameterDefinition[],
  selectedCategories: string[]
): ParameterDefinition[] {
  // Start with fixed parameters
  const allParams = [...fixedParams]

  // Add available parameters that aren't already in fixed parameters
  availableParams.forEach((param) => {
    const existingParam = allParams.find((p) => p.field === param.field)
    if (!existingParam) {
      // If categories are selected, only add params that match
      if (
        selectedCategories.length === 0 ||
        (param.category && selectedCategories.includes(param.category))
      ) {
        allParams.push(param)
      }
    }
  })

  // Sort parameters by category and name
  return allParams.sort((a, b) => {
    if (a.category === b.category) {
      return a.name.localeCompare(b.name)
    }
    // Put Classification first, then Dimensions, then others
    const getCategoryOrder = (category: string | undefined): number => {
      if (!category) return 3
      return category in categoryOrder
        ? categoryOrder[category as ParameterCategory]
        : 3
    }
    return getCategoryOrder(a.category) - getCategoryOrder(b.category)
  })
}
