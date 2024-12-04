import type {
  ParameterDefinition,
  ParameterType,
  ParameterValue
} from '~/composables/core/types'
import { ValidationError } from '~/composables/core/types'

// Validation rule interface
export interface ValidationRule {
  validate: (value: unknown) => boolean
  message: string
}

// Validation rule set for a parameter
export interface ParameterValidation {
  type: ParameterType
  required?: boolean
  rules: ValidationRule[]
}

// Validation options
export interface ValidationOptions {
  strict?: boolean
  allowNull?: boolean
  allowUndefined?: boolean
}

const defaultOptions: Required<ValidationOptions> = {
  strict: true,
  allowNull: true, // Changed to true
  allowUndefined: true // Changed to true
}

// Create parameter validation
export function createParameterValidation(
  type: ParameterType,
  options: ValidationOptions = {}
): ParameterValidation {
  const opts = { ...defaultOptions, ...options }
  const rules: ValidationRule[] = []

  // Add basic type validation
  rules.push(createTypeValidation(type, opts))

  // Add null/undefined validation
  if (!opts.allowNull) {
    rules.push({
      validate: (value: unknown) => value !== null,
      message: 'Value cannot be null'
    })
  }

  if (!opts.allowUndefined) {
    rules.push({
      validate: (value: unknown) => value !== undefined,
      message: 'Value cannot be undefined'
    })
  }

  return {
    type,
    rules
  }
}

// Create type-specific validation
function createTypeValidation(
  type: ParameterType,
  options: Required<ValidationOptions>
): ValidationRule {
  switch (type) {
    case 'string':
      return {
        validate: (value: unknown) =>
          !options.strict || typeof value === 'string' || value === null,
        message: 'Value must be a string'
      }

    case 'number':
      return {
        validate: (value: unknown) => {
          if (options.strict && typeof value !== 'number') return false
          const num = Number(value)
          return !isNaN(num)
        },
        message: 'Value must be a valid number'
      }

    case 'boolean':
      return {
        validate: (value: unknown) => !options.strict || typeof value === 'boolean',
        message: 'Value must be a boolean'
      }

    case 'date':
      return {
        validate: (value: unknown) => {
          if (value instanceof Date) return !isNaN(value.getTime())
          if (options.strict) return false
          const date = new Date(value as string | number)
          return !isNaN(date.getTime())
        },
        message: 'Value must be a valid date'
      }

    default:
      throw new ValidationError('type', type, `Unsupported parameter type: ${type}`)
  }
}

// Add custom validation rule
export function addValidationRule(
  validation: ParameterValidation,
  rule: ValidationRule
): ParameterValidation {
  return {
    ...validation,
    rules: [...validation.rules, rule]
  }
}

// Validate a parameter value
export function validateParameterValue(
  value: unknown,
  validation: ParameterValidation
): value is ParameterValue {
  for (const rule of validation.rules) {
    if (!rule.validate(value)) {
      throw new ValidationError('validation', value, rule.message)
    }
  }
  return true
}

// Common validation rules
export const commonRules = {
  required: (): ValidationRule => ({
    validate: (value: unknown) => value !== null && value !== undefined,
    message: 'Value is required'
  }),

  minLength: (min: number): ValidationRule => ({
    validate: (value: unknown) => typeof value === 'string' && value.length >= min,
    message: `Value must be at least ${min} characters long`
  }),

  maxLength: (max: number): ValidationRule => ({
    validate: (value: unknown) => typeof value === 'string' && value.length <= max,
    message: `Value must be at most ${max} characters long`
  }),

  min: (min: number): ValidationRule => ({
    validate: (value: unknown) => typeof value === 'number' && value >= min,
    message: `Value must be greater than or equal to ${min}`
  }),

  max: (max: number): ValidationRule => ({
    validate: (value: unknown) => typeof value === 'number' && value <= max,
    message: `Value must be less than or equal to ${max}`
  }),

  pattern: (regex: RegExp): ValidationRule => ({
    validate: (value: unknown) => typeof value === 'string' && regex.test(value),
    message: `Value must match pattern ${regex}`
  }),

  enum: (values: unknown[]): ValidationRule => ({
    validate: (value: unknown) => values.includes(value),
    message: `Value must be one of: ${values.join(', ')}`
  })
}

// Create parameter definition with validation
export function createParameterDefinition(
  id: string,
  name: string,
  validation: ParameterValidation
): ParameterDefinition {
  return {
    id,
    name,
    type: validation.type,
    validation: (value: unknown) => {
      try {
        return validateParameterValue(value, validation)
      } catch {
        return false
      }
    }
  }
}
