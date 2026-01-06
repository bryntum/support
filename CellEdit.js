/**
 * @module Grid/feature/CellEdit
 */

/**
 * Cell editing feature for Grid and Scheduler.
 * Allows editing cell contents inline.
 *
 * This feature is **enabled** by default for Grid and Scheduler.
 *
 * @extends Grid/feature/Feature
 */
export default class CellEdit extends Feature {
    // ... other methods ...

    /**
     * Finishes cell editing. Validates and applies the new value.
     * @param {Event} event The triggering event
     * @returns {Promise<Boolean>} True if editing was successfully finished
     * @async
     */
    async finishEditing(event) {
        const
            me                      = this,
            { editorContext, grid } = me;

        let result = false;

        // If already waiting for finishing promise, return that
        if (me.finishEditingPromise) {
            return me.finishEditingPromise;
        }

        if (editorContext) {
            const { column } = editorContext;

            // If it's a fake Editor (fabbed up solely to encapsulate naturally focusable cell content),
            // we do not process an Enter key. See usages of getFakeEditor in this file.
            // The focused element inside the cell must process the Enter key
            if (event?.key === 'Enter') {
                if (!editorContext.editor.isEditor) {
                    return false;
                }
                event.stopImmediatePropagation();
            }

            // If completeEdit finds that the editor context has a finalize method in it,
            // it will *await* the completion of that method before completing the edit
            // so we must await completeEdit.
            // We can override that finalize method by passing the column's own finalizeCellEdit.
            // (column might have `internalFinalizeCellEdit` method implementing custom finalization)
            // Set a flag (promise) indicating that we are in the middle of editing finalization
            me.finishEditingPromise = editorContext.editor.completeEdit(column.internalFinalizeCellEdit?.bind(column) || column.bindCallback(column.finalizeCellEdit), event);
            result = await me.finishEditingPromise;

            if (grid.isDestroyed) {
                return;
            }

            // If grid is animating, wait for it to finish to not start a follow-up edit when things are moving
            // (only applies to Scheduler for now, tested in Scheduler´s CellEdit.t.js)
            // Should ideally only check for rowHeight being animated
            if (grid.isSchedulerBase) {
                await grid.waitForAnimations();
            }

            // reset the flag
            me.finishEditingPromise = null;

            if (result) {
                await me.afterCellEdit?.();
            }
        }

        return result;
    }

    // ... other methods ...
}
