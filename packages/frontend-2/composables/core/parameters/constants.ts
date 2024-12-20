import type { AvailableBimParameter as Parameter } from '~/composables/core/types/parameters/parameter-states'
import { createAvailableBimParameter } from '~/composables/core/types/parameters/parameter-states'

/**
 * Fixed parameters for parent nodes
 * These are the default parameters that are always available for parent nodes
 */
export const FIXED_PARENT_PARAMETERS: Parameter[] = [
  createAvailableBimParameter(
    {
      id: 'fp1',
      name: 'Category',
      sourceGroup: 'Classification',
      value: null
    },
    'string',
    null,
    false
  ),
  createAvailableBimParameter(
    {
      id: 'fp2',
      name: 'ID',
      sourceGroup: 'Classification',
      value: null
    },
    'string',
    null,
    true
  ),
  createAvailableBimParameter(
    {
      id: 'fp3',
      name: 'Mark',
      sourceGroup: 'Classification',
      value: null
    },
    'string',
    null,
    true
  ),
  createAvailableBimParameter(
    {
      id: 'fp4',
      name: 'Host',
      sourceGroup: 'Classification',
      value: null
    },
    'string',
    null,
    true
  ),
  createAvailableBimParameter(
    {
      id: 'fp5',
      name: 'Comment',
      sourceGroup: 'Classification',
      value: null
    },
    'string',
    null,
    true
  ),
  createAvailableBimParameter(
    {
      id: 'fp6',
      name: 'Width',
      sourceGroup: 'Dimensions',
      value: null
    },
    'number',
    null,
    true
  ),
  createAvailableBimParameter(
    {
      id: 'fp7',
      name: 'Height',
      sourceGroup: 'Dimensions',
      value: null
    },
    'number',
    null,
    true
  ),
  createAvailableBimParameter(
    {
      id: 'fp8',
      name: 'Thickness',
      sourceGroup: 'Dimensions',
      value: null
    },
    'number',
    null,
    true
  ),
  createAvailableBimParameter(
    {
      id: 'fp9',
      name: 'Area',
      sourceGroup: 'Dimensions',
      value: null
    },
    'number',
    null,
    true
  )
]

/**
 * Fixed parameters for child nodes
 * These are the default parameters that are always available for child nodes
 */
export const FIXED_CHILD_PARAMETERS: Parameter[] = [
  createAvailableBimParameter(
    {
      id: 'fc1',
      name: 'Category',
      sourceGroup: 'Classification',
      value: null
    },
    'string',
    null,
    false
  ),
  createAvailableBimParameter(
    {
      id: 'fc2',
      name: 'ID',
      sourceGroup: 'Classification',
      value: null
    },
    'string',
    null,
    true
  ),
  createAvailableBimParameter(
    {
      id: 'fc3',
      name: 'Mark',
      sourceGroup: 'Classification',
      value: null
    },
    'string',
    null,
    true
  ),
  createAvailableBimParameter(
    {
      id: 'fc4',
      name: 'Width',
      sourceGroup: 'Dimensions',
      value: null
    },
    'number',
    null,
    true
  ),
  createAvailableBimParameter(
    {
      id: 'fc5',
      name: 'Height',
      sourceGroup: 'Dimensions',
      value: null
    },
    'number',
    null,
    true
  ),
  createAvailableBimParameter(
    {
      id: 'fc6',
      name: 'Length',
      sourceGroup: 'Dimensions',
      value: null
    },
    'number',
    null,
    true
  )
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
