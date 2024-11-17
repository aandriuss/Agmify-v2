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

### Store Architecture (Updated)

```
core/store/
└── useScheduleStore.ts       // Central store management
    ├── Early initialization
    ├── Type-safe state
    ├── Error boundaries
    └── Loading states

State Flow:
1. Store initialization (immediate)
2. Project ID setup
3. Component initialization
4. Data loading
```

### Type System

The system uses a strict type hierarchy:

- `TableConfig`: Core type for table configuration
- `NamedTableConfig`: Extended type with additional metadata
- Type conversion utilities ensure type safety between different parts of the system
- Runtime type guards for data validation

### State Management

- Store-first initialization approach
- Composable-based state management
- Type-safe mutations
- Computed ref handling with proper unwrapping
- Immutable state updates
- Viewer state synchronization

### Component Flow

```
Schedules.vue
├── useScheduleStore (Store initialization)  // New primary state
├── useViewerInitialization (Core viewer state)
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

### Loading State Management (New)

```typescript
// Centralized loading state
const isLoading = computed(() => {
  return !initialized.value ||
         scheduleStore.loading.value ||
         !!setup?.value?.isUpdating
})

// Component usage
<div v-if="isLoading">Loading...</div>
<div v-else>Content...</div>
```

### Type Safety

- Strict type checking throughout the system
- Runtime type validation where needed
- Type guards for data validation
- Proper null handling

### State Flow (Updated)

```
Store Initialization -> ViewerState -> BIMElements -> Components
       ↑                    ↑              ↑
       └── Error ──────────┴── State ─────┘

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

### Store Integration (Updated)

```typescript
// Early store initialization
initializeStore(state)

// Type-safe state access
const storeValues = useScheduleValues()

// Loading state management
const isLoading = computed(() => {
  return !initialized.value || scheduleStore.loading.value
})
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

### State Management (Updated)

```typescript
// Type-safe state management with early initialization
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

### State Management (Updated)

- Initialize store early
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

## Current Status (New)

### Working

- Store initialization
- Type safety improvements
- Error handling
- Data flow

### In Progress

- Loading state management
- Component initialization timing
- UI rendering
- State transitions

### Next Steps

1. Debug loading state
2. Verify component mounting
3. Improve initialization flow
4. Add performance monitoring

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
