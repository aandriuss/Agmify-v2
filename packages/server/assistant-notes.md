# Assistant Notes: Schedule System Implementation

## Key Learnings

1. Viewer Initialization Chain

- Viewer state must be provided before components try to consume it
- Container dimensions must be established before viewer initialization
- inject() timing is critical and must be inside setup()
- Error handling needs to be more robust

2. Error Patterns

```typescript
// Common error chain:
inject() timing -> viewer state undefined -> framebuffer incomplete
```

3. Container Management

```typescript
// Critical requirements:
- Must have explicit dimensions
- Must be mounted before initialization
- Needs proper resize handling
```

## Implementation Strategy

1. Core Changes Required

- Move viewer initialization to setup
- Add container management
- Improve error handling
- Add recovery mechanisms

2. File Updates Needed

```
core/composables/useViewerInitialization.ts
composables/useScheduleSetup.ts
components/Schedules.vue
```

3. Testing Requirements

- Container mounting
- Viewer initialization
- Error recovery
- State management

## Next Chat Prompt

```markdown
# Schedule System: Viewer Initialization Fix

## Current Issues

1. Viewer State Access
   \`\`\`typescript
   // Error: inject() can only be used inside setup()
   const { viewer } = useInjectedViewer()
   \`\`\`

2. Container Issues
   \`\`\`
   Error: GL_INVALID_FRAMEBUFFER_OPERATION
   Cause: Framebuffer incomplete - zero size attachment
   \`\`\`

## Task Overview

Fix the viewer initialization issues by:

1. Implementing proper container management
2. Fixing state initialization timing
3. Adding robust error handling
4. Implementing recovery mechanisms

### Files to Focus On

1. Core Viewer State:
   \`\`\`
   core/composables/useViewerInitialization.ts
   \`\`\`

- Manages core viewer state
- Handles initialization timing
- Provides error handling

2. Schedule Setup:
   \`\`\`
   composables/useScheduleSetup.ts
   \`\`\`

- Coordinates initialization
- Manages component state
- Handles errors

3. Main Component:
   \`\`\`
   components/Schedules.vue
   \`\`\`

- Handles initial setup
- Shows loading states
- Manages errors

## Implementation Steps

1. Container Management

- Add container ref
- Set explicit dimensions
- Handle mounting
- Add resize handling

2. State Initialization

- Move to setup()
- Add proper timing
- Handle errors
- Add recovery

3. Error Handling

- Add boundaries
- Improve messages
- Add recovery
- Add logging

## Testing Steps

1. Container

- Test mounting
- Test dimensions
- Test resize
- Test errors

2. Initialization

- Test timing
- Test state
- Test errors
- Test recovery

3. Integration

- Test full flow
- Test errors
- Test recovery
- Test performance

## Success Criteria

1. No undefined viewer errors
2. Proper initialization order
3. Clear error messages
4. Smooth error recovery
5. Good developer experience

## Notes

- Check setup.ts for viewer types
- Review initialization flow
- Consider error boundaries
- Add proper logging
```

## Key Points for Next Assistant

1. Focus Areas

- Container management first
- State initialization second
- Error handling third
- Recovery mechanisms last

2. Critical Checks

- Container mounting
- State timing
- Error handling
- Recovery flow

3. Documentation Updates

- Update architecture.md
- Update implementation.md
- Update file-structure.md
- Keep changes incremental

4. Testing Strategy

- Unit tests first
- Integration tests second
- Error tests third
- Performance tests last

## Implementation Order

1. Immediate

```typescript
// 1. Container setup
const viewerContainer = ref<HTMLElement | null>(null)

// 2. State initialization
onMounted(async () => {
  if (!viewerContainer.value) throw new Error('...')
  // Initialize viewer
})

// 3. Error handling
const handleError = (err: Error | unknown) => {
  // Handle error
}
```

2. Short Term

- Add comprehensive tests
- Improve documentation
- Add debugging tools
- Enhance error reporting

3. Long Term

- Optimize performance
- Add monitoring
- Improve DX
- Add analytics
