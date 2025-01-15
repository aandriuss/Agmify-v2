import { GraphQLError } from 'graphql'
import { v4 as uuid } from 'uuid'
import { db } from '@/db/knex'
import type { Knex } from 'knex'
import {
  UserParameter,
  UserValueType,
  ParameterValue,
  ValidationRules,
  ParameterMetadata,
  Group
} from 'modules/core/models/parameters'

interface CreateUserParameterInput {
  name: string
  type: UserValueType
  value: ParameterValue
  group: Group
  equation?: string
  field: string
  header: string
  category?: string
  description?: string
  removable?: boolean
  visible?: boolean
  order?: number
  metadata?: Partial<ParameterMetadata>
  source?: string
  isCustom?: boolean
  validationRules?: ValidationRules
}

interface UserRecord {
  parameters?: Record<string, UserParameter>
  parameterMappings?: Record<string, string[]>
}

// Metadata validation
function isValidMetadata(metadata: unknown): metadata is ParameterMetadata {
  if (!metadata || typeof metadata !== 'object') return false
  const m = metadata as Record<string, unknown>

  // Validate types of optional fields if present
  if ('category' in m && typeof m.category !== 'string') return false
  if ('fullKey' in m && typeof m.fullKey !== 'string') return false
  if ('isSystem' in m && typeof m.isSystem !== 'boolean') return false
  if ('elementId' in m && typeof m.elementId !== 'string') return false
  if ('isNested' in m && typeof m.isNested !== 'boolean') return false
  if ('parentKey' in m && typeof m.parentKey !== 'string') return false
  if ('isJsonString' in m && typeof m.isJsonString !== 'boolean') return false
  if ('displayName' in m && typeof m.displayName !== 'string') return false

  return true
}

export class ParameterService {
  async getParameters(userId: string): Promise<UserParameter[]> {
    const user = (await db('users')
      .select('parameters')
      .where({ id: userId })
      .first()) as UserRecord | undefined

    return Object.values(user?.parameters || {})
  }

  async getParameter(id: string, userId: string): Promise<UserParameter | null> {
    const user = (await db('users')
      .select('parameters')
      .where({ id: userId })
      .first()) as UserRecord | undefined

    return user?.parameters?.[id] || null
  }

  async getTableParameters(tableId: string, userId: string): Promise<UserParameter[]> {
    const user = (await db('users')
      .select(['parameters', 'parameterMappings'])
      .where({ id: userId })
      .first()) as UserRecord | undefined

    const parameters = user?.parameters || {}
    const mappings = user?.parameterMappings || {}
    const parameterIds = mappings[tableId] || []

    return parameterIds
      .map((id) => parameters[id])
      .filter((p): p is UserParameter => p !== undefined)
  }

  async createUserParameter(
    userId: string,
    input: CreateUserParameterInput
  ): Promise<UserParameter> {
    const id = uuid()

    // Validate metadata if provided
    if (input.metadata && !isValidMetadata(input.metadata)) {
      throw new GraphQLError('Invalid parameter metadata')
    }

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
      metadata: input.metadata as ParameterMetadata,
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
        (p) => p.name === input.name && p.group === input.group
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

  async updateUserParameter(
    id: string,
    userId: string,
    input: Partial<CreateUserParameterInput>
  ): Promise<UserParameter> {
    const parameter = await this.getParameter(id, userId)
    if (!parameter) {
      throw new GraphQLError('User parameter not found')
    }

    // Validate metadata if provided
    if (input.metadata && !isValidMetadata(input.metadata)) {
      throw new GraphQLError('Invalid parameter metadata')
    }

    const updatedParameter: UserParameter = {
      ...parameter,
      ...input,
      metadata: (input.metadata as ParameterMetadata) ?? parameter.metadata
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
