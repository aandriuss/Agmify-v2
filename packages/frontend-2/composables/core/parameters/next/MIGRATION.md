!!! IMPORTANT!!! MIGRATION IS FINISHED. Use just for reference

# Parameter System Migration Guide

This guide helps you migrate from the old parameter system to the new state-based parameter system.

## Key Differences

### 1. State Transitions

Old:

```
Raw Parameters -> Parameters -> Column Definitions
```

New:

```
RawParameter -> AvailableBimParameter -> SelectedParameter -> ColumnDefinition
                     ↑
            AvailableUserParameter
```

### 2. Type Safety

- Old: Mixed types and ambiguous states
- New: Clear type definitions and state transitions
- Better TypeScript support and compile-time checks
- Strict type guards and parameter validation

### 3. Parameter Management

- Old: Direct parameter manipulation
- New: State-based management through store
- Clear separation between BIM and user parameters
- Centralized parameter store with reactive state

### 4. Processing Flow

- Old: Mixed processing in useParameters
- New:
  - useElementsData: Handles parameter extraction and processing
  - useParameters: Handles UI interactions and parameter management
  - Clear separation of concerns

## Step-by-Step Migration

### 1. Update Imports

```typescript
// Old
import { useParameters } from '~/composables/core/parameters'

// New
import { useElementsData } from '~/composables/core/tables/state/useElementsData'
import { useParameters } from '~/composables/core/parameters/next/useParameters'
import type {
  AvailableBimParameter,
  AvailableUserParameter,
  SelectedParameter
} from '@/composables/core/parameters/store/types'
```

### 2. Update Parameter Processing

```typescript
// Old
const parameters = useParameters()
await parameters.processElements(elements)

// New
const { initializeData } = useElementsData({
  selectedParentCategories: computed(() => parentCategories),
  selectedChildCategories: computed(() => childCategories)
})

// Parameter processing is handled automatically
await initializeData()

// For UI interactions, use useParameters
const parameters = useParameters({
  selectedParentCategories: computed(() => parentCategories),
  selectedChildCategories: computed(() => childCategories)
})
```

### 3. Handle Parameter Visibility

```typescript
// Old
parameter.visible = false

// New
// Visibility is managed through selected parameters
parameters.updateParameterVisibility(parameterId, false, isParent)
```

### 4. Convert Legacy Parameters

```typescript
import { fromLegacyParameter, toLegacyParameter } from '../types/parameter-states'

// Convert old parameter to new format
const newParam = fromLegacyParameter(oldParam)

// Convert back if needed
const oldParam = toLegacyParameter(newParam)
```

## Common Pitfalls

### 1. Parameter Processing

❌ Don't mix parameter processing with UI logic

```typescript
// Wrong
const parameters = useParameters()
await parameters.processElements(elements) // No longer available
```

✅ Use separate composables for processing and UI

```typescript
// Correct
const elementsData = useElementsData(options)
await elementsData.initializeData() // Handles processing

const parameters = useParameters(options) // UI interactions only
```

### 2. Parameter Updates

❌ Don't modify parameters directly

```typescript
// Wrong
parameter.value = newValue
```

✅ Use store methods

```typescript
// Correct
parameters.updateParameterValue(parameter.id, newValue, isParent)
```

### 3. Type Safety

❌ Don't use any or unknown types

```typescript
// Wrong
function processParameter(param: any) {
  param.value = newValue
}
```

✅ Use proper type definitions and type guards

```typescript
// Correct
import type { RawParameter } from '@/composables/core/parameters/store/types'

function processParameter(param: RawParameter) {
  if (param.sourceGroup === 'Identity Data') {
    // Handle Identity Data parameters
  } else {
    // Handle other parameters
  }
}
```

## Testing Changes

1. Test parameter processing in useElementsData:

```typescript
import { useElementsData } from '../useElementsData'

describe('Parameter Processing', () => {
  it('should process parameters correctly', async () => {
    const { initializeData } = useElementsData(options)
    await initializeData()

    // Type-safe parameter assertions
    interface ExpectedParameter {
      id: string
      name: string
      value: unknown
      sourceGroup: string
    }

    const expectedParam: ExpectedParameter = {
      id: 'Identity Data.Mark',
      name: 'Mark',
      value: 'W1',
      sourceGroup: 'Identity Data'
    }

    expect(mockStore.setRawParameters).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining(expectedParam)]),
      true
    )
  })
})
```

2. Test UI interactions in useParameters:

```typescript
import { useParameters } from '../useParameters'

describe('Parameter Management', () => {
  it('should handle parameter visibility', () => {
    const parameters = useParameters(options)
    parameters.updateParameterVisibility('param1', false, true)

    expect(mockStore.updateParameterVisibility).toHaveBeenCalledWith(
      'param1',
      false,
      true
    )
  })
})
```

## Legacy Support

The new system provides utilities for backward compatibility:

1. Use conversion utilities for legacy code:

   - fromLegacyParameter
   - toLegacyParameter

2. Maintain existing parameter structure while transitioning:

   ```typescript
   // Bridge old and new systems
   const legacyParam = toLegacyParameter(newParam)
   existingFunction(legacyParam)
   ```

3. Gradually migrate components to use new system

## Benefits of Migration

1. Better Type Safety

   - Clear parameter states
   - TypeScript support
   - Compile-time checks
   - Type guards for parameter types

2. Improved State Management

   - Centralized store
   - Clear transitions
   - Better debugging
   - Reactive state updates

3. Better Testing

   - Isolated states
   - Clear expectations
   - Better coverage
   - Type-safe assertions

4. Enhanced Development Experience

   - Better IDE support
   - Clear API
   - Better documentation
   - Separation of concerns

5. Performance Improvements
   - Optimized parameter processing
   - Reduced memory usage
   - Better caching
   - Batch updates
