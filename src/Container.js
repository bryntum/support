/**
 * Minimal Container implementation demonstrating change tracking.
 * 
 * A Container tracks whether any of its fields have changed from their initial values.
 * The hasChanges property should only be true when a user actually modifies a field value,
 * not when values are being set during configuration.
 */

class Container {
    constructor(config = {}) {
        this.isConfiguring = true;
        this.items = config.items || [];
        this.cleanValues = {};
        this.initialValues = {};
        this.trackFieldValues = true;
        
        // Initialize child widgets
        this.items.forEach(item => {
            if (item.parent === undefined) {
                item.parent = this;
            }
        });
        
        // Distribute initial values
        this.distributeValues();
        
        this.isConfiguring = false;
    }
    
    /**
     * Distributes values to child widgets and tracks them for change detection.
     */
    distributeValues() {
        this.eachWidget(widget => {
            if (widget.name && widget.value !== undefined) {
                // Track initial values
                if (this.trackFieldValues) {
                    this.cleanValues[widget.name] = widget.value;
                    this.initialValues[widget.name] = widget.value;
                }
            }
        });
    }
    
    /**
     * Iterates over all widgets in this container.
     */
    eachWidget(callback, deep = true) {
        this.items.forEach(item => {
            callback(item);
            
            // Recursively process child containers
            if (deep && item.items && item.eachWidget) {
                item.eachWidget(callback, deep);
            }
        });
    }
    
    /**
     * Called when a field value changes.
     */
    onFieldChange(field, newValue, oldValue) {
        if (field.name && this.trackFieldValues) {
            this.cleanValues[field.name] = newValue;
        }
    }
    
    /**
     * Returns true if any field values have changed from their initial values.
     */
    get hasChanges() {
        const { cleanValues, initialValues } = this;
        
        // Check if any field value differs from initial value
        for (let name in cleanValues) {
            if (cleanValues[name] !== initialValues[name]) {
                return true;
            }
        }
        
        for (let name in initialValues) {
            if (!(name in cleanValues)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Gets the current values of all fields.
     */
    getValues() {
        return { ...this.cleanValues };
    }
}

module.exports = { Container };
