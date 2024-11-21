# Schedule System Architecture

## Core Architecture

### Parameter Flow (New)

```
Parameter Processing Chain:
1. Raw BIM Data
   └── Parameters with groups
       ├── Identity Data (mark, etc.)
       ├── Constraints (host, etc.)
       └── Other parameters

2. Parameter Discovery
   └── useParameterDiscovery.ts
       ├── Scans raw data
       ├── Creates ProcessedHeader objects
       └── Groups by source

3. Parameter State Management
   └── Parameters with value states
       ├── fetchedValue (original)
       ├── currentValue (active)
       ├── previousValue (for undo)
       └── userValue (modifications)
```

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

### Store Architecture

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

### Type System (Updated)

The system uses a strict type hierarchy:

```typescript
// Parameter value tracking
interface ParameterValueState {
  fetchedValue: ParameterValue
  currentValue: ParameterValue
  previousValue: ParameterValue
  userValue: ParameterValue | null
}

// Element data types
interface BaseElementData {
  id: string
  mark: string
  category: string
  type?: string
  host?: string
  _visible?: boolean
  isChild?: boolean
}

// Discovery phase element data
interface ElementData extends BaseElementData {
  parameters: ParametersWithGroups
}

// Final data phase element data
interface TableRow extends BaseElementData {
  parameters: Parameters
}
```

### State Management (Updated)

- Two-phase parameter handling:
  1. Discovery phase with raw parameters
  2. Data phase with parameter states
- Store-first initialization approach
- Composable-based state management
- Type-safe mutations
- Computed ref handling with proper unwrapping

### Component Flow (Updated)

```
Schedules.vue
├── useScheduleStore (Store initialization)
├── useViewerInitialization (Core viewer state)
├── useScheduleFlow (Type conversion & state flow)
├── useScheduleTable (Table management)
├── useScheduleValues (Value management)
└── Components
    ├── table/
    │   ├── ScheduleTableView (Main container)
    │   │   ├── TableWrapper (Parameter display)
    │   │   ├── ScheduleDebugPanel (Parameter stats)
    │   │   ├── ScheduleLoadingState (Loading progress)
    │   │   ├── ScheduleErrorState (Error handling)
    │   │   └── ScheduleEmptyState (Empty state)
    │   └── index.ts (Component exports)
    ├── ScheduleParameterHandling (Parameter UI)
    ├── ScheduleColumnManagement (Column UI)
    └── ScheduleDataManagement
```

### Parameter Types and Flow (Updated)

```
Parameter Discovery Flow:
└── Raw Parameters (from BIM)
    ├── Identity Data
    │   └── mark (parent identifier)
    ├── Constraints
    │   └── Host (child-parent relationship)
    └── Other Parameters
        └── Category, etc.

Parameter Data Flow:
└── Parameter States
    ├── fetchedValue (original from BIM)
    ├── currentValue (active in table)
    ├── previousValue (for undo/redo)
    └── userValue (user modifications)

Key Parameter Objects:
├── availableHeaders: { parent: ColumnDef[], child: ColumnDef[] }
│   ├── Raw parameter definitions from BIM
│   ├── Separated by parent/child relationship
│   └── Used for initial parameter discovery
│
├── availableParameters: CustomParameter[]
│   ├── UI representation of parameters
│   ├── Filtered by current view (parent/child)
│   └── Used for column selection
│
└── parameterColumns: ColumnDef[]
    ├── Active columns in table
    ├── Created from availableHeaders
    └── Grouped by source (Identity Data, Constraints, Other)

Processing Chain:
1. Raw BIM Data
   └── useElementParameters.ts
       ├── Extracts raw parameters
       ├── Creates availableHeaders
       └── Separates parent/child parameters

2. Parameter Organization
   └── dataPipeline.ts
       ├── Processes parameters
       ├── Groups by source
       └── Separates parent/child

3. UI Representation
   └── useColumnManager.ts
       ├── Manages available parameters
       ├── Handles column operations
       └── Controls parameter visibility

Parameter States:
├── Raw State (BIM data)
├── Processed State (availableHeaders)
└── UI State (availableParameters)

Debug Output:
└── Parameter Statistics
    ├── Source Elements
    ├── Parent Parameters
    │   ├── Total Count
    │   ├── Available Count
    │   └── Groups with Visibility
    └── Child Parameters
        ├── Total Count
        ├── Available Count
        └── Groups with Visibility
```

## Design Patterns

### Loading State Management

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

### State Flow

```
Store Initialization -> ViewerState -> BIMElements -> Components
       ↑                    ↑              ↑
       └── Error ──────────┴── State ─────┘

NamedTableConfig -> TableConfig -> Component Props
         ↑                ↓             ↓
         └── State Updates ←───── Direct Data Access
```

### Element Relationships

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

### Store Architecture

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

## Current Status

### Working

- Store initialization
- Type safety improvements
- Error handling
- Data flow
- Parameter discovery
- Parameter state management
- Element relationships

### In Progress

- Parameter value display
- Parameter group organization
- Parameter state tracking
- Parameter filtering

### Next Steps

1. Implement parameter cell component
2. Add parameter group headers
3. Create parameter state indicators
4. Add parameter filtering UI
5. Implement debug panel
6. Add performance monitoring

## Future Improvements

### Performance

- Lazy loading strategies
- Computed property optimization
- Virtual scrolling for large datasets
- Batch updates
- Parameter state caching

### Developer Experience

- Enhanced type safety
- Better error messages
- Development tools
- Testing utilities
- Parameter debugging tools

### Monitoring

- Performance metrics
- Error tracking
- Usage analytics
- State debugging
- Parameter state monitoring
