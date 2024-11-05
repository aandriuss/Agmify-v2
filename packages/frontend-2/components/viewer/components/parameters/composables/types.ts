export interface ParameterDefinition {
  field: string
  header: string
  type?: string
  description?: string
  category?: string
  isFixed?: boolean
  order?: number
  visible?: boolean
}

export interface ParameterGroup {
  category: string
  parameters: ParameterDefinition[]
}

export interface FixedParameterGroup {
  category: string
  parameters: ParameterDefinition[]
}

export type ParameterType = 'string' | 'number' | 'boolean' | 'date' | 'object'

export interface UseParametersOptions {
  initialParameters: ParameterDefinition[]
  searchTerm?: Ref<string>
  isGrouped?: Ref<boolean>
  sortBy?: Ref<'name' | 'category' | 'type' | 'fixed'>
  selectedCategories?: Ref<string[]>
  selectedTypes?: Ref<string[]>
}

export interface ParameterStats {
  total: number
  filtered: number
  fixedCount: number
  categories: string[]
  types: string[]
  groupCount: number
}
