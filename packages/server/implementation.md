# Schedule System Implementation Status

## Current Issues (🚫 Blocking)

### 1. Viewer Initialization Chain

```typescript
// Error: inject() can only be used inside setup()
const { viewer } = useInjectedViewer() // ❌ Wrong timing

// Error: Cannot destructure property 'viewer'
const { viewer } = useInjectedViewerState() // ❌ State not ready
```

Root cause:

- Viewer state injection timing issues
- Container not properly mounted
- State access before initialization

### 2. Framebuffer Issues

```
GL_INVALID_FRAMEBUFFER_OPERATION: Framebuffer incomplete
Error: Attachment has zero size
```

Root cause:

- Container dimensions not established
- Viewer initialization before container ready
- Missing size constraints

## Recent Progress (✅ Completed)

### 1. Core Architecture

- ✅ Identified initialization chain issues
- ✅ Mapped state dependencies
- ✅ Documented error patterns
- ✅ Created implementation plan

### 2. Error Handling

- ✅ Added error categories
- ✅ Improved error messages
- ✅ Added debug utilities
- ✅ Created recovery patterns

### 3. Data Display (Updated)

- ✅ Fixed data access in TableWrapper
- ✅ Updated category initialization
- ✅ Improved data transformation
- ✅ Enhanced state management
- ✅ Implemented independent element handling
- ✅ Added host-mark relationship matching

### 4. Element Relationships (New)

- ✅ Independent BIM elements
- ✅ Category-based filtering
- ✅ Host-mark relationship matching
- ✅ "Without Host" grouping
- ✅ Parameter discovery per element

## Immediate Tasks (⏳ In Progress)

### 1. Container Management

```typescript
// Add container management
const viewerContainer = ref<HTMLElement | null>(null)

// Add size constraints
<div
  ref="viewerContainer"
  class="viewer-container"
  style="width: 100%; height: 100%; min-height: 400px"
>
```

### 2. State Initialization

```typescript
// Proper initialization order
onMounted(async () => {
  // 1. Ensure container
  if (!viewerContainer.value) {
    throw new Error('Container not mounted')
  }

  // 2. Setup viewer state
  useSetupViewer({ projectId })

  // 3. Wait for initialization
  await waitForInitialization()

  // 4. Initialize schedule system
  setup.value = useScheduleSetupInstance(...)
})
```

### 3. Error Recovery

```typescript
// Add recovery mechanisms
const handleRecovery = async () => {
  error.value = null
  if (viewerContainer.value) {
    await reinitializeViewer()
  }
}
```

### 4. Element Processing (Updated)

```typescript
// Element relationship handling
const processElements = async () => {
  // 1. Extract parameters with host handling
  const parameters = extractParameters(raw)
  if (raw.Constraints?.Host) {
    parameters.host = raw.Constraints.Host
    parameterGroups.host = 'Constraints'
  }

  // 2. Create element with parameters
  const element = createEmptyElement(
    raw.id.toString(),
    speckleType,
    mark,
    category,
    parameters
  )

  // 3. Filter by categories
  const { filteredElements } = filterElements({
    allElements: toMutable(elements),
    selectedParent: parentCats,
    selectedChild: childCats
  })

  // 4. Process parameters
  const { processedElements, parameterColumns, availableHeaders } =
    await processParameters({
      filteredElements: toMutable(filteredElements)
    })

  // 5. Update store with all data at once
  await store.lifecycle.update({
    scheduleData: processedElements,
    parameterColumns: parameterColumnsWithDefaults,
    availableHeaders: {
      parent: availableHeaders.parent,
      child: availableHeaders.child
    }
  })
}
```

### 5. Store Updates (New)

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

## Next Steps (📋 Planned)

### 1. Short Term

#### Container Management

- [ ] Add container validation
- [ ] Improve size handling
- [ ] Add resize handling
- [ ] Add container tests

#### State Management

- [ ] Fix injection timing
- [ ] Add state validation
- [ ] Improve error handling
- [ ] Add state tests

#### Error Handling

- [ ] Add error boundaries
- [ ] Improve recovery
- [ ] Add error logging
- [ ] Add error tests

### 2. Medium Term

#### Performance

- [ ] Optimize initialization
- [ ] Add lazy loading
- [ ] Improve state updates
- [ ] Add benchmarks

#### Testing

- [ ] Add unit tests
- [ ] Add integration tests
- [ ] Add error tests
- [ ] Add performance tests

#### Documentation

- [ ] Update architecture docs
- [ ] Add error guides
- [ ] Improve examples
- [ ] Add debugging guides

### 3. Long Term

#### Monitoring

- [ ] Add performance metrics
- [ ] Add error tracking
- [ ] Add usage analytics
- [ ] Add debugging tools

#### Developer Experience

- [ ] Improve error messages
- [ ] Add development tools
- [ ] Enhance documentation
- [ ] Add code examples

## Success Metrics (Updated)

### 1. Initialization

- [ ] Container mounts successfully
- [ ] Viewer initializes properly
- [ ] State flows correctly
- [ ] No timing issues

### 2. Error Handling

- [ ] Clear error messages
- [ ] Proper recovery
- [ ] State consistency
- [ ] User feedback

### 3. Performance

- [ ] Fast initialization
- [ ] Smooth recovery
- [ ] No memory leaks
- [ ] Good error reporting

### 4. Data Display (New)

- [x] Direct data access working
- [x] All categories visible by default
- [ ] Smooth data updates
- [ ] Proper error states

### 4. Data Organization (New)

- [x] Elements processed independently
- [x] Categories filtered correctly
- [x] Host-mark relationships established
- [x] Orphaned elements handled properly
- [x] Parameters discovered per element

## Current Status (Updated)

### Data Organization

- Element Independence: ✅ Complete
- Category Filtering: ✅ Complete
- Relationship Matching: ✅ Complete
- Parameter Discovery: ✅ Complete
- Host Parameter Extraction: ✅ Complete
- Store Updates: ✅ Complete
- Error Handling: 🔄 In Progress

### Code Quality

- Type Safety: ✅ Complete
- Error Handling: 🔄 In Progress
- Component Architecture: ✅ Complete
- State Management: ✅ Complete
- Store Lifecycle: ✅ Complete

### Performance

- Initial Load: 🔄 In Progress
- Updates: ✅ Complete
- Memory Usage: ✅ Complete
- Error Recovery: 🔄 In Progress

### Developer Experience

- Type Safety: ✅ Complete
- Error Handling: 🔄 In Progress
- Documentation: 🔄 In Progress
- Testing: ⏳ Pending

### Data Display (New)

- Data Access: ✅ Complete
- Category Management: ✅ Complete
- State Updates: 🔄 In Progress
- Error States: 🔄 In Progress

## Next Development Phase

### 1. Core Updates

- Fix initialization chain
- Add container management
- Improve error handling
- Add recovery mechanisms

### 2. Testing

- Add initialization tests
- Add error tests
- Add recovery tests
- Add performance tests

### 3. Documentation

- Update architecture docs
- Add error guides
- Improve examples
- Add debugging guides
