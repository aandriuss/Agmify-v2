import type { Parameter, TableConfig } from '~/composables/core/types'

/**
 * Table settings interface
 */
export interface TableSettings {
  controlWidth: number
  namedTables: Record<string, NamedTableConfig>
  customParameters: Parameter[]
}

/**
 * Named table configuration interface
 */
export interface NamedTableConfig extends TableConfig {
  displayName: string
  description?: string
  userParameters?: Parameter[]
}
