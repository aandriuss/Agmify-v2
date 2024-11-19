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
- Direct data access in components (new)
- Improved category initialization (new)

### Component Flow (Updated)

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
    │   │   ├── TableWrapper (Direct data access) // Updated
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
         ↑                ↓             ↓
         └── State Updates ←───── Direct Data Access
```

### Element Relationships (Updated)

```
BIM Data Structure:
└── Elements (Independent)
    ├── Parent Elements (Walls, Floors, etc.)
    │   ├── mark: unique identifier
    │   └── category: from parentCategories
    └── Child Elements (Windows, Doors, etc.)
        ├── host: from Constraints.Host
        └── category: from childCategories

Parameter Extraction:
1. Process Identity Data (mark)
2. Process Constraints (host)
3. Process Other parameters
4. Group parameters by source

Relationship Flow:
1. Each element starts independent
2. Extract host from Constraints
3. Category determination (parent/child)
4. Host-mark matching for relationships
5. Orphaned children → "Without Host"
```

### Store Architecture (Updated)

```
core/store/
└── useScheduleStore.ts       // Central store management
    ├── State
    │   ├── Core data (scheduleData, evaluatedData)
    │   ├── Parameters (customParameters, parameterColumns)
    │   ├── Categories (selectedParentCategories, selectedChildCategories)
    │   └── UI state (loading, error)
    ├── Lifecycle
    │   ├── init: () => Promise<void>
    │   ├── update: (state: Partial<StoreState>) => Promise<void>
    │   └── cleanup: () => void
    └── Mutations
        ├── Individual setters (legacy)
        └── Batch updates (new)

State Flow:
1. Store initialization (immediate)
2. Project ID setup
3. Component initialization
4. Batch data updates
```

### Data Flow (Updated)

```
1. Raw BIM Data
   └── Independent elements with parameters
      ├── Identity Data (mark)
      ├── Constraints (host)
      └── Other parameters

2. Parameter Processing
   ├── Extract host from Constraints
   ├── Group parameters by source
   └── Create parameter columns

3. Category Processing
   ├── Parent categories (Walls, Floors, etc.)
   └── Child categories (Windows, Doors, etc.)

4. Relationship Establishment
   ├── Match child.host with parent.mark
   └── Group orphans under "Without Host"

5. Store Updates
   └── Batch update multiple states
      ├── scheduleData
      ├── parameterColumns
      └── availableHeaders
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

### Implementation Details

#### Store Updates

```typescript
// Store lifecycle management
interface StoreLifecycle {
  init: () => Promise<void>
  update: (state: Partial<StoreState>) => Promise<void>
  cleanup: () => void
}

// Batch state updates
await store.lifecycle.update({
  selectedParentCategories: parentCategories,
  selectedChildCategories: childCategories,
  scheduleData: processedElements,
  parameterColumns: parameterColumnsWithDefaults
})
```

#### Parameter Extraction

```typescript
function extractParameters(raw: BIMNodeRaw): ParametersWithGroups {
  // Process Identity Data
  if (raw['Identity Data']) {
    processGroup(raw['Identity Data'], 'Identity Data', ['Mark'])
  }

  // Process Constraints - special handling for Host
  if (raw.Constraints) {
    if ('Host' in raw.Constraints) {
      parameters.host = raw.Constraints.Host
      parameterGroups.host = 'Constraints'
    }
    processGroup(raw.Constraints, 'Constraints')
  }

  // Process Other parameters
  if (raw.Other) {
    processGroup(raw.Other, 'Other', ['Category'])
  }
}
```

#### Data Access

```typescript
// Direct data access in components
<template>
  <div class="truncate">{{ data[col.field] }}</div>
</template>

// Category initialization
export const defaultTable: NamedTableConfig = {
  categoryFilters: {
    selectedParentCategories: parentCategories,
    selectedChildCategories: childCategories
  }
}
```

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
