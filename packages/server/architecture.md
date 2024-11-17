# Schedule System Architecture

## Core Architecture

### Initialization Flow

```
core/composables/
└── useViewerInitialization.ts  // Core viewer state management
    ├── Initialization state
    ├── Error handling
    └── Retry logic

components/
└── ScheduleInitialization.vue  // Main initialization component
    ├── Viewer initialization
    ├── Data loading
    └── Error handling

composables/
├── useBIMElements.ts          // BIM data handling
├── useScheduleSetup.ts        // Schedule setup coordination
└── useScheduleFlow.ts         // State flow management
```

### Type System

The system uses a strict type hierarchy:

- `TableConfig`: Core type for table configuration
- `NamedTableConfig`: Extended type with additional metadata
- Type conversion utilities ensure type safety between different parts of the system
- Runtime type guards for data validation

### State Management

- Composable-based state management
- Type-safe mutations
- Computed ref handling with proper unwrapping
- Immutable state updates
- Viewer state synchronization

### Component Flow

```
Schedules.vue
├── useViewerInitialization (Core viewer state)  // New addition
├── useScheduleFlow (Type conversion & state flow)
├── useScheduleTable (Table management)
├── useScheduleValues (Value management)
└── Components
    ├── table/
    │   ├── ScheduleTableView (Main container)
    │   │   ├── ScheduleDebugPanel (Debug information)
    │   │   ├── ScheduleLoadingState (Loading progress)
    │   │   ├── ScheduleErrorState (Error handling)
    │   │   └── ScheduleEmptyState (Empty state)
    │   └── index.ts (Component exports)
    ├── ScheduleParameterHandling
    ├── ScheduleColumnManagement
    └── ScheduleDataManagement
```

## Design Patterns

### Type Safety

- Strict type checking throughout the system
- Runtime type validation where needed
- Type guards for data validation
- Proper null handling

### State Flow

```
ViewerState -> BIMElements -> ScheduleSetup -> Components
       ↑            ↑              ↑
       └── Error ───┴── State ─────┘

NamedTableConfig -> TableConfig -> Component Props
         ↑                ↓
         └── State Updates ←┘
```

### Error Handling

- Type-safe error handling
- Error boundaries at component level
- Proper error recovery strategies
- Typed error messages
- Debug utilities with categorized logging
- Viewer initialization error handling

### Component Communication

- Props down, events up pattern
- Type-safe event handling
- Computed properties for derived state
- Proper ref unwrapping

## Implementation Details

### Viewer Integration

```typescript
// Core viewer initialization with retry mechanism
const { isInitialized, waitForInitialization } = useViewerInitialization()

// Component usage
async function initialize() {
  try {
    await waitForInitialization()
    // Component-specific initialization
  } catch (error) {
    handleError(error)
  }
}
```

### Table View Structure

```typescript
// Table view with state handling
const { canShowTable } = useTableView({
  mergedTableColumns: computed(() => props.mergedTableColumns),
  tableData: computed(() => props.tableData)
})

// State-specific rendering
<template>
  <ScheduleDebugPanel v-if="showDebug" />
  <ScheduleLoadingState v-if="isLoading" />
  <DataTable v-else-if="canShowTable" />
  <ScheduleErrorState v-else-if="loadingError" />
  <ScheduleEmptyState v-else />
</template>
```

### State Management

```typescript
// Type-safe state management
const currentTableConfig = computed(() => tableConfig.value || null)

// Parameter handling with type safety
const availableParameters = computed(() => {
  const params = customParameters.value || []
  return params.map((p) => ({
    ...p,
    header: p.name
  }))
})
```

### Error Handling

```typescript
// Type-safe error handling with debug utilities
const handleError = (err: Error | unknown) => {
  debug.log(DebugCategories.ERRORS, 'Error occurred:', {
    error: err,
    timestamp: new Date().toISOString()
  })
  const errorValue = err instanceof Error ? err : new Error(String(err))
  error.value = errorValue
}
```

## Best Practices

### Component Organization

- Group related components in directories
- Clear component responsibilities
- State-specific components
- Proper component communication

### Type Safety

- Always use proper type annotations
- Avoid type assertions
- Use type guards for runtime checks
- Handle null cases explicitly

### State Management

- Use computed properties for derived state
- Keep state immutable
- Handle side effects properly
- Use type-safe mutations
- Ensure proper viewer state initialization

### Error Handling

- Component-level error boundaries
- Type-safe error handling
- Clear error messages
- Debug utilities with categories
- Proper viewer error recovery

## Future Improvements

### Performance

- Lazy loading strategies
- Computed property optimization
- Virtual scrolling for large datasets
- Batch updates
- Viewer initialization optimization

### Developer Experience

- Enhanced type safety
- Better error messages
- Development tools
- Testing utilities
- Viewer debugging tools

### Monitoring

- Performance metrics
- Error tracking
- Usage analytics
- State debugging
- Viewer state monitoring
