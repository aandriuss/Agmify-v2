# Tables and Parameters Migration Plan

# Tables and Parameters Migration Plan

## 0. New Architecture

### Core Table System

```
frontend-2/composables/core/tables/
├── state/                    # State Management
│   ├── useTableState.ts     # Core table state (renamed from useNamedTableState)
│   └── useColumnState.ts    # Column management
├── events/                  # Event System
│   ├── types.ts            # Event type definitions
│   └── handlers.ts         # Reusable event handlers
└── components/             # Base Components
    ├── BaseTable.vue       # Core table functionality
    └── TableWrapper.vue    # Common wrapper functionality
```

### Parameter Integration

```
frontend-2/composables/core/parameters/
├── state/                  # Parameter State
│   ├── useParameters.ts   # Parameter management
│   └── useColumnMapping.ts # Parameter-to-column mapping
└── components/            # Parameter Components
    └── ParameterTable.vue # Parameter-specific table
```

### Event System Hierarchy

```
BaseTable (core events)
    ↓
ParameterTable (adds parameter events)
    ↓
ScheduleTable (adds schedule-specific events)
```

## 1. Core Event System ✅

### Event Types ✅

- [x] Define base TableEventMap
- [x] Add ParameterEventMap
- [x] Add ScheduleEventMap
- [x] Create event handler types
- [x] Add emit helper types

### Event Handlers ✅

- [x] Create useTableEventHandlers
- [x] Add useParameterEventHandlers
- [x] Add useScheduleEventHandlers
- [x] Implement type-safe error handling

## 2. State Management

### Table State

- [ ] Update useTableState (renamed from useNamedTableState)
- [ ] Add column state management
- [ ] Add row state management
- [ ] Add selection state management

### Parameter State

- [ ] Create useParameterState
- [ ] Add parameter validation
- [ ] Add parameter conversion
- [ ] Add parameter persistence

### Schedule State

- [ ] Create useScheduleState
- [ ] Add category management
- [ ] Add parameter group management
- [ ] Add schedule persistence

## 3. Component Hierarchy

### Base Components

- [ ] Create BaseTable.vue
  - [ ] Add core table functionality
  - [ ] Implement event handling
  - [ ] Add state management integration

### Parameter Components

- [ ] Create ParameterTable.vue
  - [ ] Extend BaseTable
  - [ ] Add parameter-specific features
  - [ ] Implement parameter events

### Schedule Components

- [ ] Update ScheduleTable.vue
  - [ ] Use new component hierarchy
  - [ ] Implement schedule events
  - [ ] Add schedule-specific features

## 4. Migration Steps

### Phase 1: Core Infrastructure (Current)

1. ✅ Set up event system
2. [ ] Implement state management
3. [ ] Create base components

### Phase 2: Parameter System

1. [ ] Create parameter components
2. [ ] Implement parameter state
3. [ ] Add parameter validation
4. [ ] Test parameter functionality

### Phase 3: Schedule Integration

1. [ ] Update schedule components
2. [ ] Implement schedule state
3. [ ] Add schedule-specific features
4. [ ] Test schedule functionality

### Phase 4: Migration Support

1. [ ] Create compatibility layer
2. [ ] Add migration utilities
3. [ ] Document upgrade path
4. [ ] Test backwards compatibility

## 5. Next Steps

1. [ ] State Management

   - Create useTableState composable
   - Implement column management
   - Add row state handling

2. [ ] Base Components

   - Create BaseTable component
   - Add event handling
   - Implement state management

3. [ ] Parameter Integration
   - Create ParameterTable component
   - Add parameter state management
   - Implement parameter events

## 6. Benefits

1. Type Safety ✅

   - Strict typing for events
   - Better error detection
   - Improved IDE support

2. Code Organization

   - Clear separation of concerns
   - Reusable components
   - Better maintainability

3. Performance

   - Optimized state management
   - Reduced prop drilling
   - Better memory usage

4. Developer Experience
   - Consistent API
   - Better documentation
   - Easier debugging

## 7. Questions to Address

1. State Management

   - How to handle shared state between tables?
   - Best approach for state persistence?
   - Strategy for state synchronization?

2. Component Design

   - How to handle complex layouts?
   - Best practices for slot usage?
   - Approach for responsive design?

3. Performance
   - Strategy for large datasets?
   - Approach to virtualization?
   - Handling of frequent updates?
