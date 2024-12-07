const { parameterService } = require('../../services/parameters.js')

/**
 * Type resolvers for Parameter union
 */
const parameterTypeResolvers = {
  Parameter: {
    __resolveType(obj) {
      return obj.kind === 'bim' ? 'BimParameter' : 'UserParameter'
    }
  },

  BimParameter: {
    kind: () => 'bim',
    value: (param) => String(param.value || ''),
    sourceValue: (param) => String(param.sourceValue || ''),
    metadata: (param) => param.metadata || {}
  },

  UserParameter: {
    kind: () => 'user',
    value: (param) => String(param.value || ''),
    metadata: (param) => param.metadata || {}
  }
}

/**
 * Query resolvers
 */
const queryResolvers = {
  parameters: async (_parent, _args, context) => {
    if (!context.userId) throw new Error('User not authenticated')
    return parameterService.getParameters(context.userId)
  },

  parameter: async (_parent, { id }, context) => {
    if (!context.userId) throw new Error('User not authenticated')
    return parameterService.getParameter(id, context.userId)
  },

  tableParameters: async (_parent, { tableId }, context) => {
    if (!context.userId) throw new Error('User not authenticated')
    return parameterService.getTableParameters(tableId, context.userId)
  }
}

/**
 * Mutation resolvers
 */
const mutationResolvers = {
  createBimParameter: async (_parent, { input }, context) => {
    if (!context.userId) throw new Error('User not authenticated')
    const parameter = await parameterService.createBimParameter(context.userId, input)
    return { parameter }
  },

  createUserParameter: async (_parent, { input }, context) => {
    if (!context.userId) throw new Error('User not authenticated')
    const parameter = await parameterService.createUserParameter(context.userId, input)
    return { parameter }
  },

  updateBimParameter: async (_parent, { id, input }, context) => {
    if (!context.userId) throw new Error('User not authenticated')
    const parameter = await parameterService.updateBimParameter(id, context.userId, input)
    return { parameter }
  },

  updateUserParameter: async (_parent, { id, input }, context) => {
    if (!context.userId) throw new Error('User not authenticated')
    const parameter = await parameterService.updateUserParameter(id, context.userId, input)
    return { parameter }
  },

  deleteParameter: async (_parent, { id }, context) => {
    if (!context.userId) throw new Error('User not authenticated')
    return parameterService.deleteParameter(id, context.userId)
  },

  addParameterToTable: async (_parent, { parameterId, tableId }, context) => {
    if (!context.userId) throw new Error('User not authenticated')
    return parameterService.addParameterToTable(parameterId, tableId, context.userId)
  },

  removeParameterFromTable: async (_parent, { parameterId, tableId }, context) => {
    if (!context.userId) throw new Error('User not authenticated')
    return parameterService.removeParameterFromTable(parameterId, tableId, context.userId)
  }
}

module.exports = {
  ...parameterTypeResolvers,
  Query: queryResolvers,
  Mutation: mutationResolvers
}
