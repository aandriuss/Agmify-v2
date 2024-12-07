# Parameter Type System

A clean, type-safe system for handling BIM and user-created parameters in Vue.js applications.

## Architecture Overview

```
UI Layer (Vue Components)
       ↕
Core Layer (Parameter Types)
       ↕
GraphQL Layer (String Values)
       ↕
API Layer
```

## Core Types

### Value Types

```typescript
type PrimitiveValue = string | number | boolean | null

interface EquationValue {
  kind: 'equation'
  expression: string
  references: string[]
  resultType: BimValueType
  computed?: unknown
}

type ParameterValue = PrimitiveValue | EquationValue
```

### Parameter Types

```typescript
interface BaseParameter {
  readonly id: string
  name: string
  field: string
  visible: boolean
  header: string
  value: ParameterValue
  metadata?: Record<string, unknown>
  // ... other common properties
}

interface BimParameter extends BaseParameter {
  kind: 'bim'
  type: BimValueType
  readonly sourceValue: PrimitiveValue
  readonly fetchedGroup: string
  currentGroup: string
  group?: never // Prevent mixing with UserParameter
}

interface UserParameter extends BaseParameter {
  kind: 'user'
  type: UserValueType
  group: string
  equation?: string
  isCustom?: boolean
  sourceValue?: never // Prevent mixing with BimParameter
}

type Parameter = BimParameter | UserParameter
```

### GraphQL Layer

```typescript
interface BaseGQLParameter {
  id: string
  name: string
  value: string // Always string in GraphQL
  metadata?: Record<string, unknown>
  // ... other common properties
}

interface BimGQLParameter extends BaseGQLParameter {
  kind: 'bim'
  sourceValue: string
  fetchedGroup: string
  currentGroup: string
}

interface UserGQLParameter extends BaseGQLParameter {
  kind: 'user'
  group: string
  equation?: string
}

type GQLParameter = BimGQLParameter | UserGQLParameter
```

### Table Integration

```typescript
interface ColumnDef {
  id: string
  name: string
  field: string
  type?: string
  currentGroup: string
  fetchedGroup?: string // Only for BIM parameters
  isCustomParameter?: boolean
  // ... other column properties
}

function createColumnDef(param: Parameter): ColumnDef {
  return {
    // ... column properties
    isCustomParameter: param.kind === 'user',
    fetchedGroup: isBimParameter(param) ? param.fetchedGroup : undefined
  }
}
```

## Key Features

1. Type Safety Through Discriminated Unions

   - 'kind' property for parameter types
   - 'kind' property for equation values
   - Never types to prevent mixing properties

2. Clean Layer Separation

   - Core types with proper value types
   - GraphQL types with string values
   - Clear conversion boundaries
   - Table integration with type safety

3. Value Handling

   - Type-safe primitive values
   - Structured equation values
   - String values in GraphQL layer
   - Proper validation support

4. Table Integration
   - Type-safe column creation
   - Parameter-to-column mapping
   - Group handling for both types
   - Clean table operations

## Usage Examples

### Type Guards

```typescript
if (isBimParameter(param)) {
  // Access BIM-specific properties
  console.log(param.sourceValue, param.fetchedGroup)
}

if (isUserParameter(param)) {
  // Access User-specific properties
  console.log(param.group, param.equation)
}
```

### Parameter Creation

```typescript
const bimParam = createBimParameter({
  name: 'Width',
  type: 'number',
  sourceValue: 100,
  fetchedGroup: 'Dimensions',
  currentGroup: 'Dimensions'
  // ... other properties
})

const userParam = createUserParameter({
  name: 'Custom Width',
  type: 'fixed',
  value: 150,
  group: 'Custom'
  // ... other properties
})
```

### Table Integration

```typescript
const column = createColumnDef(param)
// Column automatically gets correct properties based on parameter kind
```

### GraphQL Conversion

```typescript
// From GraphQL to core
const param = convertToParameter(gqlParam)

// From core to GraphQL
const gqlParam = convertToGQLParameter(param)
```

## Best Practices

1. Always use type guards for parameter type checks
2. Use creation utilities for new parameters
3. Handle GraphQL conversion at boundaries
4. Use table utilities for column creation
5. Validate values appropriately
6. Keep layers separate and clean

## Implementation Notes

1. The system uses discriminated unions for type safety
2. GraphQL layer handles string serialization
3. Core layer maintains proper value types
4. Table integration preserves type information
5. Clear boundaries between all layers
