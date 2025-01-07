const { getTables, updateTables } = require('../../../core/services/users/settings')
const { moduleLogger } = require('@/logging')

/** @type {import('modules/core/graph/generated/graphql').Resolvers} */
const resolvers = {
  Query: {
    async tableSettingsP(_parent, _args, context) {
      moduleLogger.info('tableSettingsP query called')
      const userId = context.userId
      if (!userId) throw new Error('User not authenticated')

      const tables = await getTables(userId)
      return Object.values(tables)
    },

    async tableSettings(_parent, { id }, context) {
      moduleLogger.info('tableSettings query called', { id })
      const userId = context.userId
      if (!userId) throw new Error('User not authenticated')

      const tables = await getTables(userId)
      return tables[id] || null
    }
  },

  Mutation: {
    async createNamedTable(_parent, { input }, context) {
      moduleLogger.info('createNamedTable mutation called', { input })
      const userId = context.userId
      if (!userId) throw new Error('User not authenticated')

      const tables = await getTables(userId)
      const newTable = {
        id: input.id || crypto.randomUUID(),
        name: input.name,
        displayName: input.name,
        config: input.config,
        categoryFilters: input.categoryFilters,
        lastUpdateTimestamp: Date.now()
      }

      const updatedTables = {
        ...tables,
        [newTable.id]: newTable
      }

      await updateTables(userId, updatedTables)
      moduleLogger.info('createNamedTable completed', { newTableId: newTable.id })
      return newTable
    },

    async updateNamedTable(_parent, { input }, context) {
      moduleLogger.info('updateNamedTable mutation called', { input })
      const userId = context.userId
      if (!userId) throw new Error('User not authenticated')

      const tables = await getTables(userId)
      moduleLogger.info('Current tables', { tables })

      const existingTable = tables[input.id]
      if (!existingTable) {
        moduleLogger.error('Table not found', { tableId: input.id })
        throw new Error(`Table ${input.id} not found`)
      }

      const updatedTable = {
        ...existingTable,
        name: input.name || existingTable.name,
        displayName: input.displayName || existingTable.displayName,
        config: input.config || existingTable.config,
        categoryFilters: input.categoryFilters || existingTable.categoryFilters,
        sort: input.sort || existingTable.sort,
        filters: input.filters || existingTable.filters,
        lastUpdateTimestamp: Date.now()
      }

      const updatedTables = {
        ...tables,
        [input.id]: updatedTable
      }

      await updateTables(userId, updatedTables)
      moduleLogger.info('updateNamedTable completed', { 
        tableId: input.id,
        updatedTable 
      })
      return updatedTable
    },

    async deleteNamedTable(_parent, { id }, context) {
      moduleLogger.info('deleteNamedTable mutation called', { id })
      const userId = context.userId
      if (!userId) throw new Error('User not authenticated')

      const tables = await getTables(userId)
      const { [id]: deletedTable, ...remainingTables } = tables

      if (!deletedTable) {
        moduleLogger.error('Table not found', { tableId: id })
        throw new Error(`Table ${id} not found`)
      }

      await updateTables(userId, remainingTables)
      moduleLogger.info('deleteNamedTable completed', { deletedTableId: id })
      return true
    }
  }
}

module.exports = resolvers
