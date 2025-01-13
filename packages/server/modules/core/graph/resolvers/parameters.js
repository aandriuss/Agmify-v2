const { parameterService } = require('../../services/parameters.js')
const { db } = require('@/db/knex')

/**
 * Type resolvers for UserParameter
 */
const parameterTypeResolvers = {
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
    const user = await db('users')
      .select('parameters')
      .where({ id: context.userId })
      .first()
    return user?.parameters || {}
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
  createUserParameter: async (_parent, { input }, context) => {
    if (!context.userId) throw new Error('User not authenticated')
    const parameter = await parameterService.createUserParameter(context.userId, input)
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
