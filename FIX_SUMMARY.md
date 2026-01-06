# CellEdit Duplicate Tasks Bug - Fix Summary

## Overview
This repository contains the documentation and fix for the CellEdit feature bug where pressing ENTER to finish cell editing creates duplicate tasks.

## Issue
- **Repository:** bryntum/support
- **Component:** CellEdit feature (Grid/Gantt)
- **Bug:** When creating a task on an empty task store and pressing Enter, 2 new tasks are created instead of 1

## Root Cause
The ENTER key event bubbles from the cell editor to the "Create" button after the editor closes and focus reverts. The button processes the ENTER key as a click gesture, creating a duplicate task.

## Solution
Add `event.stopPropagation()` when processing the ENTER key event in the CellEdit feature's key handler.

## Files in This Repository

### 1. CELLEDIT_FIX.md
Comprehensive documentation of:
- Issue description
- Root cause analysis
- Solution explanation
- Implementation details
- Testing approach

### 2. celledit-fix.patch
A patch file showing the exact code change needed in unified diff format. This can be applied to the CellEdit.js source file.

### 3. CellEdit-fix-example.js
A complete example showing:
- How the fix integrates into the CellEdit class
- The exact location where stopPropagation() should be called
- Detailed comments explaining the fix
- Flow diagrams showing behavior before and after fix

### 4. TEST_CASES.md
Comprehensive test cases including:
- Manual test scenarios
- Automated test pseudocode
- Control tests to verify no regression
- Browser compatibility notes

## Implementation

### The Fix (One Line of Code)
```javascript
event.stopPropagation();
```

### Where to Apply
In the `CellEdit.js` file, within the ENTER key handling section of the `onInternalKeyDown` method, add the `stopPropagation()` call **before** processing the ENTER key to finish editing.

### Complete Example
```javascript
onInternalKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        // FIX: Stop event propagation
        event.stopPropagation();
        
        // Continue normal processing
        this.finishEditing();
        if (this.addNewAtEnd) {
            this.startEditing(this.getNextPosition());
        }
    }
}
```

## Verification

### Before Fix
1. Delete all tasks
2. Click "Create+"
3. Type a name
4. Press Enter
5. **Result:** 2 tasks created (BUG)

### After Fix
1. Delete all tasks
2. Click "Create+"
3. Type a name
4. Press Enter
5. **Result:** 1 task created (CORRECT)

## Impact

### What Changes
- ENTER key event no longer bubbles after cell editing
- Prevents accidental button clicks from Enter key

### What Doesn't Change
- TAB key navigation (works as before)
- ESC key cancellation (works as before)
- Mouse interactions (work as before)
- Any other keyboard shortcuts (work as before)

## Related Features

### addNewAtEnd
This feature automatically adds a new record when navigating past the last row. The bug specifically affects this feature when combined with ENTER key navigation.

### TAB Key Navigation
TAB key navigation does **not** trigger this bug because TAB doesn't cause the same focus reversion pattern.

## Technical Details

### Event Flow (Before Fix)
1. User presses ENTER in cell editor
2. CellEdit.onInternalKeyDown receives event
3. finishEditing() is called
4. Cell editor DOM element is hidden/removed
5. Focus reverts to previously focused element (Create button)
6. ENTER event continues bubbling (not stopped)
7. Create button receives ENTER event
8. Button treats ENTER as click (accessibility feature)
9. Button's click handler creates a new task
10. Result: duplicate task

### Event Flow (After Fix)
1. User presses ENTER in cell editor
2. CellEdit.onInternalKeyDown receives event
3. **event.stopPropagation() is called**
4. finishEditing() is called
5. Cell editor DOM element is hidden/removed
6. Focus reverts to previously focused element (Create button)
7. Event propagation stopped (no bubbling)
8. Create button does NOT receive ENTER event
9. Result: no duplicate task

## Browser Compatibility
The `stopPropagation()` method is part of the DOM Level 2 Events specification and is supported in all modern browsers:
- Chrome/Edge (all versions)
- Firefox (all versions)
- Safari (all versions)
- Internet Explorer 9+

## Performance Impact
Negligible - single method call on an existing event object.

## Security Considerations
No security implications. This is a UI behavior fix that improves user experience.

## Maintenance Notes
- This is a minimal, surgical fix affecting only ENTER key handling
- No changes to other event handlers or navigation logic
- Easy to test and verify
- Low risk of regression

## References
- Issue: [BUG] A bug with `CellEdit` feature when first task created
- Bryntum Gantt: https://bryntum.com/products/gantt/examples/advanced/
