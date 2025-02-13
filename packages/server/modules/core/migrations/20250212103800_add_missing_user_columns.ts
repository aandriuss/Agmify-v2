import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    // Add JSON columns for user configurations
    table.jsonb('usersettings').defaultTo('{}')
    table.jsonb('tables').defaultTo('{}')
    table.jsonb('parameters').defaultTo('{}')
    table.jsonb('parameterMappings').defaultTo('{}')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('usersettings')
    table.dropColumn('tables')
    table.dropColumn('parameters')
    table.dropColumn('parameterMappings')
  })
}
