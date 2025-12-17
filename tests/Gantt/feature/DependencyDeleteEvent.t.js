/**
 * Test suite for beforeDependencyDelete event on dependency line delete button
 */

StartTest(t => {
    let gantt, dependencyStore, eventFired, eventData;

    t.beforeEach(() => {
        eventFired = false;
        eventData = null;
        
        // Reset any event listeners
        if (gantt) {
            gantt.destroy();
        }
    });

    t.afterEach(() => {
        if (gantt && !gantt.isDestroyed) {
            gantt.destroy();
        }
    });

    function createGantt(config = {}) {
        return t.getGantt({
            appendTo: document.body,
            
            tasks: [
                { id: 1, name: 'Task 1', startDate: '2025-01-01', duration: 5 },
                { id: 2, name: 'Task 2', startDate: '2025-01-08', duration: 5 }
            ],
            
            dependencies: [
                { id: 1, fromTask: 1, toTask: 2, type: 2 }
            ],
            
            features: {
                dependencies: true,
                dependencyEdit: true
            },
            
            ...config
        });
    }

    t.it('Should fire beforeDependencyDelete event when delete button is clicked', async t => {
        gantt = createGantt({
            listeners: {
                beforeDependencyDelete({ dependency }) {
                    eventFired = true;
                    eventData = { dependency };
                }
            }
        });

        await t.waitForProjectReady(gantt);
        
        const dependency = gantt.dependencyStore.first;
        t.ok(dependency, 'Dependency exists');
        
        // Simulate clicking on a dependency line to select it
        await t.click('.b-gantt-dependency[data-dependency-id="1"]');
        
        // Click the delete button on the dependency line
        await t.click('.b-dependency-delete-btn[data-dependency-id="1"]');
        
        await t.waitFor(() => eventFired);
        
        t.ok(eventFired, 'beforeDependencyDelete event was fired');
        t.ok(eventData, 'Event data was captured');
        t.is(eventData.dependency, dependency, 'Event contains correct dependency');
    });

    t.it('Should prevent deletion when beforeDependencyDelete returns false', async t => {
        let preventDeletion = true;
        
        gantt = createGantt({
            listeners: {
                beforeDependencyDelete({ dependency }) {
                    eventFired = true;
                    eventData = { dependency };
                    
                    // Prevent the deletion
                    if (preventDeletion) {
                        return false;
                    }
                }
            }
        });

        await t.waitForProjectReady(gantt);
        
        const dependency = gantt.dependencyStore.first;
        const initialCount = gantt.dependencyStore.count;
        
        t.ok(dependency, 'Dependency exists');
        t.is(initialCount, 1, 'Store has 1 dependency');
        
        // Click on dependency line to select it
        await t.click('.b-gantt-dependency[data-dependency-id="1"]');
        
        // Click delete button
        await t.click('.b-dependency-delete-btn[data-dependency-id="1"]');
        
        await t.waitFor(() => eventFired);
        
        t.ok(eventFired, 'beforeDependencyDelete event was fired');
        
        // Dependency should still exist because we prevented deletion
        t.is(gantt.dependencyStore.count, initialCount, 'Dependency was not deleted');
        t.ok(gantt.dependencyStore.getById(1), 'Dependency still exists in store');
    });

    t.it('Should delete dependency when beforeDependencyDelete is not prevented', async t => {
        gantt = createGantt({
            listeners: {
                beforeDependencyDelete({ dependency }) {
                    eventFired = true;
                    eventData = { dependency };
                    // Do not prevent - allow deletion
                }
            }
        });

        await t.waitForProjectReady(gantt);
        
        const dependency = gantt.dependencyStore.first;
        const initialCount = gantt.dependencyStore.count;
        
        t.ok(dependency, 'Dependency exists');
        t.is(initialCount, 1, 'Store has 1 dependency');
        
        // Click on dependency line to select it
        await t.click('.b-gantt-dependency[data-dependency-id="1"]');
        
        // Click delete button
        await t.click('.b-dependency-delete-btn[data-dependency-id="1"]');
        
        await t.waitFor(() => eventFired);
        
        t.ok(eventFired, 'beforeDependencyDelete event was fired');
        
        // Wait for the dependency to be removed
        await t.waitFor(() => gantt.dependencyStore.count === 0);
        
        t.is(gantt.dependencyStore.count, 0, 'Dependency was deleted');
        t.notOk(gantt.dependencyStore.getById(1), 'Dependency no longer exists in store');
    });

    t.it('Should allow custom logic before deletion', async t => {
        let customLogicExecuted = false;
        let canDelete = false;
        
        gantt = createGantt({
            listeners: {
                async beforeDependencyDelete({ dependency }) {
                    eventFired = true;
                    
                    // Execute custom logic (e.g., show confirmation dialog)
                    customLogicExecuted = true;
                    
                    // Simulate async operation (like user confirmation)
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    // Only allow deletion if canDelete is true
                    return canDelete;
                }
            }
        });

        await t.waitForProjectReady(gantt);
        
        const dependency = gantt.dependencyStore.first;
        
        // First attempt - should prevent deletion
        canDelete = false;
        eventFired = false;
        customLogicExecuted = false;
        
        await t.click('.b-gantt-dependency[data-dependency-id="1"]');
        await t.click('.b-dependency-delete-btn[data-dependency-id="1"]');
        
        await t.waitFor(() => eventFired);
        
        t.ok(customLogicExecuted, 'Custom logic was executed');
        t.ok(gantt.dependencyStore.getById(1), 'Dependency still exists after prevention');
        
        // Second attempt - should allow deletion
        canDelete = true;
        eventFired = false;
        customLogicExecuted = false;
        
        await t.click('.b-gantt-dependency[data-dependency-id="1"]');
        await t.click('.b-dependency-delete-btn[data-dependency-id="1"]');
        
        await t.waitFor(() => eventFired);
        await t.waitFor(() => gantt.dependencyStore.count === 0);
        
        t.ok(customLogicExecuted, 'Custom logic was executed');
        t.notOk(gantt.dependencyStore.getById(1), 'Dependency was deleted after allowing');
    });

    t.it('Should include source Gantt instance in event data', async t => {
        gantt = createGantt({
            listeners: {
                beforeDependencyDelete({ dependency, source }) {
                    eventFired = true;
                    eventData = { dependency, source };
                }
            }
        });

        await t.waitForProjectReady(gantt);
        
        await t.click('.b-gantt-dependency[data-dependency-id="1"]');
        await t.click('.b-dependency-delete-btn[data-dependency-id="1"]');
        
        await t.waitFor(() => eventFired);
        
        t.ok(eventData.source, 'Event includes source');
        t.is(eventData.source, gantt, 'Source is the Gantt instance');
    });

    t.it('Should work consistently with multiple dependencies', async t => {
        let deleteAttempts = [];
        
        gantt = createGantt({
            tasks: [
                { id: 1, name: 'Task 1', startDate: '2025-01-01', duration: 5 },
                { id: 2, name: 'Task 2', startDate: '2025-01-08', duration: 5 },
                { id: 3, name: 'Task 3', startDate: '2025-01-15', duration: 5 }
            ],
            
            dependencies: [
                { id: 1, fromTask: 1, toTask: 2, type: 2 },
                { id: 2, fromTask: 2, toTask: 3, type: 2 }
            ],
            
            listeners: {
                beforeDependencyDelete({ dependency }) {
                    deleteAttempts.push(dependency.id);
                    // Only allow deletion of dependency with id 1
                    return dependency.id === 1;
                }
            }
        });

        await t.waitForProjectReady(gantt);
        
        t.is(gantt.dependencyStore.count, 2, 'Initially has 2 dependencies');
        
            // Try to delete dependency 2 (should be prevented)
        await t.click('.b-gantt-dependency[data-dependency-id="2"]');
        await t.click('.b-dependency-delete-btn[data-dependency-id="2"]');
        
        await t.waitFor(() => deleteAttempts.length === 1);
        
        t.is(gantt.dependencyStore.count, 2, 'Still has 2 dependencies');
        t.is(deleteAttempts[0], 2, 'First delete attempt was for dependency 2');
        
        // Try to delete dependency 1 (should succeed)
        await t.click('.b-gantt-dependency[data-dependency-id="1"]');
        await t.click('.b-dependency-delete-btn[data-dependency-id="1"]');
        
        await t.waitFor(() => deleteAttempts.length === 2);
        await t.waitFor(() => gantt.dependencyStore.count === 1);
        
        t.is(gantt.dependencyStore.count, 1, 'Now has 1 dependency');
        t.is(deleteAttempts[1], 1, 'Second delete attempt was for dependency 1');
        t.notOk(gantt.dependencyStore.getById(1), 'Dependency 1 was deleted');
        t.ok(gantt.dependencyStore.getById(2), 'Dependency 2 still exists');
    });
});
