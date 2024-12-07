import type {
  Parameter,
  BimParameter,
  UserParameter,
  ParameterValue,
  EquationValue,
  PrimitiveValue
} from '../types/parameters'

/**
 * Type Guards
 */
export function isBimParameter(param: Parameter): param is BimParameter {
  return param.kind === 'bim'
}

export function isUserParameter(param: Parameter): param is UserParameter {
  return param.kind === 'user'
}

export function isCustomParameter(
  param: Parameter
): param is UserParameter & { isCustom: true } {
  return isUserParameter(param) && param.isCustom === true
}

export function isEquationValue(value: ParameterValue): value is EquationValue {
  return (
    typeof value === 'object' &&
    value !== null &&
    'kind' in value &&
    value.kind === 'equation'
  )
}

export function isPrimitiveValue(value: ParameterValue): value is PrimitiveValue {
  return !isEquationValue(value)
}

/**
 * Value Conversion Utilities
 */
export function parameterValueToString(value: ParameterValue): string {
  if (value === null) return ''
  if (isEquationValue(value)) return value.expression
  return String(value)
}

export function stringToParameterValue(str: string, type: string): ParameterValue {
  if (!str) return null
  switch (type) {
    case 'number': {
      const num = parseFloat(str)
      return isNaN(num) ? null : num
    }
    case 'boolean':
      return str.toLowerCase() === 'true'
    case 'equation':
      return {
        kind: 'equation',
        expression: str,
        references: [],
        resultType: 'string'
      }
    default:
      return str
  }
}

/**
 * Parameter Creation Utilities
 */
export function createBimParameter(input: Omit<BimParameter, 'kind'>): BimParameter {
  return {
    ...input,
    kind: 'bim'
  }
}

export function createUserParameter(input: Omit<UserParameter, 'kind'>): UserParameter {
  return {
    ...input,
    kind: 'user'
  }
}

/**
 * Group Management Utilities
 */
export function getParameterGroup(param: Parameter): string {
  return isBimParameter(param) ? param.currentGroup : param.group
}

export function setParameterGroup(param: Parameter, group: string): Parameter {
  if (isBimParameter(param)) {
    return { ...param, currentGroup: group }
  }
  return { ...param, group }
}
