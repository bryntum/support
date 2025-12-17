/**
 * Example usage of beforeDependencyDelete event
 * This demonstrates various ways to use the new event in real-world scenarios
 */

// Example 1: Simple validation - prevent deletion of locked dependencies
const gantt1 = new Gantt({
    appendTo: 'container',
    
    // ... other configuration
    
    listeners: {
        beforeDependencyDelete({ dependency }) {
            // Check if dependency is locked
            if (dependency.locked) {
                // Show a message to the user
                Toast.show({
                    html: 'This dependency is locked and cannot be deleted',
                    color: 'b-orange'
                });
                
                // Prevent the deletion
                return false;
            }
            // Allow deletion for unlocked dependencies
        }
    }
});

// Example 2: Confirmation dialog before deletion
const gantt2 = new Gantt({
    appendTo: 'container',
    
    listeners: {
        async beforeDependencyDelete({ dependency, source }) {
            // Get task objects to display names
            const fromTaskObj = source.taskStore.getById(dependency.fromTask);
            const toTaskObj = source.taskStore.getById(dependency.toTask);
            const fromTask = fromTaskObj?.name || 'Unknown';
            const toTask = toTaskObj?.name || 'Unknown';
            
            // Show confirmation dialog
            const result = await MessageDialog.confirm({
                title: 'Delete Dependency',
                message: `Do you want to delete the dependency from "${fromTask}" to "${toTask}"?`,
                okButton: 'Delete',
                cancelButton: 'Cancel'
            });
            
            // Result is true if OK was clicked, false if cancelled
            return result;
        }
    }
});

// Example 3: Server-side validation before deletion
const gantt3 = new Gantt({
    appendTo: 'container',
    
    listeners: {
        async beforeDependencyDelete({ dependency }) {
            try {
                // Check with server if deletion is allowed
                const response = await fetch(`/api/dependencies/${dependency.id}/validate-delete`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        dependencyId: dependency.id,
                        projectId: gantt3.project.id
                    })
                });
                
                const result = await response.json();
                
                if (!result.canDelete) {
                    // Show reason why deletion is not allowed
                    Toast.show({
                        html: result.message || 'Cannot delete this dependency',
                        color: 'b-red',
                        timeout: 5000
                    });
                    return false;
                }
                
                // Server approved the deletion
                return true;
                
            } catch (error) {
                console.error('Error validating dependency deletion:', error);
                Toast.show({
                    html: 'Error validating deletion. Please try again.',
                    color: 'b-red'
                });
                return false;
            }
        }
    }
});

// Example 4: Soft delete with undo capability
const gantt4 = new Gantt({
    appendTo: 'container',
    
    listeners: {
        async beforeDependencyDelete({ dependency }) {
            // Instead of removing from store, mark as deleted
            dependency.isDeleted = true;
            dependency.deletedAt = new Date();
            
            // Add a CSS class to visually indicate deletion
            dependency.cls = (dependency.cls || '') + ' b-dependency-deleted';
            
            // Show undo toast
            const toast = Toast.show({
                html: `
                    <div>
                        Dependency deleted
                        <button class="b-button b-button-sm" data-undo-dependency="${dependency.id}">
                            Undo
                        </button>
                    </div>
                `,
                color: 'b-blue',
                timeout: 5000
            });
            
            // Handle undo
            const undoButton = toast.element.querySelector('[data-undo-dependency]');
            undoButton?.addEventListener('click', () => {
                dependency.isDeleted = false;
                dependency.deletedAt = null;
                dependency.cls = dependency.cls.replace('b-dependency-deleted', '').trim();
                toast.close();
                Toast.show('Dependency restored');
            });
            
            // Prevent actual deletion from store
            return false;
        }
    }
});

// Example 5: Audit logging
const gantt5 = new Gantt({
    appendTo: 'container',
    
    listeners: {
        beforeDependencyDelete({ dependency, source }) {
            // Log the deletion attempt
            const auditData = {
                action: 'dependency_delete',
                timestamp: new Date().toISOString(),
                dependencyId: dependency.id,
                fromTask: dependency.fromTask,
                toTask: dependency.toTask,
                type: dependency.type,
                userId: currentUser.id,
                projectId: source.project.id
            };
            
            // Send to analytics/audit system
            fetch('/api/audit-log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(auditData)
            }).catch(err => console.error('Audit logging failed:', err));
            
            // Allow the deletion to proceed
            // (not returning false means event is not prevented)
        }
    }
});

// Example 6: Conditional validation based on project state
const gantt6 = new Gantt({
    appendTo: 'container',
    
    listeners: {
        beforeDependencyDelete({ dependency, source }) {
            const project = source.project;
            
            // Check if project is in read-only state
            if (project.readOnly) {
                MessageDialog.alert({
                    title: 'Project is Read-Only',
                    message: 'This project is in read-only mode. No changes can be made.'
                });
                return false;
            }
            
            // Check if project is archived
            if (project.archived) {
                MessageDialog.alert({
                    title: 'Project Archived',
                    message: 'Cannot modify archived projects.'
                });
                return false;
            }
            
            // Check user permissions
            if (!currentUser.hasPermission('delete_dependencies')) {
                MessageDialog.alert({
                    title: 'Insufficient Permissions',
                    message: 'You do not have permission to delete dependencies.'
                });
                return false;
            }
            
            // All checks passed, allow deletion
        }
    }
});

// Example 7: Batch deletion with confirmation
const gantt7 = new Gantt({
    appendTo: 'container',
    
    listeners: {
        beforeDependencyDelete({ dependency }) {
            // Track deletion attempts in this session
            if (!gantt7.deletionQueue) {
                gantt7.deletionQueue = [];
            }
            
            gantt7.deletionQueue.push(dependency);
            
            // If multiple dependencies being deleted, show aggregate confirmation
            if (gantt7.deletionQueue.length > 1) {
                clearTimeout(gantt7.deletionTimer);
                
                gantt7.deletionTimer = setTimeout(async () => {
                    const count = gantt7.deletionQueue.length;
                    const confirmed = await MessageDialog.confirm({
                        title: 'Delete Multiple Dependencies',
                        message: `Delete ${count} dependencies?`
                    });
                    
                    if (!confirmed) {
                        // Cancel all deletions
                        gantt7.deletionQueue = [];
                    }
                }, 1000);
                
                // Defer the actual deletion
                return false;
            }
        }
    }
});

// Example 8: Integration with custom dependency rules engine
const gantt8 = new Gantt({
    appendTo: 'container',
    
    listeners: {
        async beforeDependencyDelete({ dependency, source }) {
            // Custom rules engine
            const rules = [
                {
                    name: 'Critical Path Protection',
                    check: (dep) => !dep.isCriticalPath,
                    message: 'Cannot delete dependencies on the critical path'
                },
                {
                    name: 'External Dependency Protection',
                    check: (dep) => !dep.isExternal,
                    message: 'External dependencies cannot be deleted from this view'
                },
                {
                    name: 'Baseline Protection',
                    check: (dep) => !source.project.hasBaseline || !dep.isInBaseline,
                    message: 'Cannot delete dependencies that are part of the baseline'
                }
            ];
            
            // Check all rules
            for (const rule of rules) {
                if (!rule.check(dependency)) {
                    await MessageDialog.alert({
                        title: 'Deletion Not Allowed',
                        message: `${rule.name}: ${rule.message}`
                    });
                    return false;
                }
            }
            
            // All rules passed
        }
    }
});
