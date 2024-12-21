# Table System Implementation Plan

## Core Concept

We have parameters (data) and columns (display). Keep these concerns separate and simple.

## Types

### SelectedParameter (existing)

```typescript
interface SelectedParameter {
  id: string
  name: string
  kind: 'bim' | 'user'
  type: BimValueType | UserValueType
  value: ParameterValue
  group: string
  visible: boolean
  order: number
  category?: string
  description?: string
  metadata?: ParameterMetadata
}
```

### TableColumn (new)

```typescript
interface TableColumn {
  // Display properties
  id: string
  field: string
  header: string
  visible: boolean
  sortable?: boolean
  filterable?: boolean
  width?: number

  // Link to data
  parameter: SelectedParameter
}
```

## Implementation Steps

1. **Core Types**

   - [x] Create TableColumn interface
   - [x] Add to tables/index.ts exports
   - [x] Update store/types.ts to use TableColumn

2. **Store Layer**

   - [ ] Update store/store.ts
     - Remove complex column creation logic
     - Use simple createTableColumns function
   - [ ] Update TableSettings interface
     - Change column types from ColumnDef to TableColumn

3. **Service Layer**

   - [ ] Update tableService.ts
     - Remove column type conversions
     - Work directly with TableColumn type

4. **State Management**

   - [ ] Update useTableFlow.ts
     - Remove column management complexity
     - Use TableColumn directly
   - [ ] Update useElementsData.ts
     - Adapt to TableColumn type
     - Simplify data flow

5. **Components**
   - [ ] Update Schedules.vue
     - Use TableColumn type
     - Remove any column type conversions

## Benefits

- Clear separation between data (parameters) and display (columns)
- Simpler type system
- No need for complex conversions
- More maintainable code

## Migration Strategy

1. Start with store layer changes
2. Move through service layer
3. Update state management
4. Finally update components
5. Remove old column types and conversions

## Testing

- Ensure parameters are correctly displayed
- Verify column sorting/filtering still works
- Check table persistence works
- Validate parameter updates flow through correctly
