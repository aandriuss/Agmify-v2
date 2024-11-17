import type { ParameterValueType } from '../../types'

export interface CategoryDefinition {
  id: string
  name: string
  type?: ParameterValueType
  description?: string
  parent?: string
  children?: string[]
}

export interface CategoryHierarchy {
  nodes: CategoryDefinition[]
  edges: { source: string; target: string }[]
}

export interface CategoryState {
  selectedParentCategories: string[]
  selectedChildCategories: string[]
  hierarchy: CategoryHierarchy
}

export interface CategoryMutations {
  setCategories: (parent: string[], child: string[]) => void
  setHierarchy: (hierarchy: CategoryHierarchy) => void
  toggleCategory: (type: 'parent' | 'child', id: string) => void
}

export interface CategoryProcessingOptions {
  includeOrphans?: boolean
  maxDepth?: number
  validateRelations?: boolean
}
