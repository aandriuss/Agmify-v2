import type { TableRow, ParameterValueState } from '~/composables/core/types'

// Helper function to create parameter value state
function createParameterState(
  value: string | number | boolean | null
): ParameterValueState {
  return {
    fetchedValue: value,
    currentValue: value,
    previousValue: value,
    userValue: null
  }
}

// Create dummy table rows
export const dummyTableRows: TableRow[] = [
  // Walls (parent elements)
  {
    id: 'wall-1',
    type: 'Basic Wall',
    mark: 'WALL-001',
    host: undefined,
    _visible: true,
    isChild: false,
    parameters: {
      width: createParameterState(300),
      height: createParameterState(3000),
      length: createParameterState(5000),
      material: createParameterState('Concrete'),
      level: createParameterState('Level 1')
    }
  },
  {
    id: 'wall-2',
    type: 'Basic Wall',
    mark: 'WALL-002',
    host: undefined,
    _visible: true,
    isChild: false,
    parameters: {
      width: createParameterState(300),
      height: createParameterState(3000),
      length: createParameterState(4000),
      material: createParameterState('Concrete'),
      level: createParameterState('Level 1')
    }
  },

  // Structural Framing hosted by WALL-001
  {
    id: 'frame-1',
    type: 'Beam',
    host: 'WALL-001',
    _visible: true,
    isChild: true,
    parameters: {
      width: createParameterState(200),
      height: createParameterState(400),
      length: createParameterState(3000),
      material: createParameterState('Steel'),
      level: createParameterState('Level 1')
    }
  },
  {
    id: 'frame-2',
    type: 'Beam',
    host: 'WALL-001',
    _visible: true,
    isChild: true,
    parameters: {
      width: createParameterState(200),
      height: createParameterState(400),
      length: createParameterState(3000),
      material: createParameterState('Steel'),
      level: createParameterState('Level 1')
    }
  },

  // Structural Framing hosted by WALL-002
  {
    id: 'frame-3',
    type: 'Beam',
    host: 'WALL-002',
    _visible: true,
    isChild: true,
    parameters: {
      width: createParameterState(200),
      height: createParameterState(400),
      length: createParameterState(2500),
      material: createParameterState('Steel'),
      level: createParameterState('Level 1')
    }
  },
  {
    id: 'frame-4',
    type: 'Beam',
    host: 'WALL-002',
    _visible: true,
    isChild: true,
    parameters: {
      width: createParameterState(200),
      height: createParameterState(400),
      length: createParameterState(2500),
      material: createParameterState('Steel'),
      level: createParameterState('Level 1')
    }
  },

  // Structural Framing with random hosts
  {
    id: 'frame-5',
    type: 'Beam',
    host: 'WALL-X01',
    _visible: true,
    isChild: true,
    parameters: {
      width: createParameterState(200),
      height: createParameterState(400),
      length: createParameterState(2000),
      material: createParameterState('Steel'),
      level: createParameterState('Level 1')
    }
  },
  {
    id: 'frame-6',
    type: 'Beam',
    host: 'WALL-X02',
    _visible: true,
    isChild: true,
    parameters: {
      width: createParameterState(200),
      height: createParameterState(400),
      length: createParameterState(2000),
      material: createParameterState('Steel'),
      level: createParameterState('Level 1')
    }
  },

  // Floor (parent element)
  {
    id: 'floor-1',
    type: 'Floor',
    host: undefined,
    _visible: true,
    isChild: false,
    parameters: {
      width: createParameterState(5000),
      thickness: createParameterState(300),
      area: createParameterState(25000000),
      material: createParameterState('Concrete'),
      level: createParameterState('Level 1')
    }
  },

  // Window (child element)
  {
    id: 'window-1',
    type: 'Window',
    host: 'WALL-001',
    _visible: true,
    isChild: true,
    parameters: {
      width: createParameterState(1200),
      height: createParameterState(1500),
      sillHeight: createParameterState(900),
      material: createParameterState('Aluminum'),
      level: createParameterState('Level 1')
    }
  }
]

// Column definitions matching the parameters
export const dummyColumns = [
  {
    field: 'mark',
    header: 'Mark',
    type: 'string',
    category: 'essential',
    description: 'Element mark',
    visible: true,
    order: 0,
    removable: false,
    isFixed: true,
    source: 'Essential'
  },
  {
    field: 'category',
    header: 'Category',
    type: 'string',
    category: 'essential',
    description: 'Element category',
    visible: true,
    order: 1,
    removable: false,
    isFixed: true,
    source: 'Essential'
  },
  {
    field: 'type',
    header: 'Type',
    type: 'string',
    category: 'essential',
    description: 'Element type',
    visible: true,
    order: 2,
    removable: false,
    isFixed: true,
    source: 'Essential'
  },
  {
    field: 'host',
    header: 'Host',
    type: 'string',
    category: 'essential',
    description: 'Host element',
    visible: true,
    order: 3,
    removable: false,
    isFixed: true,
    source: 'Essential'
  },
  {
    field: 'width',
    header: 'Width',
    type: 'number',
    category: 'dimensions',
    description: 'Element width',
    visible: true,
    order: 4,
    removable: true,
    source: 'Parameters'
  },
  {
    field: 'height',
    header: 'Height',
    type: 'number',
    category: 'dimensions',
    description: 'Element height',
    visible: true,
    order: 5,
    removable: true,
    source: 'Parameters'
  },
  {
    field: 'length',
    header: 'Length',
    type: 'number',
    category: 'dimensions',
    description: 'Element length',
    visible: true,
    order: 6,
    removable: true,
    source: 'Parameters'
  },
  {
    field: 'thickness',
    header: 'Thickness',
    type: 'number',
    category: 'dimensions',
    description: 'Element thickness',
    visible: true,
    order: 7,
    removable: true,
    source: 'Parameters'
  },
  {
    field: 'area',
    header: 'Area',
    type: 'number',
    category: 'dimensions',
    description: 'Element area',
    visible: true,
    order: 8,
    removable: true,
    source: 'Parameters'
  },
  {
    field: 'sillHeight',
    header: 'Sill Height',
    type: 'number',
    category: 'dimensions',
    description: 'Window sill height',
    visible: true,
    order: 9,
    removable: true,
    source: 'Parameters'
  },
  {
    field: 'material',
    header: 'Material',
    type: 'string',
    category: 'properties',
    description: 'Element material',
    visible: true,
    order: 10,
    removable: true,
    source: 'Parameters'
  },
  {
    field: 'level',
    header: 'Level',
    type: 'string',
    category: 'location',
    description: 'Element level',
    visible: true,
    order: 11,
    removable: true,
    source: 'Parameters'
  }
]
