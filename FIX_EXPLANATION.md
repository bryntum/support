# Container hasChanges Fix

## Issue Description

Forum post: https://forum.bryntum.com/viewtopic.php?p=177191#p177191

When a Combo field has a store that loads asynchronously (e.g., from a URL), and the Combo's value is set during Container configuration, the Container incorrectly reports `hasChanges = true` even though no user changes have been made.

## Root Cause

The problem occurs in the Combo field's `setValueAfterStoreLoad` method. When the store's `load` event fires asynchronously, the `isConfiguring` state is lost, causing the value assignment to trigger change events that mark the Container as "dirty".

### Original Buggy Code

```javascript
setValueAfterStoreLoad(value) {
    const me = this;
    store.ion({ 
        load : () => me.value = value, 
        once : true, 
        thisObj : me 
    });
}
```

**Problem**: By the time the `load` event fires, `me.isConfiguring` is already `false`, so setting `me.value` triggers `onChange` events.

## The Fix

The fix captures the `isConfiguring` state before registering the event listener and restores it when setting the value:

```javascript
setValueAfterStoreLoad(value) {
    const me = this;
    // Capture the current isConfiguring state
    const { isConfiguring } = me;
    
    me.store.ion({
        load : () => {
            // Propagate configuring state to when we set the value.
            // values set during configuration should not trigger events.
            me.isConfiguring = isConfiguring;
            me.value = value;
            me.isConfiguring = false;
        },
        once : true,
        thisObj : me
    });
}
```

**Solution**: The `isConfiguring` state is captured in a closure and restored before setting the value, preventing unwanted change events during configuration.

## Files Changed

- `src/Combo.js` - Fixed `setValueAfterStoreLoad` method
- `src/Container.js` - Minimal Container implementation with change tracking
- `tests/Container.t.js` - Test suite validating the fix

## Testing

The test suite includes multiple test cases:

1. ✅ Combo with synchronously loaded store should not show changes
2. ✅ Combo with async-loaded store should not show changes (THE FIX)
3. ✅ Actual user changes should be detected
4. ✅ Multiple fields with mixed sync/async initialization
5. ✅ Nested containers with Combo fields

### Run Tests

```bash
# Simple test runner (no dependencies)
node tests/Container.t.js

# Or with Jest (requires npm install)
npm install
npm test
```

## Expected Behavior

After the fix:

- ✅ Container with Combo field loading from async store: `hasChanges = false` after initialization
- ✅ Container correctly detects actual user changes: `hasChanges = true` when user modifies value
- ✅ Works with nested containers and multiple fields

## Implementation Details

### Key Changes

1. **Capture isConfiguring state**: Store the `isConfiguring` flag in a closure before registering the async event handler
2. **Restore before setting**: Set `isConfiguring = true` before assigning the value
3. **Reset after setting**: Set `isConfiguring = false` after the value is assigned

### Why This Works

- During Container construction, all child widgets have `isConfiguring = true`
- When the Combo's value is set synchronously, `isConfiguring` is still `true`, so no change events fire
- When the store loads asynchronously, `isConfiguring` would normally be `false` by that point
- The fix preserves the original `isConfiguring` state and restores it temporarily during the deferred value assignment
- This ensures that values set during configuration never trigger change events, regardless of timing

## Related Code

The issue manifests because:

1. `Container.distributeValues()` iterates over widgets to track initial values
2. `Container.eachWidget()` processes child widgets recursively
3. `Combo.onChange()` notifies the parent Container of changes
4. `Container.onFieldChange()` updates `cleanValues` which affects `hasChanges`

The fix ensures that step 3 (onChange) is never triggered for values set during configuration.
