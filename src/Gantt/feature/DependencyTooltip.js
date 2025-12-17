/**
 * @module Gantt/feature/DependencyTooltip
 */

/**
 * Feature that handles dependency line interactions including selection and deletion.
 * This is a reference implementation showing where the beforeDependencyDelete event should be fired.
 *
 * ## Events fired:
 * 
 * - {@link #event-beforeDependencyDelete} - Fired before a dependency is deleted via the delete button on the dependency line.
 *   This event is preventable.
 *
 * @extends Core/mixin/Events
 */
export default class DependencyTooltip {
    
    /**
     * Fired before a dependency is deleted via the delete button on the dependency line.
     * Allows for custom logic or cancellation of the deletion.
     *
     * @event beforeDependencyDelete
     * @preventable
     * @param {Gantt.model.DependencyModel} dependency The dependency record about to be deleted
     * @param {Gantt.view.Gantt} source The Gantt instance
     */

    /**
     * Internal method called when the delete button on a dependency line is clicked.
     * This is where the beforeDependencyDelete event should be fired.
     * 
     * @param {Gantt.model.DependencyModel} dependency The dependency to delete
     * @returns {Boolean} Returns false if the deletion was prevented, true otherwise
     * @private
     */
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
    
    /**
     * Setup the click handler for the delete button
     * This method should be called during feature initialization
     * @private
     */
    setupDeleteButtonHandler() {
        const me = this;
        
        // Add event delegation for delete button clicks
        me.client.element.addEventListener('click', async (event) => {
            const deleteButton = event.target.closest('.b-dependency-delete-btn');
            
            if (deleteButton) {
                // Extract dependency information from the button's data attribute
                const dependencyId = deleteButton.dataset.dependencyId;
                const dependency = me.client.dependencyStore.getById(dependencyId);
                
                if (dependency) {
                    // Prevent default behavior
                    event.preventDefault();
                    event.stopPropagation();
                    
                    // Call the delete handler which fires the event
                    await me.onDependencyDeleteClick(dependency);
                }
            }
        });
    }
}
