export interface ParameterTableMapping {
  parameterId: string
  tableIds: string[] // Tables this parameter is added to
}

export type ParameterMappings = Record<string, ParameterTableMapping>
