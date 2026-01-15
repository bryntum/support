/**
 * Minimal Combo field implementation demonstrating the fix for Container hasChanges issue.
 * 
 * The issue: When a Combo's store loads asynchronously and sets the value, the isConfiguring
 * state is not preserved, causing change events to fire during configuration, which makes
 * the parent Container think there are changes when there shouldn't be.
 */

class Combo {
    constructor(config = {}) {
        this.isConfiguring = true;
        this.store = config.store;
        this._value = config.value;
        this.name = config.name;
        this.initialValue = undefined;
        
        // If store is not loaded yet and value is set, we need to wait for store to load
        if (this._value !== undefined && this.store && !this.store.isLoaded) {
            this.setValueAfterStoreLoad(this._value);
        } else if (this._value !== undefined) {
            this.value = this._value;
        }
        
        this.isConfiguring = false;
        this.initialValue = this._value;
    }
    
    get value() {
        return this._value;
    }
    
    set value(value) {
        const oldValue = this._value;
        this._value = value;
        
        // Only trigger change event if not configuring
        if (!this.isConfiguring && oldValue !== value) {
            this.onChange(value, oldValue);
        }
    }
    
    onChange(newValue, oldValue) {
        // Notify parent container of change
        if (this.parent && this.parent.onFieldChange) {
            this.parent.onFieldChange(this, newValue, oldValue);
        }
    }
    
    /**
     * FIXED: This method now properly propagates the isConfiguring state
     * when setting the value after store loads.
     */
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
    
    /**
     * OLD BUGGY VERSION (for reference):
     * 
     * setValueAfterStoreLoad(value) {
     *     const me = this;
     *     me.store.ion({
     *         load : () => me.value = value,
     *         once : true,
     *         thisObj : me
     *     });
     * }
     * 
     * The bug: isConfiguring was lost by the time the load event fired,
     * so setting the value would trigger onChange and mark the Container as having changes.
     */
}

// Mock Store class for demonstration
class Store {
    constructor(config = {}) {
        this.data = config.data || [];
        this.isLoaded = false;
        this.listeners = [];
        this.url = config.url;
        this._loadPromise = null;
        
        // Simulate async loading if URL is provided
        if (this.url) {
            this.load();
        } else {
            this.isLoaded = true;
        }
    }
    
    load() {
        // Simulate async load and expose promise for testing
        this._loadPromise = new Promise(resolve => {
            setTimeout(() => {
                this.isLoaded = true;
                this.notifyListeners('load');
                resolve();
            }, 10);
        });
        return this._loadPromise;
    }
    
    /**
     * Wait for store to be loaded - useful for testing
     */
    async waitForLoad() {
        if (this.isLoaded) {
            return Promise.resolve();
        }
        return this._loadPromise || Promise.resolve();
    }
    
    ion(config) {
        this.listeners.push(config);
        
        // If already loaded, trigger immediately
        if (this.isLoaded && config.load) {
            config.load.call(config.thisObj || this);
            return;
        }
    }
    
    notifyListeners(event) {
        this.listeners.forEach(listener => {
            if (listener[event]) {
                listener[event].call(listener.thisObj || this);
            }
        });
        
        // Remove once listeners
        this.listeners = this.listeners.filter(listener => !listener.once);
    }
}

module.exports = { Combo, Store };
