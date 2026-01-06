# Fix for CellEdit Duplicate Tasks Bug

## Issue Description
When creating a task on an empty task store and pressing Enter, 2 new tasks are created instead of jumping to 1 new task for editing.

## Root Cause
The bug occurs because of focus reversion from the cell editor hiding to the "Create" button while the ENTER key event is still being processed. The ENTER key event then bubbles up and is processed by the button as a click gesture, triggering the creation of a second task.

## Solution
In the `CellEdit.js` feature, when processing the ENTER key to finish cell editing, the ENTER key event should have `stopPropagation()` called to prevent it from bubbling up to parent elements.

## Implementation Details

### File to Modify
`CellEdit.js` (in the Bryntum Grid/Gantt source code)

### Required Change
When handling the ENTER key press to complete cell editing, add `event.stopPropagation()` to prevent the event from bubbling up.

### Example Implementation

```javascript
// In CellEdit.js, in the key event handler for ENTER key

onCellEditEnterKey(event) {
    // Prevent the event from bubbling up to parent elements
    // This stops the ENTER key from being processed by the Create button
    // after focus reverts from the cell editor
    event.stopPropagation();
    
    // ... rest of the ENTER key handling code
    // (finish editing, move to next cell, etc.)
}
```

### Testing the Fix

1. Open the Bryntum Gantt advanced example
2. Delete all existing tasks
3. Click the "Create+" button
4. Type a task name
5. Press ENTER
6. Verify that:
   - Current task edit is finished
   - Only ONE new task is added and focused
   - No duplicate task is created

## Related Behaviors

- Using TAB key to navigate between cells does NOT trigger this bug (which is the expected behavior)
- The issue specifically affects the `addNewAtEnd` feature when combined with ENTER key termination of cell editing

## Technical Notes

The `addNewAtEnd` feature automatically creates a new record when navigating to the next line (via ENTER key). The bug manifests as:
1. User presses ENTER to finish editing
2. Cell editor closes and triggers record creation via `addNewAtEnd`
3. Focus reverts to the "Create" button (the last focused element before editing)
4. ENTER key event (still propagating) reaches the "Create" button
5. Button processes ENTER as a click, creating a second duplicate task

By calling `stopPropagation()`, we prevent step 4 and 5 from occurring.
