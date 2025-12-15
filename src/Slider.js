/**
 * Slider Component - JavaScript/TypeScript Fix
 * 
 * This file demonstrates the proper fix for the labelWidth issue in the Slider component.
 * 
 * ISSUE: The labelWidth configuration was being applied to both:
 * 1. The field label element (correct)
 * 2. The value display label element (incorrect)
 * 
 * FIX: Separate the styling logic so labelWidth only affects the field label.
 */

/**
 * Slider field component
 */
class Slider {
    /**
     * Configuration options
     */
    config = {
        /**
         * Width of the field label. Should only affect the label text like "Volume", "Brightness",
         * NOT the value display label like "65", "80", etc.
         * @type {Number|String}
         */
        labelWidth: null,
        
        /**
         * Optional: Separate config for value label width if needed
         * @type {Number|String}
         */
        valueLabelWidth: null,
        
        // ... other configs
    };
    
    /**
     * Apply styles to elements
     */
    updateLabelWidth(width) {
        // BEFORE FIX - Incorrect implementation:
        // This was applying the width to ALL labels including value display
        /*
        const labels = this.element.querySelectorAll('.b-label, .b-value-label');
        labels.forEach(label => {
            label.style.width = width;
        });
        */
        
        // AFTER FIX - Correct implementation:
        // Only apply labelWidth to the field label, not the value display
        const fieldLabel = this.element.querySelector('.b-label');
        if (fieldLabel && width != null) {
            fieldLabel.style.width = typeof width === 'number' ? `${width}px` : width;
        }
        
        // Value label should maintain its own width (auto or from separate config)
        const valueLabel = this.element.querySelector('.b-value-label');
        if (valueLabel) {
            // Value label uses its own width config or defaults to auto
            const valueLabelWidth = this.config.valueLabelWidth || 'auto';
            valueLabel.style.width = typeof valueLabelWidth === 'number' 
                ? `${valueLabelWidth}px` 
                : valueLabelWidth;
        }
    }
    
    /**
     * Render the slider
     */
    render() {
        const html = `
            <div class="b-slider">
                <label class="b-label">${this.config.label}</label>
                <input type="range" class="b-slider-track" />
                <div class="b-value-label">${this.value}</div>
            </div>
        `;
        
        // After rendering, apply the widths correctly
        this.updateLabelWidth(this.config.labelWidth);
    }
}

export default Slider;
