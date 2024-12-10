import type { Parameter } from '~/composables/core/types'
import { createBimParameterWithDefaults } from '~/composables/core/types/parameters/parameter-types'

/**
 * Fixed parameters for parent nodes
 * These are the default parameters that are always available for parent nodes
 */
export const FIXED_PARENT_PARAMETERS: Parameter[] = [
  createBimParameterWithDefaults({
    id: 'fp1',
    name: 'Category',
    field: 'category',
    visible: true,
    header: 'Category',
    category: 'Classification',
    type: 'string',
    removable: false,
    sourceValue: null,
    fetchedGroup: '',
    currentGroup: '',
    value: null
  }),
  createBimParameterWithDefaults({
    id: 'fp2',
    name: 'ID',
    field: 'id',
    visible: true,
    header: 'ID',
    category: 'Classification',
    type: 'string',
    removable: true,
    sourceValue: null,
    fetchedGroup: '',
    currentGroup: '',
    value: null
  }),
  createBimParameterWithDefaults({
    id: 'fp3',
    name: 'Mark',
    field: 'mark',
    visible: true,
    header: 'Mark',
    category: 'Classification',
    type: 'string',
    removable: true,
    sourceValue: null,
    fetchedGroup: '',
    currentGroup: '',
    value: null
  }),
  createBimParameterWithDefaults({
    id: 'fp4',
    name: 'Host',
    field: 'host',
    visible: true,
    header: 'Host',
    category: 'Classification',
    type: 'string',
    removable: true,
    sourceValue: null,
    fetchedGroup: '',
    currentGroup: '',
    value: null
  }),
  createBimParameterWithDefaults({
    id: 'fp5',
    name: 'Comment',
    field: 'comment',
    visible: true,
    header: 'Comment',
    category: 'Classification',
    type: 'string',
    removable: true,
    sourceValue: null,
    fetchedGroup: '',
    currentGroup: '',
    value: null
  }),
  createBimParameterWithDefaults({
    id: 'fp6',
    name: 'Width',
    field: 'width',
    visible: true,
    header: 'Width',
    category: 'Dimensions',
    type: 'number',
    removable: true,
    sourceValue: null,
    fetchedGroup: '',
    currentGroup: '',
    value: null
  }),
  createBimParameterWithDefaults({
    id: 'fp7',
    name: 'Height',
    field: 'height',
    visible: true,
    header: 'Height',
    category: 'Dimensions',
    type: 'number',
    removable: true,
    sourceValue: null,
    fetchedGroup: '',
    currentGroup: '',
    value: null
  }),
  createBimParameterWithDefaults({
    id: 'fp8',
    name: 'Thickness',
    field: 'thickness',
    visible: true,
    header: 'Thickness',
    category: 'Dimensions',
    type: 'number',
    removable: true,
    sourceValue: null,
    fetchedGroup: '',
    currentGroup: '',
    value: null
  }),
  createBimParameterWithDefaults({
    id: 'fp9',
    name: 'Area',
    field: 'area',
    visible: true,
    header: 'Area',
    category: 'Dimensions',
    type: 'number',
    removable: true,
    sourceValue: null,
    fetchedGroup: '',
    currentGroup: '',
    value: null
  })
]

/**
 * Fixed parameters for child nodes
 * These are the default parameters that are always available for child nodes
 */
export const FIXED_CHILD_PARAMETERS: Parameter[] = [
  createBimParameterWithDefaults({
    id: 'fc1',
    name: 'Category',
    field: 'category',
    visible: true,
    header: 'Category',
    category: 'Classification',
    type: 'string',
    removable: false,
    sourceValue: null,
    fetchedGroup: '',
    currentGroup: '',
    value: null
  }),
  createBimParameterWithDefaults({
    id: 'fc2',
    name: 'ID',
    field: 'id',
    visible: true,
    header: 'ID',
    category: 'Classification',
    type: 'string',
    removable: true,
    sourceValue: null,
    fetchedGroup: '',
    currentGroup: '',
    value: null
  }),
  createBimParameterWithDefaults({
    id: 'fc3',
    name: 'Mark',
    field: 'mark',
    visible: true,
    header: 'Mark',
    category: 'Classification',
    type: 'string',
    removable: true,
    sourceValue: null,
    fetchedGroup: '',
    currentGroup: '',
    value: null
  }),
  createBimParameterWithDefaults({
    id: 'fc4',
    name: 'Width',
    field: 'width',
    visible: true,
    header: 'Width',
    category: 'Dimensions',
    type: 'number',
    removable: true,
    sourceValue: null,
    fetchedGroup: '',
    currentGroup: '',
    value: null
  }),
  createBimParameterWithDefaults({
    id: 'fc5',
    name: 'Height',
    field: 'height',
    visible: true,
    header: 'Height',
    category: 'Dimensions',
    type: 'number',
    removable: true,
    sourceValue: null,
    fetchedGroup: '',
    currentGroup: '',
    value: null
  }),
  createBimParameterWithDefaults({
    id: 'fc6',
    name: 'Length',
    field: 'length',
    visible: true,
    header: 'Length',
    category: 'Dimensions',
    type: 'number',
    removable: true,
    sourceValue: null,
    fetchedGroup: '',
    currentGroup: '',
    value: null
  })
]

/**
 * Parameter categories
 * These are the default categories that parameters can be grouped into
 */
export const PARAMETER_CATEGORIES = {
  CLASSIFICATION: 'Classification',
  DIMENSIONS: 'Dimensions',
  CUSTOM: 'Custom'
} as const

/**
 * Parameter types
 * These are the available types for parameters
 */
export const PARAMETER_TYPES = {
  STRING: 'string',
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  DATE: 'date',
  OBJECT: 'object',
  ARRAY: 'array'
} as const
