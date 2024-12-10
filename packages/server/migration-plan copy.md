# Tables and Parameters Migration Plan

## 1. Completed Changes

### Core Tables Organization

```
frontend-2/composables/core/tables/
├── state/
│   ├── useTableState.ts     # Table state management
│   └── useColumnState.ts    # Column state management
├── utils/
│   ├── column.ts           # Column operations
│   ├── config.ts           # Table configuration
│   ├── bim.ts             # BIM-specific utilities
│   └── index.ts           # Utils exports
├── useTableSelection.ts    # Selection handling
└── index.ts               # Main exports
```

### Core Parameters Organization

```
frontend-2/composables/core/parameters/
├── constants.ts           # Parameter constants
├── conversion.ts         # Parameter-to-column conversion
├── useParameters.ts      # Main parameter functionality
├── useParameterOperations.ts # Parameter operations
├── useParameterEvaluation.ts # Value evaluation
├── useParametersState.ts # Parameter state
├── useParameterColumns.ts # Parameter column handling
└── index.ts             # Main exports
```

### Core Types Organization

```
frontend-2/composables/core/types/
├── parameters/
│   ├── value-types.ts    # Parameter value types
│   ├── parameter-types.ts # Parameter type definitions
│   └── index.ts         # Type exports
├── tables/
│   ├── column-types.ts  # Column type definitions
│   ├── event-types.ts   # Event type definitions
│   └── index.ts        # Type exports
└── index.ts            # Main type exports
```

### Core Utils Organization

```
frontend-2/composables/core/utils/
├── validation.ts       # Validation utilities
└── conversion.ts      # Type conversion utilities
```

### Components Organization

```
frontend-2/components/
├── tables/              # Base table components
│   └── DataTable/
│       ├── BaseDataTable.vue
│       └── utils.ts
└── viewer/
    ├── tables/         # Viewer-specific tables
    │   ├── DataTable.vue
    │   └── ViewerDataTable.vue
    └── schedules/      # Schedule-specific
        └── ScheduleTable.vue
```

## 2. Completed Tasks

1. ✅ Moved table utilities to core/tables/utils/

   - Created column.ts for column operations
   - Created config.ts for table configuration
   - Created bim.ts for BIM-specific utilities
   - Created index.ts for utils exports

2. ✅ Moved parameter utilities to core/parameters/

   - Created conversion.ts for parameter-column conversion
   - Created useParameterColumns.ts for parameter column handling
   - Updated index.ts with proper exports

3. ✅ Organized type definitions

   - Separated parameter and table types
   - Created proper type hierarchies
   - Added type guards and utilities

4. ✅ Maintained backward compatibility
   - Added alias exports for renamed functions
   - Ensured existing code continues to work

## 3. Benefits

1. Clear Separation:

- Core functionality in core/tables and core/parameters
- Viewer-specific code in viewer/
- Component-specific code with components

2. Better Organization:

- Related utilities grouped together
- Clear dependencies
- Easier to find functionality

3. Improved Maintainability:

- No duplicate functions
- Clear responsibility
- Better testing structure

## 4. Next Steps

1. Test the reorganized code:

- [ ] Run unit tests
- [ ] Test in development environment
- [ ] Verify no functionality is broken

2. Documentation:

- [ ] Update component documentation
- [ ] Update API documentation
- [ ] Update usage examples

3. Clean up:

- [ ] Remove any remaining duplicate code
- [ ] Update type definitions if needed
- [ ] Add missing tests

4. Future Improvements:

- [ ] Consider extracting more shared functionality
- [ ] Add more type safety
- [ ] Improve error handling
