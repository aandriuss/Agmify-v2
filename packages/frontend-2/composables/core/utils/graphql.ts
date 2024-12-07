import type {
  Parameter,
  BimParameter,
  UserParameter,
  BimValueType,
  PrimitiveValue,
  ParameterValue
} from '../types'

import type { GQLParameter, BimGQLParameter, UserGQLParameter } from '../types/graphql'

import { isEquationValue } from './parameters'

/**
 * Convert string value from GraphQL to proper ParameterValue
 */
function parseGQLValue(value: string, type: BimValueType): PrimitiveValue {
  if (!value) return null
  switch (type) {
    case 'number': {
      const num = parseFloat(value)
      return isNaN(num) ? null : num
    }
    case 'boolean':
      return value.toLowerCase() === 'true'
    default:
      return value
  }
}

/**
 * Convert ParameterValue to string for GraphQL
 */
function stringifyValue(value: ParameterValue): string {
  if (value === null) return ''
  if (isEquationValue(value)) return value.expression
  return String(value)
}

/**
 * Convert GraphQL parameter to core Parameter
 */
export function convertToParameter(gqlParam: GQLParameter): Parameter {
  const baseProps = {
    id: gqlParam.id,
    name: gqlParam.name,
    field: gqlParam.field,
    visible: gqlParam.visible,
    header: gqlParam.header,
    description: gqlParam.description,
    category: gqlParam.category,
    order: gqlParam.order,
    computed: gqlParam.computed,
    source: gqlParam.source,
    removable: gqlParam.removable,
    metadata: gqlParam.metadata || {}
  }

  if (gqlParam.kind === 'bim') {
    const bimParam: BimParameter = {
      ...baseProps,
      kind: 'bim',
      type: gqlParam.type,
      value: parseGQLValue(gqlParam.value, gqlParam.type),
      sourceValue: parseGQLValue(gqlParam.sourceValue, gqlParam.type),
      fetchedGroup: gqlParam.fetchedGroup,
      currentGroup: gqlParam.currentGroup
    }
    return bimParam
  } else {
    const userParam: UserParameter = {
      ...baseProps,
      kind: 'user',
      type: gqlParam.type,
      value: parseGQLValue(gqlParam.value, 'string'),
      group: gqlParam.group,
      equation: gqlParam.equation,
      isCustom: gqlParam.isCustom
    }
    return userParam
  }
}

/**
 * Convert core Parameter to GraphQL parameter
 */
export function convertToGQLParameter(param: Parameter): GQLParameter {
  const baseProps = {
    id: param.id,
    name: param.name,
    field: param.field,
    visible: param.visible,
    header: param.header,
    description: param.description,
    category: param.category,
    order: param.order,
    computed: param.computed,
    source: param.source,
    removable: param.removable,
    metadata: param.metadata,
    value: stringifyValue(param.value)
  }

  if (param.kind === 'bim') {
    const bimGQLParam: BimGQLParameter = {
      ...baseProps,
      kind: 'bim',
      type: param.type,
      sourceValue: stringifyValue(param.sourceValue),
      fetchedGroup: param.fetchedGroup,
      currentGroup: param.currentGroup
    }
    return bimGQLParam
  } else {
    const userGQLParam: UserGQLParameter = {
      ...baseProps,
      kind: 'user',
      type: param.type,
      group: param.group,
      equation: param.equation,
      isCustom: param.isCustom
    }
    return userGQLParam
  }
}
