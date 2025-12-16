// Fix for labelWidth affecting value label
// Only target .b-label selector in updateLabelWidth(), not .b-value-label

updateLabelWidth(width) {
    const fieldLabel = this.element.querySelector('.b-label');
    if (fieldLabel && width != null) {
        fieldLabel.style.width = DomHelper.setLength(width);
    }
}
