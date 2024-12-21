# Table System Refactoring Implementation

## Context

We are refactoring the table system to simplify the relationship between parameters and their display in tables. Currently, there is unnecessary complexity with multiple column types and conversion layers. We want to create a clean, simple system that clearly separates data (parameters) from display (columns).

## Current State

- Complex type system with BimColumnDef, UserColumnDef, etc.
- Multiple conversion layers between parameters and columns
- Duplicate properties between parameters and columns
- Unclear separation of concerns

## Target State

- Clear separation between data (SelectedParameter) and display (TableColumn)
- Simple, direct relationship between parameters and columns
- No unnecessary type conversions
- Clean, maintainable code

## Implementation Plan

### 1. Core Types Update

First, implement the new TableColumn type and update core type definitions:

- [ ] Update table-column.ts with new TableColumn interface
- [ ] Update tables/index.ts exports
- [ ] Update store/types.ts to use TableColumn
- [ ] Update TableSettings interface

### 2. Store Layer Update

Next, simplify the store to work with the new types:

- [ ] Update store/store.ts
- [ ] Remove complex column creation logic
- [ ] Use simple createTableColumns function
- [ ] Update state management

### 3. Service Layer Update

Then update the service layer:

- [ ] Update tableService.ts
- [ ] Remove column type conversions
- [ ] Work directly with TableColumn type

### 4. State Management Update

Update state management to use new types:

- [ ] Update useTableFlow.ts
- [ ] Update useElementsData.ts
- [ ] Simplify data flow

### 5. Component Update

Finally, update components:

- [ ] Update Schedules.vue
- [ ] Remove column type conversions
- [ ] Use TableColumn directly

## Files to Modify

1. ../frontend-2/composables/core/types/tables/table-column.ts
2. ../frontend-2/composables/core/types/tables/index.ts
3. ../frontend-2/composables/core/tables/store/types.ts
4. ../frontend-2/composables/core/tables/store/store.ts
5. ../frontend-2/composables/core/tables/services/tableService.ts
6. ../frontend-2/composables/core/tables/state/useTableFlow.ts
7. ../frontend-2/composables/core/tables/state/useElementsData.ts
8. ../frontend-2/components/viewer/schedules/Schedules.vue

## Testing Requirements

- Verify parameters display correctly in tables
- Check column sorting/filtering functionality
- Validate table persistence
- Test parameter updates flow through correctly

## Success Criteria

1. Clean type system with clear separation of concerns
2. No type conversion layers
3. All tests passing
4. Improved code maintainability
5. No regression in functionality

## Notes

- Take a step-by-step approach
- Update one layer at a time
- Ensure each change is working before moving to next
- Keep backward compatibility until full migration
