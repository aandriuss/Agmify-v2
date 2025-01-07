# Parameter System Documentation

## Overview

The parameter system manages BIM and user-defined parameters through clear state transitions and type-safe operations. It provides a robust foundation for parameter management in the Speckle frontend.

## Architecture

### Core Components

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   useElements   │     │  ParameterStore │     │  useParameters  │
│      Data      │     │                 │     │                 │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ • Processing   │     │ • State         │     │ • UI           │
│ • Extraction   │ ──> │ • Transitions   │ ──> │ • Interactions │
│ • Validation   │     │ • Management    │     │ • Updates      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### State Flow

```
RawParameter → AvailableBimParameter → SelectedParameter → ColumnDefinition
              ↘ AvailableUserParameter ↗
```

### Directory Structure

```
parameters/next/
├── types/
│   └── parameter-states.ts     # Type definitions and creation utilities
├── store/
│   └── parameter-store.ts      # State management
├── utils/
│   ├── parameter-processing.ts # Processing logic
│   └── __tests__/             # Test files
├── MIGRATION.md               # Migration guide
└── README.md                 # This file
```

## Core Components

### 1. useElementsData

Handles parameter processing and extraction:

```typescript
const { initializeData } = useElementsData({
  selectedParentCategories: computed(() => parentCategories),
  selectedChildCategories: computed(() => childCategories)
})

// Initialize and process parameters
await initializeData()
```

### 2. Parameter Store

Manages parameter state and provides methods for state transitions:

```typescript
const store = useParameterStore()

// Access state
const parentParams = store.parentParameters.available.bim.value
const childParams = store.childParameters.available.bim.value

// Update state
store.updateParameterVisibility(parameterId, true, isParent)
```

### 3. useParameters

Handles UI interactions and parameter management:

```typescript
const parameters = useParameters({
  selectedParentCategories: computed(() => parentCategories),
  selectedChildCategories: computed(() => childCategories)
})

// UI interactions
parameters.updateParameterVisibility(parameterId, true, isParent)
parameters.updateParameterOrder(parameterId, newOrder, isParent)
```

## Usage Examples

### 1. Basic Setup

```typescript
// Initialize data processing
const elementsData = useElementsData({
  selectedParentCategories: computed(() => ['Walls']),
  selectedChildCategories: computed(() => ['Windows'])
})

// Initialize UI interactions
const parameters = useParameters({
  selectedParentCategories: computed(() => ['Walls']),
  selectedChildCategories: computed(() => ['Windows'])
})

// Process parameters
await elementsData.initializeData()

// Access processed parameters
const bimParams = parameters.parentParameters.available.bim.value
const selectedParams = parameters.parentParameters.selected.value
```

### 2. Parameter Management

```typescript
// Update visibility
parameters.updateParameterVisibility(parameterId, true, isParent)

// Reorder parameters
parameters.updateParameterOrder(parameterId, newOrder, isParent)

// Add user parameter
parameters.addUserParameter({
  isParent: true,
  name: 'Total Area',
  type: 'equation',
  group: 'Calculations',
  initialValue: '[Height] * [Width]'
})
```

### 3. Error Handling

```typescript
try {
  await elementsData.initializeData()
} catch (error) {
  debug.error(DebugCategories.PARAMETERS, 'Failed to initialize:', error)
}

// Check processing state
if (parameters.hasError.value) {
  console.error('Parameter processing error:', parameters.error.value)
}
```

## Best Practices

### 1. State Management

- Use useElementsData for parameter processing
- Use useParameters for UI interactions
- Don't modify parameters directly
- Handle parent/child parameters separately

### 2. Type Safety

```typescript
// Use type guards
if (isAvailableBimParameter(param)) {
  // Handle BIM parameter
} else if (isAvailableUserParameter(param)) {
  // Handle user parameter
}

// Use proper interfaces
interface ProcessingOptions {
  validateValues?: boolean
  processGroups?: boolean
}

function processParameters(params: RawParameter[], options: ProcessingOptions) {
  // Type-safe processing
}
```

### 3. Error Handling

```typescript
// Use debug logging
debug.log(DebugCategories.PARAMETERS, 'Processing parameters', {
  count: parameters.length,
  types: parameters.map((p) => p.type)
})

// Handle errors gracefully
try {
  await processParameters(params)
} catch (error) {
  debug.error(DebugCategories.PARAMETERS, 'Processing failed:', error)
  // Handle error appropriately
}
```

### 4. Testing

```typescript
describe('Parameter Processing', () => {
  it('should process parameters correctly', async () => {
    const { initializeData } = useElementsData(options)
    await initializeData()

    // Type-safe assertions
    interface ExpectedParameter {
      id: string
      name: string
      value: unknown
      fetchedGroup: string
    }

    const expected: ExpectedParameter = {
      id: 'test',
      name: 'Test',
      value: 123,
      fetchedGroup: 'Group'
    }

    expect(mockStore.setRawParameters).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining(expected)]),
      true
    )
  })
})
```

## Performance Considerations

1. Parameter Processing

   - Process parameters in batches
   - Use async processing for large datasets
   - Cache processed parameters when possible

2. State Updates

   - Minimize unnecessary updates
   - Use computed properties for derived data
   - Batch related changes

3. Memory Management
   - Clean up unused parameters
   - Reset store when switching contexts
   - Handle large parameter sets efficiently

## Debugging

### 1. Debug Logging

```typescript
// In useElementsData
debug.log(DebugCategories.PARAMETERS, 'Processing parameters', {
  count: parameters.length,
  groups: Object.keys(parameterGroups)
})

// In parameter store
debug.log(DebugCategories.PARAMETERS, 'State updated', {
  raw: state.value.collections.parent.raw.length,
  available: state.value.collections.parent.available.bim.length,
  selected: state.value.collections.parent.selected.length
})
```

### 2. Error Tracking

```typescript
// Track processing errors
debug.error(DebugCategories.PARAMETERS, 'Failed to process parameters:', {
  error,
  parameters: params.map((p) => p.id)
})

// Track state errors
debug.error(DebugCategories.PARAMETERS, 'State update failed:', {
  error,
  state: 'current state snapshot'
})
```

## Contributing

1. Follow TypeScript best practices
2. Add tests for new functionality
3. Update documentation
4. Use provided type definitions
5. Follow state transition patterns

## Future Considerations

1. Enhanced Features

   - Advanced parameter relationships
   - Complex validation rules
   - Custom parameter types

2. Performance Optimizations

   - Improved caching strategies
   - Better batch processing
   - Memory optimizations

3. Integration
   - External system adapters
   - Real-time updates
   - Advanced synchronization
