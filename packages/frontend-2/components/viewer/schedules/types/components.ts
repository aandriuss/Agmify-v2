import type { TableConfig } from './'

export interface ScheduleDataManagementExposed {
  updateData: () => Promise<void>
}

export interface ScheduleParameterHandlingExposed {
  updateParameters: () => Promise<void>
}

export interface ScheduleColumnManagementExposed {
  updateColumns: () => Promise<void>
}

export interface ScheduleInitializationInstance {
  initialize: () => Promise<void>
  createNamedTable: (
    name: string,
    config: Omit<TableConfig, 'id' | 'name'>
  ) => Promise<TableConfig>
  updateNamedTable: (id: string, config: Partial<TableConfig>) => Promise<TableConfig>
}
