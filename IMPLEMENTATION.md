# Dependency Line Delete Button Event Implementation

## Overview

This directory contains the reference implementation for adding a `beforeDependencyDelete` event that fires when clicking the delete button on a dependency line in Bryntum Gantt.

## Issue Reference

- **Forum Post**: https://forum.bryntum.com/viewtopic.php?f=52&t=34650&p=176627#p176627
- **Requirement**: Fire a preventable `beforeDependencyDelete` event when the delete button on a dependency line is clicked
- **Purpose**: Allow users to cancel deletion or execute custom logic, similar to the existing event in the dependency edit popup

## File Structure

```
/home/runner/work/support/support/
├── src/
│   └── Gantt/
│       └── feature/
│           └── DependencyTooltip.js         # Reference implementation showing where event should be fired
├── tests/
│   └── Gantt/
│       └── feature/
│           └── DependencyDeleteEvent.t.js   # Comprehensive test suite
└── docs/
    └── api/
        └── beforeDependencyDelete.md        # API documentation and usage examples
```

## Implementation Summary

### Key Changes

1. **Event Firing**: Add `beforeDependencyDelete` event in the dependency delete button click handler
2. **Preventable**: Event can be prevented by returning `false` from any listener
3. **Async Support**: Event handlers can be async (useful for confirmation dialogs)
4. **Event Data**: Includes `dependency` (the model) and `source` (the Gantt instance)

### Code Location

The event should be fired in the feature that handles dependency line interactions (likely `DependencyTooltip` or similar), specifically in the method that handles delete button clicks:

```javascript
async onDependencyDeleteClick(dependency) {
    // Fire preventable event
    const eventResult = await me.trigger('beforeDependencyDelete', {
        dependency,
        source: me.client
    });
    
    // Check if prevented
    if (eventResult === false) {
        return false;
    }
    
    // Proceed with deletion
    me.client.dependencyStore.remove(dependency);
}
```

## Testing

The test suite (`tests/Gantt/feature/DependencyDeleteEvent.t.js`) includes:

1. ✅ Event fires on delete button click
2. ✅ Deletion can be prevented
3. ✅ Deletion proceeds when not prevented
4. ✅ Async event handlers work correctly
5. ✅ Event includes correct data
6. ✅ Works with multiple dependencies

## Usage Example

```javascript
const gantt = new Gantt({
    listeners: {
        beforeDependencyDelete({ dependency }) {
            // Custom validation
            if (dependency.isLocked) {
                return false; // Prevent deletion
            }
            
            // Custom logic
            console.log('Deleting dependency:', dependency.id);
        }
    }
});
```

## Integration Notes

For the Bryntum development team integrating this change:

1. **Find the dependency delete button handler** - This is in the feature that manages dependency line interactions (introduced in v6.3.4)

2. **Add event triggering** - Before removing the dependency from the store, fire the `beforeDependencyDelete` event

3. **Check event result** - If any listener returns `false`, skip the deletion

4. **Update documentation** - Add the event to the Gantt API docs and feature documentation

5. **Run tests** - Ensure all existing tests pass and the new tests are added to the test suite

## Benefits

- **Consistent API**: Uses same event name as dependency edit popup
- **Flexible**: Allows both sync and async event handlers
- **Non-breaking**: Existing functionality continues to work
- **Developer-friendly**: Clean API for common use cases (validation, confirmation, logging)

## Questions?

For questions or issues, please refer to:
- Forum post: https://forum.bryntum.com/viewtopic.php?f=52&t=34650
- This implementation: https://github.com/bryntum/support
