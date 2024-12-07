import { GraphQLError } from 'graphql'
import { v4 as uuid } from 'uuid'
import knex from '@/db/knex'

export interface Parameter {
  id: string
  userId: string
  name: string
  type: 'fixed' | 'equation'
  value?: string
  equation?: string
  group: string
  field: string
  header: string
  category?: string
  description?: string
  removable: boolean
  visible: boolean
  orderIndex?: number
  createdAt: Date
  updatedAt: Date
  metadata?: unknown
  isFetched?: boolean
  source?: string
}

export interface CreateParameterInput {
  userId: string
  name: string
  type: 'fixed' | 'equation'
  value?: string
  equation?: string
  group: string
  field: string
  header: string
  category?: string
  description?: string
  removable?: boolean
  visible?: boolean
  orderIndex?: number
  metadata?: unknown
  isFetched?: boolean
  source?: string
}

export interface UpdateParameterInput {
  name?: string
  type?: 'fixed' | 'equation'
  value?: string
  equation?: string
  group?: string
  field?: string
  header?: string
  category?: string
  description?: string
  removable?: boolean
  visible?: boolean
  orderIndex?: number
  metadata?: unknown
  isFetched?: boolean
  source?: string
}

export interface ParameterMutationResponse {
  parameter: Parameter
}

interface ParameterStorage {
  [key: string]: Parameter
}

interface ParameterRelations {
  [parameterId: string]: string[]
}

interface UserRecord {
  parameters?: ParameterStorage
  parameter_relations?: ParameterRelations
}

export class ParameterService {
  async getParameters(userId: string): Promise<Parameter[]> {
    const user = (await knex('users')
      .select('parameters')
      .where({ id: userId })
      .first()) as UserRecord

    const parameters = user?.parameters || {}
    return Object.values(parameters)
  }

  async getParameter(id: string, userId: string): Promise<Parameter | null> {
    const user = (await knex('users')
      .select('parameters')
      .where({ id: userId })
      .first()) as UserRecord

    const parameters = user?.parameters || {}
    const parameter = parameters[id]

    if (!parameter || parameter.userId !== userId) return null
    return parameter
  }

  async getTableParameters(tableId: string, userId: string): Promise<Parameter[]> {
    const user = (await knex('users')
      .select(['parameters', 'parameter_relations'])
      .where({ id: userId })
      .first()) as UserRecord

    const parameters = user?.parameters || {}
    const relations = user?.parameter_relations || {}
    const tableParameters: Parameter[] = []

    for (const [parameterId, tables] of Object.entries(relations)) {
      if (Array.isArray(tables) && tables.includes(tableId)) {
        const parameter = parameters[parameterId]
        if (parameter) {
          tableParameters.push(parameter)
        }
      }
    }

    return tableParameters
  }

  async createParameter(
    input: CreateParameterInput
  ): Promise<ParameterMutationResponse> {
    const id = uuid()
    const now = new Date()

    const parameter: Parameter = {
      id,
      userId: input.userId,
      name: input.name,
      type: input.type,
      value: input.value,
      equation: input.equation,
      group: input.group,
      field: input.field,
      header: input.header,
      category: input.category,
      description: input.description,
      removable: input.removable ?? true,
      visible: input.visible ?? true,
      orderIndex: input.orderIndex,
      metadata: input.metadata,
      isFetched: input.isFetched,
      source: input.source,
      createdAt: now,
      updatedAt: now
    }

    // Get current parameters
    const user = (await knex('users')
      .select('parameters')
      .where({ id: input.userId })
      .first()) as UserRecord

    const parameters = user?.parameters || {}
    parameters[id] = parameter

    // Update parameters JSONB column
    await knex('users').where({ id: input.userId }).update({ parameters })

    return { parameter }
  }

  async updateParameter(
    id: string,
    userId: string,
    input: UpdateParameterInput
  ): Promise<ParameterMutationResponse> {
    // Get current parameters
    const user = (await knex('users')
      .select('parameters')
      .where({ id: userId })
      .first()) as UserRecord

    const parameters = user?.parameters || {}
    const parameter = parameters[id]

    if (!parameter || parameter.userId !== userId) {
      throw new GraphQLError('Parameter not found')
    }

    const updated: Parameter = {
      ...parameter,
      ...input,
      updatedAt: new Date()
    }

    parameters[id] = updated

    // Update parameters JSONB column
    await knex('users').where({ id: userId }).update({ parameters })

    return { parameter: updated }
  }

  async deleteParameter(id: string, userId: string): Promise<boolean> {
    // Get current parameters
    const user = (await knex('users')
      .select(['parameters', 'parameter_relations'])
      .where({ id: userId })
      .first()) as UserRecord

    const parameters = user?.parameters || {}
    const relations = user?.parameter_relations || {}
    const parameter = parameters[id]

    if (!parameter || parameter.userId !== userId) return false

    // Remove parameter
    delete parameters[id]
    delete relations[id]

    // Update both JSONB columns
    await knex('users').where({ id: userId }).update({
      parameters,
      parameter_relations: relations
    })

    return true
  }

  async addParameterToTable(
    parameterId: string,
    tableId: string,
    userId: string
  ): Promise<boolean> {
    // Check parameter exists
    const parameter = await this.getParameter(parameterId, userId)
    if (!parameter) {
      throw new GraphQLError('Parameter not found')
    }

    // Get current relations
    const user = (await knex('users')
      .select('parameter_relations')
      .where({ id: userId })
      .first()) as UserRecord

    const relations = user?.parameter_relations || {}

    if (!relations[parameterId]) {
      relations[parameterId] = []
    }

    if (!relations[parameterId].includes(tableId)) {
      relations[parameterId].push(tableId)
    }

    // Update relations JSONB column
    await knex('users').where({ id: userId }).update({ parameter_relations: relations })

    return true
  }

  async removeParameterFromTable(
    parameterId: string,
    tableId: string,
    userId: string
  ): Promise<boolean> {
    // Check parameter exists
    const parameter = await this.getParameter(parameterId, userId)
    if (!parameter) {
      throw new GraphQLError('Parameter not found')
    }

    // Get current relations
    const user = (await knex('users')
      .select('parameter_relations')
      .where({ id: userId })
      .first()) as UserRecord

    const relations = user?.parameter_relations || {}

    if (relations[parameterId]) {
      relations[parameterId] = relations[parameterId].filter(
        (id: string) => id !== tableId
      )
    }

    // Update relations JSONB column
    await knex('users').where({ id: userId }).update({ parameter_relations: relations })

    return true
  }
}

// Export singleton instance
export const parameterService = new ParameterService()
