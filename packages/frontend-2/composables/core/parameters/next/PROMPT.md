# Parameter System Development Prompt

## Context

You are working on the Speckle frontend parameter system, which handles BIM (Building Information Modeling) parameters in a Vue.js application. The system is being refactored to improve type safety, state management, and maintainability.

## Key Files

1. Documentation:

- README.md: System overview and implementation details
- MIGRATION.md: Migration guide from old to new system

2. Core Implementation:

- /types/parameter-states.ts: Type definitions
- /store/parameter-store.ts: State management
- /utils/parameter-processing.ts: Processing utilities

3. Tests:

- /**tests**/parameter-processing.spec.ts
- /**tests**/parameter-groups.spec.ts
- /**tests**/parameter-value-consistency.spec.ts

## Additional Context Not in Files

### 1. BIM Integration

- Parameters come from various BIM systems (Revit, IFC, etc.)
- Each system has its own parameter format and grouping
- System parameters (prefixed with '\_\_') require special handling
- Parameter groups can be nested (e.g., 'Identity Data.Details.Notes')

### 2. Vue.js Integration

- Uses Vue 3 Composition API
- Reactive state management with refs and computed properties
- Component lifecycle considerations
- Integration with Vue Router for persistence

### 3. Speckle-Specific Concepts

- Stream: A collection of BIM elements
- Branch: A version of a stream
- Commit: A snapshot of data
- Object: A BIM element with parameters

### 4. Parameter Types

- Text: String values
- Number: Numeric values with units
- Boolean: True/false values
- Formula: Calculated values
- Array: Lists of values
- Object: Nested structures

### 5. Parameter Groups

- Identity Data: Basic element information
- Dimensions: Size-related parameters
- Constraints: Relationship parameters
- Materials: Material properties
- Pset\_\*: Property sets
- Custom: User-defined groups

### 6. State Management Requirements

- Support undo/redo operations
- Handle batch updates efficiently
- Maintain parameter relationships
- Support real-time updates
- Handle large parameter sets (1000+ parameters)

### 7. Performance Considerations

- Lazy loading of parameter values
- Caching of computed values
- Batch processing of updates
- Memory management for large datasets
- Efficient parameter filtering

### 8. Error Handling

- Network failures during sync
- Invalid parameter values
- Circular dependencies
- Missing required values
- Type conversion errors

### 9. Security Considerations

- Parameter value validation
- Formula injection prevention
- Access control for system parameters
- Sanitization of user input

### 10. Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browser considerations
- Memory limitations
- WebWorker usage for processing

## Development Guidelines

1. Type Safety:

- Use TypeScript strict mode
- Avoid type assertions
- Define clear interfaces
- Use type guards

2. State Management:

- Follow Vue 3 best practices
- Use composition API
- Implement proper reactivity
- Handle side effects

3. Testing:

- Unit tests for utilities
- Integration tests for store
- E2E tests for components
- Performance benchmarks

4. Documentation:

- Clear JSDoc comments
- Usage examples
- Type definitions
- Error handling

5. Performance:

- Optimize for large datasets
- Implement caching
- Use batch processing
- Profile memory usage

## Common Pitfalls

1. Parameter Processing:

- Assuming parameter types
- Missing validation
- Ignoring units
- Circular references

2. State Management:

- Direct state mutation
- Missing reactivity
- Memory leaks
- Race conditions

3. Vue Integration:

- Component lifecycle
- Watcher cleanup
- Prop validation
- Event handling

4. Error Handling:

- Silent failures
- Missing validation
- Unclear messages
- State corruption

## Resources

1. Documentation:

- Vue 3 Composition API
- TypeScript Handbook
- Speckle API Reference
- BIM Parameter Standards

2. Tools:

- Vue DevTools
- TypeScript Compiler
- Performance Profiler
- Memory Analyzer

3. Testing:

- Vitest Documentation
- Vue Test Utils
- Testing Patterns
- Performance Testing

## Getting Started

1. Read the documentation:

- README.md for overview
- MIGRATION.md for context
- Type definitions for structure

2. Set up development:

- Install dependencies
- Configure TypeScript
- Set up tests
- Enable debugging

3. Understand the system:

- Parameter states
- Processing flow
- Store structure
- Component integration

4. Start development:

- Follow type definitions
- Use provided utilities
- Write tests first
- Document changes
