# Schedule System File Structure

## Core Architecture

```
frontend-2/components/viewer/schedules/
├── core/
│   ├── store/
│   │   ├── index.ts           # Store initialization
│   │   ├── mutations.ts       # Type-safe mutations
│   │   └── store.ts          # Store definition
│   ├── types.ts              # Core type definitions
│   └── utils.ts              # Shared utilities
│
├── types/
│   ├── tableConfig.ts        # Table configuration types
│   └── index.ts             # Type exports
│
├── composables/
│   ├── useScheduleFlow.ts    # Type conversion & state flow
│   ├── useScheduleTable.ts   # Table management
│   ├── useScheduleValues.ts  # Value management
│   ├── useScheduleStore.ts   # Store access
│   ├── useTableView.ts       # Table view state management
│   └── useScheduleEmits.ts   # Event handling
│
├── components/
│   ├── table/               # Table-specific components
│   │   ├── index.ts         # Component exports
│   │   ├── ScheduleTableView.vue    # Main table container
│   │   ├── ScheduleDebugPanel.vue   # Debug information
│   │   ├── ScheduleLoadingState.vue # Loading progress
│   │   ├── ScheduleErrorState.vue   # Error handling
│   │   └── ScheduleEmptyState.vue   # Empty state
│   │
│   ├── ScheduleTableContent.vue    # Main table component
│   ├── ScheduleInitialization.vue  # Setup component
│   ├── ScheduleParameterHandling.vue # Parameter management
│   └── ScheduleColumnManagement.vue  # Column management
│
├── features/
│   ├── parameters/
│   │   ├── processing.ts    # Parameter processing
│   │   ├── validation.ts    # Parameter validation
│   │   └── discovery.ts     # Parameter discovery
│   │
│   └── categories/
│       ├── relations.ts     # Category relationships
│       ├── filtering.ts     # Category filtering
│       └── updates.ts       # Category updates
│
├── utils/
│   ├── debug.ts            # Debug utilities
│   ├── validation.ts       # Validation helpers
│   ├── typeConversion.ts   # Type conversion utilities
│   └── dataPipeline.ts     # Data transformation
│
└── config/
    ├── constants.ts        # System constants
    ├── categories.ts       # Category configuration
    └── parameters.ts       # Parameter configuration
```

## Key Components

### Core Layer

- `core/store/`: Central state management
- `core/types.ts`: Core type definitions
- `core/utils.ts`: Shared utilities

### Type System

- `types/tableConfig.ts`: Table configuration types
- `types/index.ts`: Type exports and interfaces

### Composables

- `useScheduleFlow.ts`: Type conversion and state flow
- `useScheduleTable.ts`: Table management
- `useScheduleValues.ts`: Value management
- `useScheduleStore.ts`: Store access
- `useTableView.ts`: Table view state management

### Components

#### Table Components

- `table/ScheduleTableView.vue`: Main table container
- `table/ScheduleDebugPanel.vue`: Debug information display
- `table/ScheduleLoadingState.vue`: Loading state handling
- `table/ScheduleErrorState.vue`: Error state handling
- `table/ScheduleEmptyState.vue`: Empty state display

#### Other Components

- `ScheduleTableContent.vue`: Main table component
- `ScheduleInitialization.vue`: Setup component
- `ScheduleParameterHandling.vue`: Parameter management
- `ScheduleColumnManagement.vue`: Column management

### Features

- `parameters/`: Parameter system implementation
- `categories/`: Category management system

### Utils

- `debug.ts`: Debug utilities with categories
- `validation.ts`: Validation helpers
- `typeConversion.ts`: Type conversion utilities
- `dataPipeline.ts`: Data transformation

### Config

- `constants.ts`: System constants
- `categories.ts`: Category configuration
- `parameters.ts`: Parameter configuration

## File Responsibilities

### Core Files

- `store/mutations.ts`: Type-safe state mutations
- `store/index.ts`: Store initialization and setup
- `types.ts`: Core type definitions and guards

### Composables

- `useScheduleFlow.ts`: Manages type conversion and state flow
- `useScheduleTable.ts`: Handles table operations
- `useScheduleValues.ts`: Manages value transformations
- `useScheduleStore.ts`: Provides store access
- `useTableView.ts`: Manages table view state and visibility

### Components

#### Table Components

- `table/ScheduleTableView.vue`: Main table container and state management
- `table/ScheduleDebugPanel.vue`: Debug information and logging
- `table/ScheduleLoadingState.vue`: Loading progress visualization
- `table/ScheduleErrorState.vue`: Error display and retry
- `table/ScheduleEmptyState.vue`: Empty state messaging

#### Other Components

- `ScheduleTableContent.vue`: Main table rendering
- `ScheduleInitialization.vue`: System initialization
- `ScheduleParameterHandling.vue`: Parameter UI
- `ScheduleColumnManagement.vue`: Column management UI

### Feature Modules

- `parameters/processing.ts`: Parameter processing logic
- `parameters/validation.ts`: Parameter validation
- `categories/relations.ts`: Category relationships
- `categories/filtering.ts`: Category filtering

## Organization Principles

### Type Safety

- Types defined in dedicated files
- Type guards for runtime validation
- Type-safe mutations and state
- Proper null handling

### Component Structure

- Clear separation of concerns
- State-specific components
- Composable-based logic
- Type-safe props and events

### State Management

- Centralized store
- Type-safe mutations
- Computed properties
- Immutable updates

### Error Handling

- Type-specific errors
- Error boundaries
- Recovery strategies
- Proper logging
- Debug utilities

## Best Practices

### File Naming

- Clear, descriptive names
- Consistent casing
- Purpose-indicating prefixes
- Type indication when needed

### Code Organization

- Related code grouped together
- Clear file responsibilities
- Proper separation of concerns
- Logical file hierarchy

### Type Safety

- Types in dedicated files
- Proper type exports
- Type guard implementation
- Runtime validation

### Documentation

- Clear file headers
- Type documentation
- Function documentation
- Usage examples
