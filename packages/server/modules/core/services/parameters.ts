import { GraphQLError } from 'graphql'
import { v4 as uuid } from 'uuid'
import { db } from '@/db/knex'
import type { Knex } from 'knex'
import {
  Parameter,
  BimParameter,
  UserParameter,
  BimValueType,
  UserValueType,
  PrimitiveValue,
  ParameterValue,
  ValidationRules,
  ParameterStorage,
  TableParameterMapping,
  isBimParameter,
  isUserParameter
} from '@/modules/core/models/parameters'

interface CreateBimParameterInput {
  name: string
  type: BimValueType
  sourceValue: PrimitiveValue
  fetchedGroup: string
  currentGroup: string
  field: string
  header: string
  category?: string
  description?: string
  removable?: boolean
  visible?: boolean
  order?: number
  metadata?: Record<string, unknown>
  source?: string
}

interface CreateUserParameterInput {
  name: string
  type: UserValueType
  value: ParameterValue
  group: string
  equation?: string
  field: string
  header: string
  category?: string
  description?: string
  removable?: boolean
  visible?: boolean
  order?: number
  metadata?: Record<string, unknown>
  source?: string
  isCustom?: boolean
  validationRules?: ValidationRules
}

interface UserRecord {
  parameters?: ParameterStorage
  parameterMappings?: TableParameterMapping
}

export class ParameterService {
  async getParameters(userId: string): Promise<Parameter[]> {
    const user = (await db('users')
      .select('parameters')
      .where({ id: userId })
      .first()) as UserRecord | undefined

    return Object.values(user?.parameters || {})
  }

  async getParameter(id: string, userId: string): Promise<Parameter | null> {
    const user = (await db('users')
      .select('parameters')
      .where({ id: userId })
      .first()) as UserRecord | undefined

    return user?.parameters?.[id] || null
  }

  async getTableParameters(tableId: string, userId: string): Promise<Parameter[]> {
    const user = (await db('users')
      .select(['parameters', 'parameterMappings'])
      .where({ id: userId })
      .first()) as UserRecord | undefined

    const parameters = user?.parameters || {}
    const mappings = user?.parameterMappings || {}
    const parameterIds = mappings[tableId] || []

    return parameterIds
      .map((id) => parameters[id])
      .filter((param): param is Parameter => param !== undefined)
  }

  async createBimParameter(
    userId: string,
    input: CreateBimParameterInput
  ): Promise<BimParameter> {
    const id = uuid()

    const parameter: BimParameter = {
      id,
      kind: 'bim',
      name: input.name,
      type: input.type,
      sourceValue: input.sourceValue,
      value: input.sourceValue, // Initially same as sourceValue
      fetchedGroup: input.fetchedGroup,
      currentGroup: input.currentGroup,
      field: input.field,
      header: input.header,
      category: input.category,
      description: input.description,
      removable: input.removable ?? true,
      visible: input.visible ?? true,
      order: input.order,
      metadata: input.metadata,
      source: input.source
    }

    await db.transaction(async (trx: Knex.Transaction) => {
      const user = (await trx('users')
        .select('parameters')
        .where({ id: userId })
        .forUpdate()
        .first()) as UserRecord | undefined

      const parameters = user?.parameters || {}

      // Check for name conflicts
      const nameConflictExists = Object.values(parameters).some(
        (p) =>
          isBimParameter(p) &&
          p.name === input.name &&
          p.currentGroup === input.currentGroup
      )

      if (nameConflictExists) {
        throw new GraphQLError(
          'A BIM parameter with this name already exists in this group'
        )
      }

      parameters[id] = parameter

      await trx('users').where({ id: userId }).update({ parameters })
    })

    return parameter
  }

  async createUserParameter(
    userId: string,
    input: CreateUserParameterInput
  ): Promise<UserParameter> {
    const id = uuid()

    const parameter: UserParameter = {
      id,
      kind: 'user',
      name: input.name,
      type: input.type,
      value: input.value,
      group: input.group,
      equation: input.equation,
      field: input.field,
      header: input.header,
      category: input.category,
      description: input.description,
      removable: input.removable ?? true,
      visible: input.visible ?? true,
      order: input.order,
      metadata: input.metadata,
      source: input.source,
      isCustom: input.isCustom,
      validationRules: input.validationRules
    }

    await db.transaction(async (trx: Knex.Transaction) => {
      const user = (await trx('users')
        .select('parameters')
        .where({ id: userId })
        .forUpdate()
        .first()) as UserRecord | undefined

      const parameters = user?.parameters || {}

      // Check for name conflicts
      const nameConflictExists = Object.values(parameters).some(
        (p) => isUserParameter(p) && p.name === input.name && p.group === input.group
      )

      if (nameConflictExists) {
        throw new GraphQLError(
          'A user parameter with this name already exists in this group'
        )
      }

      parameters[id] = parameter

      await trx('users').where({ id: userId }).update({ parameters })
    })

    return parameter
  }

  async updateBimParameter(
    id: string,
    userId: string,
    input: Partial<Omit<CreateBimParameterInput, 'fetchedGroup'>>
  ): Promise<BimParameter> {
    const parameter = await this.getParameter(id, userId)
    if (!parameter || !isBimParameter(parameter)) {
      throw new GraphQLError('BIM parameter not found')
    }

    const updatedParameter: BimParameter = {
      ...parameter,
      ...input
    }

    await db.transaction(async (trx: Knex.Transaction) => {
      const user = (await trx('users')
        .select('parameters')
        .where({ id: userId })
        .forUpdate()
        .first()) as UserRecord | undefined

      const parameters = user?.parameters || {}

      // Check for name conflicts if name is being updated
      if (input.name) {
        const nameConflictExists = Object.values(parameters).some(
          (p) =>
            p.id !== id &&
            isBimParameter(p) &&
            p.name === input.name &&
            p.currentGroup === (input.currentGroup || parameter.currentGroup)
        )

        if (nameConflictExists) {
          throw new GraphQLError(
            'A BIM parameter with this name already exists in this group'
          )
        }
      }

      parameters[id] = updatedParameter

      await trx('users').where({ id: userId }).update({ parameters })
    })

    return updatedParameter
  }

  async updateUserParameter(
    id: string,
    userId: string,
    input: Partial<CreateUserParameterInput>
  ): Promise<UserParameter> {
    const parameter = await this.getParameter(id, userId)
    if (!parameter || !isUserParameter(parameter)) {
      throw new GraphQLError('User parameter not found')
    }

    const updatedParameter: UserParameter = {
      ...parameter,
      ...input
    }

    await db.transaction(async (trx: Knex.Transaction) => {
      const user = (await trx('users')
        .select('parameters')
        .where({ id: userId })
        .forUpdate()
        .first()) as UserRecord | undefined

      const parameters = user?.parameters || {}

      // Check for name conflicts if name is being updated
      if (input.name) {
        const nameConflictExists = Object.values(parameters).some(
          (p) =>
            p.id !== id &&
            isUserParameter(p) &&
            p.name === input.name &&
            p.group === (input.group || parameter.group)
        )

        if (nameConflictExists) {
          throw new GraphQLError(
            'A user parameter with this name already exists in this group'
          )
        }
      }

      parameters[id] = updatedParameter

      await trx('users').where({ id: userId }).update({ parameters })
    })

    return updatedParameter
  }

  async deleteParameter(id: string, userId: string): Promise<boolean> {
    await db.transaction(async (trx: Knex.Transaction) => {
      const user = (await trx('users')
        .select(['parameters', 'parameterMappings'])
        .where({ id: userId })
        .forUpdate()
        .first()) as UserRecord | undefined

      const parameters = user?.parameters || {}
      const mappings = user?.parameterMappings || {}

      if (!parameters[id]) {
        throw new GraphQLError('Parameter not found')
      }

      // Remove parameter
      delete parameters[id]

      // Remove from all mappings
      Object.keys(mappings).forEach((tableId) => {
        mappings[tableId] = (mappings[tableId] || []).filter(
          (parameterId) => parameterId !== id
        )
      })

      await trx('users').where({ id: userId }).update({
        parameters,
        parameterMappings: mappings
      })
    })

    return true
  }

  async addParameterToTable(
    parameterId: string,
    tableId: string,
    userId: string
  ): Promise<boolean> {
    await db.transaction(async (trx: Knex.Transaction) => {
      const user = (await trx('users')
        .select(['parameters', 'parameterMappings'])
        .where({ id: userId })
        .forUpdate()
        .first()) as UserRecord | undefined

      const parameters = user?.parameters || {}
      const mappings = user?.parameterMappings || {}

      if (!parameters[parameterId]) {
        throw new GraphQLError('Parameter not found')
      }

      if (!mappings[tableId]) {
        mappings[tableId] = []
      }

      if (!mappings[tableId].includes(parameterId)) {
        mappings[tableId].push(parameterId)
      }

      await trx('users').where({ id: userId }).update({ parameterMappings: mappings })
    })

    return true
  }

  async removeParameterFromTable(
    parameterId: string,
    tableId: string,
    userId: string
  ): Promise<boolean> {
    await db.transaction(async (trx: Knex.Transaction) => {
      const user = (await trx('users')
        .select(['parameters', 'parameterMappings'])
        .where({ id: userId })
        .forUpdate()
        .first()) as UserRecord | undefined

      const parameters = user?.parameters || {}
      const mappings = user?.parameterMappings || {}

      if (!parameters[parameterId]) {
        throw new GraphQLError('Parameter not found')
      }

      if (mappings[tableId]) {
        mappings[tableId] = mappings[tableId].filter((id) => id !== parameterId)
      }

      await trx('users').where({ id: userId }).update({ parameterMappings: mappings })
    })

    return true
  }
}

// Export singleton instance
export const parameterService = new ParameterService()
