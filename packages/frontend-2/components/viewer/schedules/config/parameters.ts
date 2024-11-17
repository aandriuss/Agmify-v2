import type { BIMNodeRaw } from '../types'
import { convertToString } from '../utils/dataConversion'

// Parameter definition type
export interface BIMParameter {
  name: string
  path: string[]
  fallback: keyof BIMNodeRaw
  group?: string
}

// IFC Property Set mapping
const IFC_PROPERTY_SETS = {
  psetBeamCommon: 'Pset_BeamCommon',
  psetQuantityTakeOff: 'Pset_QuantityTakeOff',
  psetProductRequirements: 'Pset_ProductRequirements',
  psetReinforcementBarPitchOfBeam: 'Pset_ReinforcementBarPitchOfBeam'
} as const

// Known parameter groups
export const PARAMETER_GROUPS = [
  'Dimensions',
  'Structural',
  'Graphics',
  'Phasing',
  'Construction',
  'Model Properties',
  'Geometric Position',
  'Wall Framing Schedule',
  IFC_PROPERTY_SETS.psetBeamCommon,
  IFC_PROPERTY_SETS.psetQuantityTakeOff,
  IFC_PROPERTY_SETS.psetProductRequirements,
  IFC_PROPERTY_SETS.psetReinforcementBarPitchOfBeam,
  'Other',
  'Identity Data',
  'Constraints'
] as const

export type ParameterGroup = (typeof PARAMETER_GROUPS)[number]

// Helper to safely get nested property
export function getNestedValue(obj: BIMNodeRaw, path: string[]): string | undefined {
  if (!obj || !path?.length) return undefined

  let current: unknown = obj
  for (const key of path) {
    if (!current || typeof current !== 'object' || !key) return undefined
    current = (current as Record<string, unknown>)[key]
  }

  if (current === undefined || current === null) return undefined
  return convertToString(current)
}

// Helper to get all parameters from a group
export function getGroupParameters(
  obj: BIMNodeRaw,
  group: string
): Record<string, string> {
  const result: Record<string, string> = {}
  const groupData = obj[group as keyof BIMNodeRaw]

  if (groupData && typeof groupData === 'object') {
    Object.entries(groupData as Record<string, unknown>).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        result[key] = convertToString(value)
      }
    })
  }

  return result
}

// Predefined list of BIM Active parameters we want to collect
export const BASIC_PARAMETERS: BIMParameter[] = [
  {
    name: 'Mark',
    path: ['Identity Data', 'Mark'],
    fallback: 'Tag',
    group: 'Identity Data'
  },
  {
    name: 'Category',
    path: ['Other', 'Category'],
    fallback: 'type',
    group: 'Other'
  },
  {
    name: 'Host',
    path: ['Constraints', 'Host'],
    fallback: 'id',
    group: 'Constraints'
  },
  {
    name: 'Length',
    path: ['Dimensions', 'Length'],
    fallback: 'id',
    group: 'Dimensions'
  },
  {
    name: 'End Level Offset',
    path: ['Constraints', 'End Level Offset'],
    fallback: 'id',
    group: 'Constraints'
  },
  {
    name: 'ID',
    path: ['id'],
    fallback: 'id',
    group: 'root'
  }
] as const

// Common parameters by group
export const GROUP_PARAMETERS: Record<ParameterGroup, string[]> = {
  Dimensions: [
    'Length',
    'Width',
    'Height',
    'Volume',
    'Area',
    'Profile Vertical Offset',
    'Profile Horizontal Offset'
  ],
  Structural: [
    'Cut Length',
    'Structural Usage',
    'Stick Symbol Location',
    'Enable Analytical Model'
  ],
  Graphics: [
    'Split Part',
    'Solid Visible',
    'Axis Visible_T',
    'Symbolic Section_Build in Place'
  ],
  Phasing: ['Phase Created'],
  Construction: ['Build in Place', 'Link to Connected Wall'],
  'Model Properties': [
    'Left',
    'Right',
    'Slope',
    'Rotated',
    'External',
    'Internal',
    'End Flange',
    'Start Flange'
  ],
  'Geometric Position': [
    'Join Status',
    'End Extension',
    'Start Extension',
    'y Justification',
    'z Justification',
    'yz Justification'
  ],
  'Wall Framing Schedule': ['Type', 'Cut Length', 'Family and Type'],
  [IFC_PROPERTY_SETS.psetBeamCommon]: [
    'Span',
    'Slope',
    'Reference',
    'IsExternal',
    'LoadBearing'
  ],
  [IFC_PROPERTY_SETS.psetQuantityTakeOff]: ['Reference'],
  [IFC_PROPERTY_SETS.psetProductRequirements]: ['Category'],
  [IFC_PROPERTY_SETS.psetReinforcementBarPitchOfBeam]: ['Reference'],
  Other: ['Category', 'Type', 'Family'],
  'Identity Data': ['Mark', 'Type', 'Family', 'Type Id', 'Family and Type'],
  Constraints: ['Host']
} as const

// Helper to check if a parameter belongs to a group
export function getParameterGroup(parameterName: string): ParameterGroup | 'root' {
  for (const [group, parameters] of Object.entries(GROUP_PARAMETERS)) {
    if (parameters.includes(parameterName)) {
      return group as ParameterGroup
    }
  }
  return 'root'
}

// Helper to get all parameters from all groups
export function getAllGroupParameters(
  obj: BIMNodeRaw
): Record<string, Record<string, string>> {
  const result: Record<string, Record<string, string>> = {}

  PARAMETER_GROUPS.forEach((group) => {
    const groupParams = getGroupParameters(obj, group)
    if (Object.keys(groupParams).length > 0) {
      result[group] = groupParams
    }
  })

  return result
}

// Helper to get IFC property set name from camelCase key
export function getIFCPropertySetName(key: keyof typeof IFC_PROPERTY_SETS): string {
  return IFC_PROPERTY_SETS[key]
}
