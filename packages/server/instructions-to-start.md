# Schedule System: Next Steps

## Current Status

We've identified critical issues in the viewer initialization chain:

1. Timing Issues

```typescript
// ❌ Current issue: Wrong timing
const { viewer } = useInjectedViewer()
```

2. Container Issues

```
❌ Error: GL_INVALID_FRAMEBUFFER_OPERATION
Cause: Container not properly mounted/sized
```

3. State Management

```typescript
// ❌ Current issue: State not ready
const { viewer } = useInjectedViewerState()
```

## Implementation Order

### 1. Container Management (🎯 Start Here)

```typescript
// ✅ Add container ref
const viewerContainer = ref<HTMLElement | null>(null)

// ✅ Add container validation
onMounted(() => {
  if (!viewerContainer.value) {
    throw new Error('Container not mounted')
  }
})

// ✅ Add explicit dimensions
<div
  ref="viewerContainer"
  class="viewer-container"
  style="width: 100%; height: 100%; min-height: 400px"
>
```

### 2. State Initialization

```typescript
// ✅ Proper initialization order
onMounted(async () => {
  // 1. Validate container
  if (!viewerContainer.value) throw new Error('...')

  // 2. Setup viewer state
  useSetupViewer({ projectId })

  // 3. Wait for initialization
  await waitForInitialization()

  // 4. Initialize schedule system
  setup.value = useScheduleSetupInstance(...)
})
```

### 3. Error Handling

```typescript
// ✅ Add error boundaries
const handleError = (err: Error | unknown) => {
  const errorValue = err instanceof Error ? err : new Error(String(err))
  error.value = errorValue
  debug.error(DebugCategories.ERROR, 'Schedule error:', errorValue)
}

// ✅ Add recovery
const handleRecovery = async () => {
  error.value = null
  await reinitializeViewer()
}
```

## Files to Update

### 1. Core Files

#### useViewerInitialization.ts

- Add container management
- Improve error handling
- Add retry mechanism
- Add state validation

#### useScheduleSetup.ts

- Update viewer state handling
- Add container validation
- Improve error recovery
- Add initialization guards

#### Schedules.vue

- Move viewer initialization to setup
- Add container refs
- Improve error boundaries
- Add recovery UI

## Testing Strategy

### 1. Container Tests

- Test mounting
- Test dimensions
- Test resize
- Test errors

### 2. Initialization Tests

- Test timing
- Test state
- Test errors
- Test recovery

### 3. Integration Tests

- Test full flow
- Test errors
- Test recovery
- Test performance

## Success Criteria

### 1. Container

- [ ] Mounts successfully
- [ ] Has proper dimensions
- [ ] Handles resize
- [ ] Reports errors

### 2. Initialization

- [ ] Correct timing
- [ ] Proper state flow
- [ ] Error handling
- [ ] Recovery works

### 3. Integration

- [ ] Full flow works
- [ ] Error recovery works
- [ ] Performance good
- [ ] DX improved

## Development Flow

1. Start with container management

   - Add container ref
   - Set dimensions
   - Add validation
   - Test mounting

2. Move to state initialization

   - Fix timing
   - Add validation
   - Handle errors
   - Test flow

3. Finish with error handling
   - Add boundaries
   - Add recovery
   - Add logging
   - Test scenarios

## Documentation Updates

### 1. Update architecture.md

- Add container section
- Update initialization flow
- Document error handling
- Add recovery patterns

### 2. Update implementation.md

- Update status
- Add new tasks
- Document progress
- Update metrics

### 3. Update file-structure.md

- Add new files
- Update responsibilities
- Document changes
- Update organization

## Next Steps

1. Start with container management in Schedules.vue
2. Move to viewer initialization in useViewerInitialization.ts
3. Update schedule setup in useScheduleSetup.ts
4. Add tests and documentation

## Notes

- Keep changes incremental
- Test each step
- Document changes
- Update architecture
