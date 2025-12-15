/**
 * Test cases for Slider labelWidth fix
 * 
 * These tests verify that the labelWidth configuration only affects the field label,
 * not the value display label.
 */

describe('Slider labelWidth configuration', () => {
    let slider;
    
    beforeEach(() => {
        // Setup before each test
        document.body.innerHTML = '<div id="container"></div>';
    });
    
    afterEach(() => {
        // Cleanup after each test
        if (slider && slider.destroy) {
            slider.destroy();
        }
        document.body.innerHTML = '';
    });
    
    it('should apply labelWidth only to field label, not value label', () => {
        // Create slider with labelWidth config
        slider = new Slider({
            appendTo: 'container',
            label: 'Volume',
            labelWidth: 150,
            value: 65,
            min: 0,
            max: 100
        });
        
        const fieldLabel = slider.element.querySelector('.b-label');
        const valueLabel = slider.element.querySelector('.b-value-label');
        
        // Field label should have the configured width
        expect(fieldLabel.style.width).toBe('150px');
        
        // Value label should NOT have the labelWidth applied
        // It should be auto or have its own width
        expect(valueLabel.style.width).not.toBe('150px');
        expect(valueLabel.style.width).toMatch(/^(auto|fit-content|)$/);
    });
    
    it('should allow field label width change without affecting value label', () => {
        slider = new Slider({
            appendTo: 'container',
            label: 'Brightness',
            labelWidth: 100,
            value: 80
        });
        
        const fieldLabel = slider.element.querySelector('.b-label');
        const valueLabel = slider.element.querySelector('.b-value-label');
        const initialValueLabelWidth = valueLabel.style.width;
        
        // Change labelWidth
        slider.labelWidth = 200;
        
        // Field label should update
        expect(fieldLabel.style.width).toBe('200px');
        
        // Value label should remain unchanged
        expect(valueLabel.style.width).toBe(initialValueLabelWidth);
    });
    
    it('should handle various labelWidth values correctly', () => {
        const testValues = [
            { labelWidth: 50, expected: '50px' },
            { labelWidth: '100px', expected: '100px' },
            { labelWidth: '10em', expected: '10em' },
            { labelWidth: null, expected: '' }
        ];
        
        testValues.forEach(({ labelWidth, expected }) => {
            slider = new Slider({
                appendTo: 'container',
                label: 'Test',
                labelWidth: labelWidth,
                value: 50
            });
            
            const fieldLabel = slider.element.querySelector('.b-label');
            const valueLabel = slider.element.querySelector('.b-value-label');
            
            expect(fieldLabel.style.width).toBe(expected);
            // Value label should always be independent
            expect(valueLabel.style.width).not.toBe(expected);
            
            slider.destroy();
        });
    });
    
    it('should render value label with content-based width', () => {
        slider = new Slider({
            appendTo: 'container',
            label: 'Bass',
            labelWidth: 120,
            value: 2
        });
        
        const valueLabel = slider.element.querySelector('.b-value-label');
        const computedStyle = window.getComputedStyle(valueLabel);
        
        // Value label should size based on content
        expect(computedStyle.width).not.toBe('120px');
        
        // Update value to longer text
        slider.value = 100;
        
        const newComputedStyle = window.getComputedStyle(valueLabel);
        
        // Width should change based on content (if auto-sized)
        // This verifies it's not fixed by labelWidth
        expect(newComputedStyle.width).not.toBe(computedStyle.width);
    });
    
    it('should maintain proper layout with different labelWidth values', () => {
        const containers = ['container1', 'container2', 'container3'].map(id => {
            const div = document.createElement('div');
            div.id = id;
            document.body.appendChild(div);
            return div;
        });
        
        const sliders = [
            new Slider({
                appendTo: 'container1',
                label: 'Volume',
                labelWidth: 80,
                value: 65
            }),
            new Slider({
                appendTo: 'container2',
                label: 'Brightness',
                labelWidth: 120,
                value: 80
            }),
            new Slider({
                appendTo: 'container3',
                label: 'Bass',
                labelWidth: 100,
                value: 2
            })
        ];
        
        sliders.forEach(slider => {
            const fieldLabel = slider.element.querySelector('.b-label');
            const valueLabel = slider.element.querySelector('.b-value-label');
            
            // Each field label should have its configured width
            expect(fieldLabel.style.width).toBe(`${slider.labelWidth}px`);
            
            // All value labels should be independent of labelWidth
            expect(valueLabel.style.width).not.toBe(`${slider.labelWidth}px`);
        });
        
        sliders.forEach(s => s.destroy());
        containers.forEach(c => c.remove());
    });
});
