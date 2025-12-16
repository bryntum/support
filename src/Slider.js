// Fix for labelWidth affecting value label
// In compose method, only apply labelWidth to internalLabel (field label),
// not to the value label element

compose() {
    const { labelWidth } = this;
    
    return {
        class: {
            // ...existing classes
        },
        children: {
            // Field label - should be affected by labelWidth
            internalLabel: labelWidth && {
                style: {
                    width: DomHelper.setLength(labelWidth)
                }
            },
            // Value label - should NOT be affected by labelWidth
            valueLabel: {
                // width remains auto/default, not constrained by labelWidth
            }
        }
    };
}
