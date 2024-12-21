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
