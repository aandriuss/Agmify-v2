# Parameter System Architecture

## Current System Overview

### Data Flow

```
Frontend (Vue)                    Backend (Node.js)               Database (PostgreSQL)
┌─────────────────┐              ┌─────────────────┐            ┌─────────────────┐
│ ParameterManager│──Query────►│ GraphQL Resolvers│           │  users table    │
│    Component    │◄──Data─────│    (users.js)    │◄──Query──►│  - parameters   │
└─────────────────┘              └─────────────────┘            │    (JSONB)     │
                                                               └─────────────────┘
```

### Current Implementation

1. Frontend Layer:

   - ParameterManager.vue (UI Component)
   - useParametersGraphQL.ts (Data Layer)
     - Current approach: Bulk updates via userParametersUpdate
     - Alternative approach: Individual CRUD operations

2. GraphQL Layer:

   - Queries:
     - activeUser { parameters } - Gets all parameters
   - Mutations:
     - userParametersUpdate - Bulk update all parameters
     - updateParameter - Individual parameter update
     - createParameter - Create single parameter
     - deleteParameter - Delete single parameter

3. Database Layer:
   - PostgreSQL users table
   - parameters stored as JSONB column
   - parameter_relations for table mappings

## Architectural Options

### Option 1: Bulk Updates (Current)

```
Pros:
- Simpler server implementation
- Single transaction for multiple changes
- Atomic updates

Cons:
- Risk of race conditions
- Overwrites possible with stale data
- Higher payload size
```

### Option 2: Individual CRUD

```
Pros:
- Fine-grained control
- Less risk of data conflicts
- Smaller payloads

Cons:
- Multiple network requests
- More complex server implementation
- Transaction management needed
```

### Option 3: Hybrid Approach (Recommended)

```
Frontend:
┌────────────────────────┐
│   Parameter Manager    │
└────────────────────────┘
           ↓
┌────────────────────────┐
│  Parameter Operations  │
│ - Individual CRUD      │
│ - Batch operations     │
└────────────────────────┘
           ↓
┌────────────────────────┐
│    GraphQL Client      │
└────────────────────────┘

Backend:
┌────────────────────────┐
│   GraphQL Resolvers    │
│ - Single param ops     │
│ - Batch operations     │
└────────────────────────┘
           ↓
┌────────────────────────┐
│  Parameter Service     │
│ - Validation          │
│ - Business logic      │
└────────────────────────┘
           ↓
┌────────────────────────┐
│  Parameter Repository  │
│ - Data access         │
│ - Transaction mgmt    │
└────────────────────────┘
```

## Recommended Implementation

1. Frontend:

```typescript
// Parameter Operations Interface
interface ParameterOperations {
  // Individual Operations
  createParameter(param: ParameterInput): Promise<Parameter>
  updateParameter(id: string, updates: ParameterUpdates): Promise<Parameter>
  deleteParameter(id: string): Promise<boolean>

  // Batch Operations
  batchUpdateParameters(updates: Record<string, Parameter>): Promise<boolean>
  batchDeleteParameters(ids: string[]): Promise<boolean>
}

// GraphQL Operations
const parameterQueries = {
  GET_PARAMETERS: gql`
    query GetParameters {
      activeUser {
        parameters
      }
    }
  `,

  CREATE_PARAMETER: gql`
    mutation CreateParameter($input: CreateParameterInput!) {
      createParameter(input: $input) {
        parameter { ... }
      }
    }
  `,

  UPDATE_PARAMETER: gql`
    mutation UpdateParameter($id: ID!, $input: UpdateParameterInput!) {
      updateParameter(id: $id, input: $input) {
        parameter { ... }
      }
    }
  `,

  BATCH_UPDATE_PARAMETERS: gql`
    mutation BatchUpdateParameters($parameters: JSONObject!) {
      userParametersUpdate(parameters: $parameters)
    }
  `
}
```

2. Backend:

```typescript
// Parameter Service Interface
interface IParameterService {
  // Individual Operations
  getParameter(id: string): Promise<Parameter>
  createParameter(input: CreateParameterInput): Promise<Parameter>
  updateParameter(id: string, updates: UpdateParameterInput): Promise<Parameter>
  deleteParameter(id: string): Promise<boolean>

  // Batch Operations
  batchUpdate(updates: Record<string, Parameter>): Promise<boolean>

  // Validation
  validateParameter(param: Parameter): boolean
  validateBatchUpdate(updates: Record<string, Parameter>): boolean
}

// Repository Interface
interface IParameterRepository {
  findById(id: string): Promise<Parameter>
  create(param: Parameter): Promise<Parameter>
  update(id: string, param: Parameter): Promise<Parameter>
  delete(id: string): Promise<boolean>
  batchUpdate(updates: Record<string, Parameter>): Promise<boolean>
}
```

## Decision Points

1. When to use individual vs batch operations:

   - Use individual operations for:

     - Single parameter updates
     - When order of operations matters
     - When immediate feedback is needed

   - Use batch operations for:
     - Initial data load
     - Bulk imports
     - When atomic updates are critical

2. Optimistic Updates:

   - Update UI immediately
   - Queue changes in memory
   - Sync with server in background
   - Handle conflicts with merge strategy

3. Error Handling:

   - Individual operations: Retry with exponential backoff
   - Batch operations: All-or-nothing vs partial updates
   - Conflict resolution strategy

4. Caching Strategy:
   - Cache parameters locally
   - Implement cache invalidation
   - Handle offline updates

## Implementation Steps

1. Create Parameter Service:

   - Implement both individual and batch operations
   - Add validation layer
   - Handle optimistic updates

2. Update GraphQL Layer:

   - Support both operation types
   - Add proper error handling
   - Implement batching

3. Frontend Updates:

   - Use appropriate operation based on context
   - Handle offline state
   - Implement proper error handling

4. Testing:
   - Unit tests for each layer
   - Integration tests for common flows
   - Performance testing for batch operations
