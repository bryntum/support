/**
 * Mobile Search Field Visibility Fix
 * 
 * This JavaScript utility addresses issue #11678 where the example browser's 
 * search field is not visible on mobile devices.
 * 
 * Usage:
 * 1. Include this script in your example browser
 * 2. Call MobileSearchFix.init() after DOM is loaded
 * 3. Optionally customize with options
 */

(function(window, document) {
    'use strict';

    const MobileSearchFix = {
        // Configuration options
        options: {
            mobileBreakpoint: 768,
            searchSelectors: [
                '.search-field',
                '.example-browser-search',
                '.bryntum-search-input',
                'input[type="search"]',
                'input[placeholder*="search" i]',
                'input[placeholder*="filter" i]',
                '#search',
                '#filter'
            ],
            containerSelectors: [
                '.search-container',
                '.search-wrapper',
                '.example-search-container'
            ],
            headerSelectors: [
                '.example-browser-header',
                '.demo-header',
                '.bryntum-header',
                '.header'
            ],
            enableDebugMode: false,
            preventIOSZoom: true,
            minTouchTarget: 44
        },

        // Initialize the fix
        init: function(customOptions) {
            // Merge custom options
            if (customOptions) {
                Object.assign(this.options, customOptions);
            }

            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.apply());
            } else {
                this.apply();
            }

            // Re-apply on window resize
            window.addEventListener('resize', () => this.debounce(() => this.apply(), 250));
        },

        // Apply the mobile search fix
        apply: function() {
            const isMobile = this.isMobileDevice();
            
            if (this.options.enableDebugMode) {
                console.log('MobileSearchFix: Applying fix', { isMobile, width: window.innerWidth });
            }

            // Find all search fields
            const searchFields = this.findSearchFields();
            const containers = this.findContainers();
            const headers = this.findHeaders();

            if (isMobile) {
                this.applyMobileStyles(searchFields, containers, headers);
            }

            // Apply general fixes regardless of device
            this.applyGeneralFixes(searchFields);
        },

        // Find search fields using multiple selectors
        findSearchFields: function() {
            const fields = [];
            this.options.searchSelectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    if (!fields.includes(el)) {
                        fields.push(el);
                    }
                });
            });
            return fields;
        },

        // Find search containers
        findContainers: function() {
            const containers = [];
            this.options.containerSelectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    if (!containers.includes(el)) {
                        containers.push(el);
                    }
                });
            });
            return containers;
        },

        // Find header elements
        findHeaders: function() {
            const headers = [];
            this.options.headerSelectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    if (!headers.includes(el)) {
                        headers.push(el);
                    }
                });
            });
            return headers;
        },

        // Check if device is mobile
        isMobileDevice: function() {
            return window.innerWidth <= this.options.mobileBreakpoint;
        },

        // Apply mobile-specific styles
        applyMobileStyles: function(searchFields, containers, headers) {
            // Style search fields for mobile
            searchFields.forEach(field => {
                this.setStyles(field, {
                    display: 'block',
                    width: '100%',
                    padding: '12px 15px',
                    fontSize: this.options.preventIOSZoom && this.isIOS() ? '16px' : null,
                    minHeight: this.options.minTouchTarget + 'px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    boxSizing: 'border-box',
                    backgroundColor: 'white'
                });

                // Add mobile-specific attributes
                if (!field.getAttribute('placeholder')) {
                    field.setAttribute('placeholder', 'Search examples...');
                }
                
                if (!field.getAttribute('aria-label')) {
                    field.setAttribute('aria-label', 'Search examples');
                }
            });

            // Style containers for mobile
            containers.forEach(container => {
                this.setStyles(container, {
                    display: 'flex',
                    width: '100%',
                    marginBottom: '15px',
                    flexDirection: 'row',
                    alignItems: 'center',
                    order: '-1'
                });
            });

            // Style headers for mobile
            headers.forEach(header => {
                this.setStyles(header, {
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    padding: '15px',
                    gap: '10px'
                });
            });
        },

        // Apply general fixes
        applyGeneralFixes: function(searchFields) {
            searchFields.forEach(field => {
                // Ensure visibility
                this.setStyles(field, {
                    display: 'block',
                    visibility: 'visible',
                    opacity: '1'
                });

                // Add focus handler for accessibility
                if (!field.dataset.mobileSearchFixed) {
                    field.addEventListener('focus', () => {
                        if (this.isMobileDevice() && this.isIOS()) {
                            // Scroll to search field on iOS to avoid keyboard issues
                            setTimeout(() => {
                                field.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }, 100);
                        }
                    });

                    field.dataset.mobileSearchFixed = 'true';
                }
            });
        },

        // Utility to set multiple styles
        setStyles: function(element, styles) {
            Object.keys(styles).forEach(property => {
                if (styles[property] !== null) {
                    element.style[property] = styles[property];
                }
            });
        },

        // Check if device is iOS
        isIOS: function() {
            return /iPad|iPhone|iPod/.test(navigator.userAgent);
        },

        // Debounce utility
        debounce: function(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },

        // Create search field programmatically if none exists
        createSearchField: function(targetContainer) {
            const searchContainer = document.createElement('div');
            searchContainer.className = 'search-container mobile-search-created';
            
            const searchField = document.createElement('input');
            searchField.type = 'search';
            searchField.className = 'search-field';
            searchField.placeholder = 'Search examples...';
            searchField.setAttribute('aria-label', 'Search examples');
            
            const searchButton = document.createElement('button');
            searchButton.type = 'button';
            searchButton.className = 'search-button';
            searchButton.setAttribute('aria-label', 'Search');
            searchButton.innerHTML = '🔍';
            
            searchContainer.appendChild(searchField);
            searchContainer.appendChild(searchButton);
            
            if (targetContainer) {
                targetContainer.insertBefore(searchContainer, targetContainer.firstChild);
            }
            
            return { container: searchContainer, field: searchField, button: searchButton };
        },

        // Debug method to highlight search fields
        debugHighlight: function() {
            const searchFields = this.findSearchFields();
            searchFields.forEach(field => {
                field.style.border = '3px solid red';
                field.style.backgroundColor = 'yellow';
            });
            console.log('Found search fields:', searchFields);
        },

        // Force show search (emergency fix)
        forceShow: function() {
            const allInputs = document.querySelectorAll('input[type="search"], input[type="text"]');
            allInputs.forEach(input => {
                if (input.placeholder && input.placeholder.toLowerCase().includes('search')) {
                    this.setStyles(input, {
                        display: 'block !important',
                        visibility: 'visible !important',
                        opacity: '1 !important',
                        position: 'relative !important',
                        width: '100% !important'
                    });
                }
            });
        }
    };

    // Auto-initialize if not already done
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (!window.mobileSearchFixApplied) {
                MobileSearchFix.init();
                window.mobileSearchFixApplied = true;
            }
        });
    } else {
        if (!window.mobileSearchFixApplied) {
            MobileSearchFix.init();
            window.mobileSearchFixApplied = true;
        }
    }

    // Expose to global scope
    window.MobileSearchFix = MobileSearchFix;

    // Example usage:
    // MobileSearchFix.init({
    //     mobileBreakpoint: 600,
    //     enableDebugMode: true
    // });

})(window, document);