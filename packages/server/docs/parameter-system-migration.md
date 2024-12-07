# Parameter System Migration Guide

## Overview

This document describes the migration from the legacy parameter system to the new type-safe parameter system. The new system provides better type safety, cleaner separation of concerns, and improved table integration.

## Key Changes

### 1. Type System

#### Before

```typescript
type ParameterType = 'fixed' | 'equation'
interface Parameter {
  id: string
  type: ParameterType
  value: any
  isFetched: boolean
  // ... other properties
}
```

#### After

```typescript
// Core Types
interface BaseParameter {
  id: string
  name: string
  field: string
  // ... common properties
}

interface BimParameter extends BaseParameter {
  kind: 'bim'
  type: BimValueType
  sourceValue: PrimitiveValue
  fetchedGroup: string
  currentGroup: string
}

interface UserParameter extends BaseParameter {
  kind: 'user'
  type: UserValueType
  group: string
  equation?: string
}

type Parameter = BimParameter | UserParameter
```

### 2. GraphQL Layer

#### Before

```graphql
type Parameter {
  id: ID!
  type: ParameterType!
  value: String
  isFetched: Boolean!
}
```

#### After

```graphql
interface BaseParameter {
  id: ID!
  name: String!
  # ... common fields
}

type BimParameter implements BaseParameter {
  kind: String!
  type: BimValueType!
  sourceValue: String!
  # ... BIM-specific fields
}

type UserParameter implements BaseParameter {
  kind: String!
  type: UserValueType!
  group: String!
  # ... User-specific fields
}

union Parameter = BimParameter | UserParameter
```

### 3. Database Storage

Parameters are stored in the users table as a JSONB column with the following structure:

```typescript
{
  [parameterId: string]: {
    kind: 'bim' | 'user'
    type: string
    value: string
    // ... other properties based on kind
  }
}
```

## Migration Steps

1. **Frontend Updates**

   - Update imports to use new types
   - Replace `UnifiedParameter` with `Parameter`
   - Use type guards for parameter checks

   ```typescript
   // Before
   if (param.isFetched) { ... }

   // After
   if (isBimParameter(param)) { ... }
   ```

2. **GraphQL Updates**

   - Update queries to use fragments

   ```graphql
   query {
     parameters {
       ... on BimParameter {
         id
         kind
         sourceValue
       }
       ... on UserParameter {
         id
         kind
         equation
       }
     }
   }
   ```

3. **Table Integration**
   - Update column creation to handle both types
   ```typescript
   function createColumnDef(param: Parameter): ColumnDef {
     return {
       // ... common properties
       isCustomParameter: param.kind === 'user',
       fetchedGroup: isBimParameter(param) ? param.fetchedGroup : undefined
     }
   }
   ```

## Type Safety Features

1. **Discriminated Unions**

   - Use `kind` property to discriminate between types
   - TypeScript enforces proper property access

   ```typescript
   function handleParameter(param: Parameter) {
     if (param.kind === 'bim') {
       // TypeScript knows this is BimParameter
       console.log(param.sourceValue)
     } else {
       // TypeScript knows this is UserParameter
       console.log(param.equation)
     }
   }
   ```

2. **Value Types**

   - Strong typing for parameter values
   - Safe conversion utilities

   ```typescript
   type PrimitiveValue = string | number | boolean | null
   type ParameterValue = PrimitiveValue | EquationValue
   ```

3. **GraphQL Safety**
   - String values for network transport
   - Type-safe conversion utilities
   ```typescript
   function convertToGQLParameter(param: Parameter): GQLParameter {
     // Safely convert to string values
     return {
       ...param,
       value: String(param.value)
     }
   }
   ```

## Testing

The new system includes comprehensive tests:

1. **Type Tests**

   - Parameter type discrimination
   - Value type handling
   - Conversion safety

2. **Operation Tests**

   - Parameter creation/update
   - Table integration
   - Error handling

3. **Integration Tests**
   - Frontend-backend communication
   - Table operations
   - State management

## Best Practices

1. **Type Guards**

   ```typescript
   // Always use type guards for parameter checks
   if (isBimParameter(param)) {
     // Handle BIM parameter
   } else {
     // Handle user parameter
   }
   ```

2. **Value Handling**

   ```typescript
   // Always use conversion utilities
   const gqlParam = convertToGQLParameter(param)
   const coreParam = convertToParameter(gqlParam)
   ```

3. **Table Integration**
   ```typescript
   // Use proper column creation
   const column = createColumnDef(param)
   ```

## Common Issues

1. **Type Errors**

   - Use type guards to fix "property does not exist" errors
   - Ensure proper type imports
   - Use conversion utilities at boundaries

2. **GraphQL Errors**

   - Use proper fragments for union types
   - Handle string values correctly
   - Check mutation input types

3. **Table Issues**
   - Ensure proper column type mapping
   - Handle both parameter kinds
   - Use safe group access

## Support

For questions or issues:

1. Check the type documentation
2. Use provided type guards and utilities
3. Review test cases for examples
4. Contact the core team for assistance
