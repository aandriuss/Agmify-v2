# Schedule System Migration Plan

## Phase 1: Container Management

### Step 1: Update Schedules.vue

```typescript
// Before
const { viewer } = useInjectedViewer() // ❌ Wrong timing

// After
const viewerContainer = ref<HTMLElement | null>(null)
onMounted(() => {
  if (!viewerContainer.value) {
    throw new Error('Container not mounted')
  }
})
```

### Step 2: Add Container Component

```vue
<template>
  <div
    ref="viewerContainer"
    class="viewer-container"
    style="width: 100%; height: 100%; min-height: 400px"
  >
    <!-- Content -->
  </div>
</template>
```

## Phase 2: State Management

### Step 1: Update useViewerInitialization.ts

```typescript
// Before
const viewer = useInjectedViewer() // ❌ Wrong timing

// After
const viewerState = useInjectedViewerState()
const viewerInstance = computed(() => viewerState.viewer.instance)
```

### Step 2: Update useScheduleSetup.ts

```typescript
// Before
setup.value = useScheduleSetupInstance() // ❌ Missing args

// After
setup.value = useScheduleSetupInstance(
  viewerInstance.value,
  isViewerInitialized,
  waitForInitialization
)
```

## Phase 3: Error Handling

### Step 1: Add Error Types

```typescript
// Add to core/types.ts
export class ViewerInitializationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ViewerInitializationError'
  }
}
```

### Step 2: Add Error Boundaries

```typescript
// Add to useViewerInitialization.ts
const handleError = (err: Error | unknown) => {
  const errorValue = err instanceof Error ? err : new Error(String(err))
  error.value = errorValue
  debug.error(DebugCategories.ERROR, 'Viewer error:', errorValue)
}
```

## Migration Steps

### 1. Container Management (🎯 Start Here)

#### Files to Update

- [ ] Schedules.vue
  - Add container ref
  - Add dimensions
  - Add validation

#### Testing

- [ ] Test container mounting
- [ ] Test dimensions
- [ ] Test validation

### 2. State Management (⏳ Next)

#### Files to Update

- [ ] useViewerInitialization.ts
  - Fix timing
  - Add validation
  - Add recovery

#### Testing

- [ ] Test initialization
- [ ] Test state flow
- [ ] Test recovery

### 3. Error Handling (📅 Then)

#### Files to Update

- [ ] core/types.ts
  - Add error types
  - Add guards
  - Add utilities

#### Testing

- [ ] Test error cases
- [ ] Test recovery
- [ ] Test boundaries

## Testing Strategy

### 1. Unit Tests

```typescript
// Container tests
describe('Container Management', () => {
  it('should mount container', () => {
    // Test mounting
  })

  it('should have correct dimensions', () => {
    // Test dimensions
  })
})
```

### 2. Integration Tests

```typescript
// Initialization tests
describe('Viewer Initialization', () => {
  it('should initialize in correct order', async () => {
    // Test initialization
  })

  it('should handle errors', async () => {
    // Test error handling
  })
})
```

## Rollback Plan

### 1. Container Changes

- Keep old container code
- Add feature flag
- Test both paths
- Monitor errors

### 2. State Changes

- Keep old state flow
- Add version check
- Test compatibility
- Monitor performance

### 3. Error Changes

- Keep old error handling
- Add new boundaries
- Test recovery
- Monitor issues

## Success Validation

### 1. Container

- [ ] Container mounts
- [ ] Dimensions correct
- [ ] No GL errors
- [ ] Performance good

### 2. State

- [ ] Initialization works
- [ ] State flows correctly
- [ ] No timing issues
- [ ] Recovery works

### 3. Errors

- [ ] Clear messages
- [ ] Proper recovery
- [ ] Good DX
- [ ] Easy debugging

## Monitoring Plan

### 1. Performance

- Monitor initialization time
- Track GL errors
- Watch memory usage
- Log state changes

### 2. Errors

- Track error rates
- Monitor recovery
- Watch timeouts
- Log boundaries

### 3. Usage

- Track initialization
- Monitor recovery
- Watch patterns
- Log performance

## Documentation Updates

### 1. Architecture

- Update initialization flow
- Document container
- Add error handling
- Document recovery

### 2. Implementation

- Add container guide
- Update state docs
- Document errors
- Add examples

### 3. Migration

- Add step-by-step
- Document rollback
- Add validation
- Update monitoring
