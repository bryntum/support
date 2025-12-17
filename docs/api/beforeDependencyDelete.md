# beforeDependencyDelete Event Implementation

## Overview

This document describes the implementation of the `beforeDependencyDelete` event that fires when a user clicks the delete button on a dependency line in Bryntum Gantt.

## Problem Statement

Previously, when clicking the delete button on a dependency line (a feature added in version 6.3.4), there was no way to:
- Cancel the deletion
- Execute custom logic before deletion
- Validate whether the deletion should proceed

The only workaround was to monitor the `dependencyStore` and intercept changes there, which was not ideal as it would happen after the UI interaction.

## Solution

Fire a `beforeDependencyDelete` event (similar to the existing event in the dependency edit popup) when the delete button on a dependency line is clicked. This event is:
- **Preventable**: Returning `false` from the event handler prevents the deletion
- **Asynchronous-friendly**: Supports `async` event handlers for operations like showing confirmation dialogs
- **Consistent**: Uses the same event name and pattern as the dependency edit feature

## Event Signature

```javascript
/**
 * Fired before a dependency is deleted via the delete button on the dependency line.
 * 
 * @event beforeDependencyDelete
 * @preventable
 * @param {Object} event Event object
 * @param {Gantt.model.DependencyModel} event.dependency The dependency record about to be deleted
 * @param {Gantt.view.Gantt} event.source The Gantt instance
 */
```

## Usage Examples

### Basic Usage - Prevent Deletion

```javascript
const gantt = new Gantt({
    // ... other config
    
    listeners: {
        beforeDependencyDelete({ dependency }) {
            // Prevent deletion of certain dependencies
            if (dependency.isReadOnly) {
                return false; // Prevents deletion
            }
        }
    }
});
```

### Show Confirmation Dialog

```javascript
const gantt = new Gantt({
    // ... other config
    
    listeners: {
        async beforeDependencyDelete({ dependency }) {
            // Show confirmation dialog
            const result = await MessageDialog.confirm({
                title: 'Delete Dependency',
                message: `Are you sure you want to delete the dependency from "${dependency.sourceTask.name}" to "${dependency.targetTask.name}"?`
            });
            
            // Return false to prevent deletion if user cancelled
            return result === MessageDialog.yesButton;
        }
    }
});
```

### Custom Validation Logic

```javascript
const gantt = new Gantt({
    // ... other config
    
    listeners: {
        async beforeDependencyDelete({ dependency }) {
            // Check with backend if deletion is allowed
            try {
                const response = await fetch(`/api/dependencies/${dependency.id}/can-delete`);
                const data = await response.json();
                
                if (!data.canDelete) {
                    Toast.show({
                        html: data.reason || 'Cannot delete this dependency',
                        color: 'b-red'
                    });
                    return false;
                }
            } catch (error) {
                console.error('Error checking deletion permission:', error);
                return false;
            }
        }
    }
});
```

### Logging and Analytics

```javascript
const gantt = new Gantt({
    // ... other config
    
    listeners: {
        beforeDependencyDelete({ dependency, source }) {
            // Log deletion attempt
            analytics.track('dependency_delete_attempted', {
                dependencyId: dependency.id,
                fromTask: dependency.fromTask,
                toTask: dependency.toTask,
                ganttId: source.id
            });
            
            // Allow deletion to proceed
            // (not returning false means the event is not prevented)
        }
    }
});
```

### Replace Default Behavior

```javascript
const gantt = new Gantt({
    // ... other config
    
    listeners: {
        async beforeDependencyDelete({ dependency }) {
            // Implement custom deletion logic
            
            // 1. Soft delete instead of removing from store
            dependency.isDeleted = true;
            dependency.deletedAt = new Date();
            
            // 2. Sync with server
            await fetch(`/api/dependencies/${dependency.id}`, {
                method: 'DELETE'
            });
            
            // 3. Hide the dependency in UI
            dependency.cls = 'b-hidden';
            
            // Prevent the default deletion from store
            return false;
        }
    }
});
```

## Implementation Details

### Where the Event is Fired

The event is fired in the `DependencyTooltip` feature (or similar feature that handles dependency line interactions), specifically in the click handler for the delete button:

```javascript
async onDependencyDeleteClick(dependency) {
    const me = this;
    
    // Fire the preventable beforeDependencyDelete event
    const eventResult = await me.trigger('beforeDependencyDelete', {
        dependency,
        source: me.client
    });
    
    // If event was prevented, do not proceed with deletion
    if (eventResult === false) {
        return false;
    }
    
    // Proceed with the deletion
    me.client.dependencyStore.remove(dependency);
    
    return true;
}
```

### Event Flow

1. User clicks the delete button on a dependency line
2. Event handler extracts the dependency from the clicked element
3. `beforeDependencyDelete` event is fired with dependency and source
4. Event listeners are called (can be async)
5. If any listener returns `false`, deletion is cancelled
6. If not prevented, dependency is removed from the store
7. UI updates to reflect the deletion

## Migration Guide

For users who were monitoring the `dependencyStore` to intercept deletions:

### Before (workaround):

```javascript
gantt.dependencyStore.on({
    beforeRemove({ records }) {
        // Had to check if this was triggered by the delete button
        // No clean way to distinguish this from other removals
        const dependency = records[0];
        
        if (shouldPreventDeletion(dependency)) {
            // Complex logic to prevent removal
            return false;
        }
    }
});
```

### After (recommended):

```javascript
gantt.on({
    beforeDependencyDelete({ dependency }) {
        if (shouldPreventDeletion(dependency)) {
            return false; // Clean and specific to UI button clicks
        }
    }
});
```

## Testing

The implementation includes comprehensive tests covering:

1. Event is fired when delete button is clicked
2. Deletion can be prevented by returning `false`
3. Deletion proceeds when not prevented
4. Custom async logic can be executed
5. Event includes correct data (dependency, source)
6. Works with multiple dependencies

See `tests/Gantt/feature/DependencyDeleteEvent.t.js` for complete test suite.

## Compatibility

- This feature is backward compatible - existing code continues to work
- The event only fires for delete button clicks on dependency lines
- Does not affect programmatic deletion via `dependencyStore.remove()`
- Consistent with existing `beforeDependencyDelete` event from dependency edit popup

## Related Events

- `beforeDependencyDelete` (from DependencyEdit feature) - Fired when deleting from edit popup
- `beforeDependencyDelete` (new, from DependencyTooltip feature) - Fired when deleting from line button
- `dependencyStore.beforeRemove` - Lower-level store event for any removal

## Future Enhancements

Potential future improvements:
- Add `afterDependencyDelete` event for post-deletion logic
- Add keyboard shortcut support (Delete key) with same event
- Consider adding reason/source to event data to distinguish button clicks from other deletion methods
