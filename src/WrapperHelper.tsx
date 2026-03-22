/**
 * React widget helper
 */
import React, { ReactElement } from 'react';
import ReactDOM, { flushSync } from 'react-dom';
import { DomHelper, StringHelper, Widget } from '@bryntum/schedulerpro';

declare global {

    interface Window {
        bryntum: {
            isTestEnv?: boolean
            react?: {
                isReactElement?: (element: any) => boolean
                handleReactElement?: (widget: Widget, element: any) => void
                handleReactHeaderElement?: (column: { grid: any; id: string }, headerElement: HTMLElement, html: any) => void
            }
        }
    }
}

/**
 * Extends the standard React.ReactPortal type to include an optional `taskGeneration` property.
 * This property can be used to track or associate a generation number with the portal,
 * which may be useful for managing updates or synchronization tasks in complex React applications.
 *
 * @property {number} [taskGeneration] Optional generation number for task tracking or synchronization.
 */
type ReactPortalWithTaskGeneration = React.ReactPortal & { taskGeneration?: number };

/**
 * Represents the state for a React component that manages portals and their generation.
 *
 * @property {Map} portals A map associating unique string keys with `ReactPortalWithTaskGeneration` instances.
 * @property {number} generation A numeric value indicating the current generation or version of the component state.
 */
type ReactComponentState = {
    portals    : Map<string, ReactPortalWithTaskGeneration>
    generation : number
};

/**
 * Extends the standard HTMLElement to include additional optional properties
 * used for managing element-specific data and state within the application.
 *
 * @property {any} [elementData] Arbitrary data associated with the element.
 * @property {string|null} [lastPortalId] Identifier for the last portal rendered into this element, or null if none.
 * @property {boolean} [didSetTextContent] Indicates whether the text content of the element has been set.
 */
type HTMLElementWithData = HTMLElement & {
    elementData?: any
    lastPortalId?: string | null
    didSetTextContent?: boolean
};

/**
 * Development warning. Shown when environment is set to 'development'
 * @param {string} clsName react component instance
 * @param {string} msg console message
 */
function devWarning(clsName: string, msg: string): void {
    // @ts-ignore
    if (window.bryntum?.isTestEnv || process.env.NODE_ENV === 'development') {
        console.warn(
            `Bryntum${clsName}Component development warning!\n${msg}\n` +
            'Please check React integration guide: https://bryntum.com/products/schedulerpro/docs/guide/SchedulerPro/integration/react/guide'
        );
    }
}

function devWarningContainer(clsName: string, containerParam: string): void {
    devWarning(
        clsName,
        `Using "${containerParam}" parameter for configuration is not recommended.\n` +
        'Widget is placed automatically inside its container element.\n' +
        `Solution: remove "${containerParam}" parameter from configuration.`
    );
}

function devWarningConfigProp(clsName: string, prop: string): void {
    devWarning(
        clsName,
        `Using "${prop}" parameter for configuration is not recommended.\n` +
        `Solution: Use separate parameter for each "${prop}" value to enable reactive updates of the API instance`
    );
}

function devWarningProjectProp(clsName: string): void {
    devWarning(
        clsName,
        'Using the "project" prop with inner store configurations is not recommended.\n' +
        `Solution: Use an instance of the 'ProjectModel' class or the '<Bryntum${clsName}ProjectModel/>' component`
    );
}

/**
 * Returns `true` if the provided element is an instance of React Element.
 * All React elements require an additional $$typeof: Symbol.for('react.element') field declared on the object for security reasons.
 * The object, which React.createElement() returns has $$typeof property equal to Symbol.for('react.element')
 *
 * Sources:
 * https://reactjs.org/blog/2015/12/18/react-components-elements-and-instances.html
 * https://github.com/facebook/react/pull/4832
 *
 * @param {*} element Element to check
 * @returns {boolean} True if element is a React element
 * @internal
 */
function isReactElement(element: any): boolean {
    return Boolean(element?.$$typeof === Symbol.for('react.element') || element?.$$typeof === Symbol.for('react.transitional.element'));
}

/**
 * Creates bryntum component config from react component
 * @param {object} reactInstance react component instance
 * @returns {object} config object
 */
function createConfig(reactInstance: any): object {
    const
        { element, props, constructor }         = reactInstance,
        { instanceClass, instanceName, isView } = constructor,
        filter                                  = (arr: any[]) => arr.filter(prop => props[prop] !== undefined),
        configNames                             = filter(constructor.configNames || []),
        propertyConfigNames                     = filter(constructor.propertyConfigNames || []),
        propertyNames                           = filter(constructor.propertyNames || []),
        featureNames                            = filter(constructor.featureNames || []),
        bryntumConfig                           = {
            adopt                  : undefined,
            appendTo               : undefined,
            href                   : undefined,
            reactComponent         : reactInstance,
            listeners              : {},
            features               : {},
            hasFrameworkRenderer   : isView ? hasFrameworkRenderer : undefined,
            processCellContent     : isView ? processCellContent : undefined,
            processCellEditor      : isView ? processCellEditor : undefined,
            processEventContent    : isView ? processEventContent : undefined,
            processTaskContent     : isView ? processTaskContent : undefined,
            processTaskItemContent : isView ? processTaskItemContent : undefined,
            processResourceHeader  : isView ? processResourceHeader : undefined
        } as any;

    // Data store configs support reactive behavior
    const isDataStoreConfig = (prop: any) => {
        if (reactInstance.dataStores) {
            const dataStoreNames = Object.values(reactInstance.dataStores);
            return dataStoreNames.includes(prop) || dataStoreNames.includes(`${prop}Data`);
        }
    };

    // Assign configs. Skip properties
    configNames
        .concat(propertyConfigNames)
        .concat(featureNames)
        .forEach(prop => {
            applyPropValue(bryntumConfig, prop, props[prop]);
            if (['features', 'config'].includes(prop) && !isDataStoreConfig(prop)) {
                devWarningConfigProp(instanceClass.$name, prop);
            }

            // Warn when using project prop with inner stores configs
            if (prop === 'project' && reactInstance.projectStores) {
                // @ts-ignore
                if (Object.values(reactInstance.dataStores).some(store => props[prop][store])) {
                    devWarningProjectProp(instanceClass.$name);
                }
            }
        });

    // Prepare watch arrays
    reactInstance.configNames   = configNames;
    reactInstance.propertyNames = configNames
        .concat(propertyNames)
        .concat(propertyConfigNames)
        .concat(featureNames);

    // Handle inline data for stores
    if (reactInstance.dataStores) {
        Object.values<string>(reactInstance.dataStores).forEach((dataName: string) => {
            if (props[dataName]) {
                bryntumConfig[dataName] = props[dataName];
            }
        });
    }

    // Cleanup unused instance arrays
    if (reactInstance.propertyConfigNames) {
        delete reactInstance.propertyConfigNames;
    }
    if (reactInstance.featureNames) {
        delete reactInstance.featureNames;
    }

    // If component has no container specified in config then use adopt to Wrapper's element
    const containerParam = ['adopt', 'appendTo', 'insertAfter', 'insertBefore'].find(
        prop => bryntumConfig[prop]
    );
    if (!containerParam) {
        if (instanceName === 'Button') {
            // Button should always be <a> or <button> inside owner element
            bryntumConfig.appendTo = element;
        }
        else {
            bryntumConfig.adopt = element;
        }
    }
    else {
        devWarningContainer(instanceClass.$name, containerParam);
    }

    return bryntumConfig;
}

/**
 * Applies property value to Bryntum config or instance.
 * @param {object} configOrInstance target object
 * @param {string} prop property name
 * @param {object} value value
 * @param {boolean} isConfig config setting mode
 */
function applyPropValue(configOrInstance: any, prop: string, value: any, isConfig = true): void {
    // Assigning React wrapper component instance
    if (value?.current?.instance) {
        value = value.current.instance;
    }

    if (prop === 'features' && typeof value === 'object') {
        Object.keys(value).forEach(key =>
            applyPropValue(configOrInstance, `${key}Feature`, value[key], isConfig)
        );
    }
    else if (prop === 'config' && typeof value === 'object') {
        Object.keys(value).forEach(key =>
            applyPropValue(configOrInstance, key, value[key], isConfig)
        );
    }
    else if (prop === 'columns' && !isConfig) {
        configOrInstance.columns = value;
    }
    else if (prop.endsWith('Feature')) {
        const
            { features } = configOrInstance,
            featureName  = prop.replace('Feature', '');
        if (isConfig) {
            features[featureName] = value;
        }
        else {
            const feature = features[featureName];
            if (feature) {
                feature.setConfig(value);
            }
        }
    }
    else {
        configOrInstance[prop] = value;
    }
}

/**
 * Creates bryntum Widget from react component
 * @param {*} component react component instance
 * @returns {*} widget object
 */
function createWidget(component: any): any {
    const { instanceClass, isView } = component.constructor,
        config                    = createConfig(component) as any,
        instance                  = instanceClass.$name === 'Widget' ? Widget.create(config) : new instanceClass(config);

    // Backwards compatibility for gridInstance, schedulerInstance etc.
    if (isView) {
        component[StringHelper.uncapitalize(instanceClass.$name) + 'Instance'] = instance;
    }

    if (isView) {
        // Backwards compatibility for gridInstance, schedulerInstance etc.
        component[StringHelper.uncapitalize(instanceClass.$name) + 'Instance'] = instance;

        const subscribeStores = (storeInstance: { [x: string]: any }, stores: Record<string, unknown>) => {
            if (stores) {
                Object.keys(stores).forEach(storeName => {
                    const store = storeInstance[storeName];
                    if (store) {
                        // Default syncDataOnLoad to true if store is not configured with a readUrl (AjaxStore)
                        // and it doesn't belong to a project that has a loadUrl configured
                        if (store.syncDataOnLoad == null && !store.readUrl && !store.lazyLoad && (!store.crudManager || !store.crudManager.loadUrl)) {
                            store.syncDataOnLoad = true;
                        }

                        store.on('beforeRemove', (context: { records: any; removingAll: any }) => beforeRemoveRecords(component, context));
                    }
                });
            }
        };

        subscribeStores(component.projectStores ? instance.project : instance, component.dataStores);
    }

    // To be able to detect data changes later
    if (config['data']) {
        instance.lastDataset = config['data'].slice();
    }

    return instance;
}

/**
 * Calculates the portalId from passed ids
 * @param {string|number} id Record id
 * @param {string|number} columnId Column id
 * @returns {string} portalId as `portal-${id}-${columnId}`
 */
function getPortalId(id: string | number, columnId: string | number): string {
    return `portal-${id}-${columnId}`;
}

/**
 * Delete portal and its container
 * @param {*} component React Component, the wrapper itself
 * @param {string} portalId As returned from getPortalId function
 */
function deletePortal(component: any, portalId: string): void {
    const portal = component.state.portals.get(portalId);
    if (portal) {
        const portalContainer = portal.containerInfo;

        // remove portal from Map
        component.state.portals.delete(portalId);

        // cleanup portal container
        portalContainer.parentElement?.removeChild(portalContainer);
    }
}

/**
 * Release (now only delete) React portal hosted in this cell
 * @param {*} component React Component, the wrapper itself
 * @param {HTMLElement} cellElement The grid cell to be freed of the React portal
 */
function releaseReactCell(component: any, cellElement: any): void {
    const { id, columnId, hasPortal } = cellElement._domData;

    if (hasPortal) {
        const portalId = getPortalId(id, columnId);
        deletePortal(component, portalId);
    }
}

/**
 * Calls releaseReactCell that implements the cleanup
 * @param {*} component React Component, the wrapper itself
 * @param {object} context Event context object
 * @param {Core.data.Model[]} context.records Array of records that are going to be removed
 */
function beforeRemoveRecords(component: any, { records, removingAll }: { records: any[]; removingAll: boolean }): void {
    const { instance } = component;

    if (removingAll) {
        [...component.state.portals.keys()].forEach(portalId => deletePortal(component, portalId));
    }
    else {
        records.forEach(record => {
            // grid.getRowById is not defined in Calendar
            const row = instance.getRowById ? instance.getRowById(record.id) : undefined;
            if (row) {
                row.cells.forEach((cell: any) => {
                    releaseReactCell(component, cell);
                });
            }
        });
    }
}

/**
 * Increments generation - necessary to trigger React updates
 */
function updateGeneration(component: any, thisTick = false, callback = () => {}): void {
    const updateState = () => {
        component.setState((currentState: { generation: number; portals: Map<string, ReactElement> }) => {
            return {
                ...currentState,
                generation : currentState.generation + 1
            };
        }, callback);
    };
    if (thisTick) {
        // Update state in this tick
        updateState();
    }
    else {
        // React updates on next frame
        requestAnimationFrame(updateState);
    }
}

/**
 * Component about to be updated, from changing a prop using state.
 * React to it depending on what changed and prevent react from re-rendering our component.
 * @param {*} component react component instance
 * @param {object} nextProps Next props
 * @param {object} nextState Next state
 * @returns {boolean}
 */
function shouldComponentUpdate(component: any, nextProps: Readonly<any>, nextState: Readonly<any>): boolean {
    const { props, instance, propertyNames } = component;

    propertyNames.forEach((prop: string) => {
        if (props[prop] !== nextProps[prop]) {
            // Check if property is not a config
            applyPropValue(instance, prop, nextProps[prop], false);
        }
    });

    // Reflect JSX cell changes
    return nextState?.generation !== component.state?.generation;
}

/**
 * Checks if the cell content is a React element
 * @param {object} context Renderer context object
 * @param {*} context.cellContent Content to be rendered in cell (set by renderer)
 * @returns {boolean} `true` if there is a React Renderer in this cell, `false` otherwise
 */
function hasFrameworkRenderer({ cellContent }: { cellContent: any }): boolean {
    // @ts-ignore
    return DomHelper.isReactElement(cellContent);
}

/**
 * Hook called by instance when rendering cells within
 * Row::renderCell(), creates portals for JSX supplied by renderers
 * @param {object} context Renderer context object
 * @param {object} context.rendererData Data passed from renderCell
 * @param {object} context.cellElementData Data passed from renderCell
 */
function processCellContent(this: { reactComponent: any; isExporting: boolean; $isCollapsing: boolean; }, { rendererData, cellElementData, rendererHtml }: {
    rendererData: any
    cellElementData: any
    rendererHtml: any
}): void {
    // Collect variables
    const
        component                                     = this.reactComponent,
        { state, portalsCache, portalContainerClass } = component,
        { cellElement, column, record }               = rendererData,
        portalId                                      = getPortalId(record.id, column.id),
        renderElement                                 = cellElement.querySelector(column.editTargetSelector) || cellElement;

    // Do nothing if we have no place to render to
    if (!renderElement) {
        return;
    }
    if (
        rendererHtml &&
        // @ts-ignore
        DomHelper.isReactElement(rendererHtml) &&
        !record.meta.specialRow
    ) {
        // Move React portal container out of the way if necessary
        if (
            renderElement.portalContainer &&
            renderElement.portalContainer.dataset.portalId === portalId
        ) {
            portalsCache.appendChild(renderElement.portalContainer);
            renderElement.portalContainer = null;
        }

        // Try to get portal from the portals Map
        let portal         = state.portals.get(portalId),
            forceFlushSync = false;

        // Handle measuring
        if (rendererData.isMeasuring) {
            if (portal) {
                // Remember the original parent of portal and the cell element width
                const
                    portalContainer     = portal.containerInfo,
                    parent              = portalContainer.parentNode;
                cellElement.style.width = 'auto'; // element is re-used, need to reset width
                const cellElementWidth  = cellElement.offsetWidth;

                // Append portal to the provided cell and get width
                cellElement.appendChild(portalContainer);
                const width = portalContainer.offsetWidth;

                // Move the portal back to its original container
                parent.appendChild(portalContainer);

                // Set width of the cell. It will be processed by Column code.
                cellElement.style.width = `${width + cellElementWidth}px`;
            }
            return;
        }

        // Check if record changed, delete portal and its container if yes
        if (portal && (portal.generation !== record.generation || this.isExporting || this.$isCollapsing)) {
            deletePortal(component, portalId);
            portal         = null;
            forceFlushSync = true;
        }

        // Cleanup renderElement - necessary for grouping feature
        const childPortalContainer = renderElement.querySelector(`.${portalContainerClass}`);
        if (childPortalContainer && childPortalContainer.dataset.portalId !== portalId) {
            portalsCache.appendChild(childPortalContainer);
        }
        if (renderElement.textContent && renderElement === cellElement) {
            renderElement.textContent = ''; // group title can be still here
        }

        if (portal) {
            // Move portal container back to the cell if we have one
            renderElement.appendChild(portal.containerInfo);
            renderElement.portalContainer = portal.containerInfo;
        }
        else {
            // Create new portal container
            const portalContainer         = DomHelper.append(renderElement, {
                tag       : 'div',
                className : portalContainerClass,
                dataset   : { portalId } // for reference in tests
            });
            renderElement.portalContainer = portalContainer;

            // Create a new portal in the portal container
            portal = ReactDOM.createPortal(rendererHtml, portalContainer, portalId);

            // Add the new portal to Map
            state.portals.set(portalId, portal);

            // Trigger React redraw
            // Update cell synchronously when exporting or when forced to
            if (forceFlushSync) {
                flushSync(() => updateGeneration(component, true));
                forceFlushSync = false;
            }
            else {
                updateGeneration(component, this.isExporting);
            }
        }

        // Save data for use elsewhere
        cellElementData.hasPortal = true;
        portal.generation         = record.generation;
    }
    else if (!rendererHtml && cellElementData.hasPortal) {
        cellElement.portalContainer.remove();
        cellElementData.hasPortal = false;
    }
}

/**
 * Hook called by engine when requesting a cell editor
 */
function processCellEditor({ editor, field }: { editor: any; field: string }): boolean | object | undefined {

    // @ts-ignore
    const component = this.reactComponent;

    // String etc. handled by feature, only care about fns returning React components here
    if (!component || typeof editor !== 'function') {
        return;
    }

    // Wrap React editor in an empty widget, to match expectations from CellEdit/Editor and make alignment
    // etc. work out of the box
    const wrapperWidget = new Widget({
        // For editor to be hooked up to field correctly,
        // @ts-ignore
        name             : field,
        // Prevent editor from swallowing mouse events
        allowMouseEvents : true,
        // Used by container, pass on to overridden setter
        assignValue(values: any, key: any, value: any) {
            // @ts-ignore
            this.setValue(value);
        }
    }) as any;

    // Ref for accessing the React editor later
    const widgetRef           = React.createRef();
    wrapperWidget['reactRef'] = widgetRef;



    // @ts-ignore
    const editorComponent = editor(widgetRef, this);

    // @ts-ignore
    if (!DomHelper.isReactElement(editorComponent)) {
        throw new Error('Expect a React element');
    }

    let editorValidityChecked = false;

    wrapperWidget.setValue = async(value: any) => {
        const widget: any = widgetRef.current;

        // It may happen that set is called before the widget is created
        if (widget) {
            if (!editorValidityChecked) {
                const
                    cellMethods = ['setValue', 'getValue', 'isValid', 'focus'],
                    misses      = cellMethods.filter(fn => !(fn in widget));

                if (misses.length > 0) {
                    throw new Error(
                        `Missing method(s) ${misses.join(', ')} in ${
                            widget.constructor.name
                        }. Cell editors must ${cellMethods.join(', ')}`
                    );
                }
                editorValidityChecked = true;
            }

            const context = wrapperWidget.owner['cellEditorContext'];
            await widget.setValue(value, context);
        }

        else {
            wrapperWidget.firstValue = value;
        }
    };

    // Add getter/setter for value on the wrapper, relaying to getValue()/setValue() on the React editor
    Object.defineProperty(wrapperWidget, 'value', {
        enumerable   : true,

        configurable : true,

        get() {
            const widget: any = widgetRef.current;
            return widget?.getValue();
        }
    });

    // Add getter for isValid to the wrapper, mapping to isValid() on the React editor
    Object.defineProperty(wrapperWidget, 'isValid', {
        enumerable   : true,

        configurable : true,

        get() {
            const widget: any = widgetRef.current;
            return widget?.isValid();
        }
    });

    // Override widgets focus handling, relaying it to focus() on the React editor
    wrapperWidget.focus = () => {
        const widget: any = widgetRef.current;
        if (!widget) {
            wrapperWidget.focusPending = true;
        }
        else {
            widget.focus?.();
        }
    };

    // Create a portal, making the React editor belong to the React tree although displayed in a Widget
    const portal = ReactDOM.createPortal(editorComponent, wrapperWidget.element);

    wrapperWidget['reactPortal'] = portal;

    const { state } = component;
    // Store portal in state to let React keep track of it (inserted into the Bryntum component)
    state.portals.set(`portal-${field}`, portal);
    updateGeneration(component, true,

        () => {
            if (wrapperWidget.firstValue !== undefined) {
                wrapperWidget.setValue(wrapperWidget.firstValue);
                delete wrapperWidget.firstValue;
            }
            if (wrapperWidget.focusPending) {
                wrapperWidget.focus();
                delete wrapperWidget.focusPending;
            }
        }
    );

    return { editor : wrapperWidget };
}

// Creates portal in the widget contentElement and triggers its rendering.
// Called from Widget.updateHtml
function processWidgetContent({ reactElement, widget, reactComponent, contentElement }:
{ reactElement: any; widget: any; reactComponent: any; contentElement: any }): React.ReactPortal | undefined {
    const
        portals  = reactComponent?.state?.portals,
        portalId = widget?.id;

    if (isReactElement(reactElement)) {
        // Ensure the contentElement is cleared of any previously rendered plain HTML before rendering a React portal.
        // This prevents mixing old HTML content with new React-rendered content, ensuring only the JSX is displayed.
        if (!portals.has(portalId) && widget.html) {
            widget.contentElement.innerHTML = '';
        }
        const portal = ReactDOM.createPortal(reactElement, contentElement || widget.contentElement);

        portals.set(portalId, portal);

        // In Tooltip.js, we hide the tooltip if there’s no HTML content. However, when using JSX for eventResize
        // and eventDrag, the portal content isn’t in the DOM yet when that “empty” check runs, causing the tooltip
        // to be hidden prematurely. To prevent this, we now update the tooltip content synchronously.
        // Note: flushSync is only called once when the tooltip instance is first created.
        // Fixes https://github.com/bryntum/support/issues/10462
        if (widget.isTooltip && !widget.html) {
            flushSync(() => updateGeneration(reactComponent, true));
        }
        else {
            updateGeneration(reactComponent, true);
        }

        return portal;
    }
    else if (portals?.has(portalId)) {
        // If we replace the content with plain HTML (not via React), React is unaware and its virtual DOM may become out of sync
        // with the real DOM. Later, when rendering a new portal into the same node, React may fail to properly re-attach or re-render,
        // especially if the previous portal wasn't unmounted or the DOM node was mutated outside React's control.
        // Therefore, before setting plain HTML, we delete the portal and update the DOM synchronously.
        // See: https://github.com/bryntum/support/issues/9822
        portals.delete(portalId);
        flushSync(() => updateGeneration(reactComponent, true));
    }
}

function processTaskItemContent({
    jsx,
    targetElement,
    reactComponent,
    domConfig
}: {
    jsx: ReactElement
    targetElement: HTMLElement
    reactComponent: React.Component
    domConfig: { [key: string]: any }
}): void {
    if (!reactComponent || !jsx) {
        return;
    }
    const
        { state }   = reactComponent,
        // @ts-expect-error
        { portals } = state,
        cardElement = targetElement.closest('.b-task-board-card') as any,
        portalId    = `task-item-${domConfig.reference}-${cardElement?.elementData.taskId}`,
        portal      = ReactDOM.createPortal(jsx, targetElement, portalId);

    portals.set(portalId, portal);

    updateGeneration(reactComponent);
}

/**
 * This method is called from processEventContent callback to
 * handle JSX of Calendar events
 */
function processCalendarEventContent(this: any, {
    jsx, // React element to render in portal
    action, // Rendering action
    domConfig, // domConfig passed by DomSync callback
    targetElement, // DOM element to create portal in
    reactComponent // the React wrapper component
}: {
    jsx: ReactElement
    action: string
    domConfig: any
    targetElement: HTMLElement
    reactComponent: React.Component & { syncContent: (fn: () => unknown) => void }

}): boolean {
    const
        me           = this,
        returnValue  = false,
        { state }    = reactComponent,

        // @ts-expect-error
        { portals }  = state,

        wrap         = targetElement.closest('.b-cal-event-wrap') as HTMLElement,
        dataHolder   = targetElement.closest('[data-date]') as HTMLElement,
        refHolder    = targetElement.closest('[data-ref]') as HTMLElement,
        mode         = typeof this.mode === 'string' ? this.mode : this.mode?.type?.slice(0, 4),
        lastPortalId = wrap?.dataset.lastPortalId,
        portalKey    = domConfig.dataset?.date || (dataHolder)?.dataset.date,
        containerRef = refHolder?.dataset?.ref;

    reactComponent.syncContent = reactComponent.syncContent || function(fn: () => unknown) {
        flushSync(fn);
    };

    let portalId = `portal-${mode}-${wrap?.dataset.eventId}`;

    me.portalKey    = portalKey === undefined ? me.portalKey : portalKey;
    me.containerRef = containerRef === undefined ? me.containerRef : containerRef;

    if (action === 'none' || action === 'reuseElement') {
        return returnValue;
    }

    if (action === 'removeElement' && lastPortalId) {
        portals.delete(lastPortalId);
        updateGeneration(reactComponent);
    }

    if (jsx && wrap) {
        portalId = `${portalId}-${me.portalKey}-${me.containerRef}`;

        const parent      = wrap.querySelector('.b-cal-event-desc') as HTMLElement;
        parent!.innerHTML = '';

        const
            jsxContainer = DomHelper.createElement({
                className     : 'b-jsx-container',
                parent,
                retainElement : true
            }) as HTMLElement,
            portal       = ReactDOM.createPortal(jsx, jsxContainer);

        portals.set(portalId, portal);

        reactComponent.syncContent(() => {
            updateGeneration(reactComponent, true);
        });

        wrap.dataset.lastPortalId = portalId;
    }
    return returnValue;
}

function processTaskContent(this: any, {
    jsx, // React element to render in portal
    action, // Rendering action
    targetElement, // DOM element to create portal in
    reactComponent // the React wrapper component
}: {
    jsx: ReactElement
    action: string
    targetElement: HTMLElementWithData
    reactComponent: React.Component & { syncContent: (fn: () => unknown) => void }
}): boolean {

    const { taskResize } = this.features;

    if (
        !reactComponent ||
        action !== 'syncFwConfig' ||
        (taskResize?.isResizing && !taskResize.dragging.completed)
    ) {
        return false;
    }

    // Ensure we have the expected DOM structure and type safety
    const wrap : HTMLElementWithData | null | undefined = targetElement.parentElement?.parentElement;

    if (!wrap?.elementData) {
        return false;
    }

    const
        wrapData       = wrap.elementData,
        { taskRecord } = wrapData,
        state          = reactComponent.state as ReactComponentState,
        { portals }    = state,
        portalId       = `portal-task-${taskRecord.id}`;

    if (taskRecord.isMilestone) {
        deletePortal(reactComponent, portalId);
        targetElement.innerHTML = '';
        wrap.lastPortalId = null;
        return false;
    }

    // Make this function available for testing. It is used for synchronizing task content, specifically
    // for React portal rendering. It should only be called during event D&D drop operation.
    reactComponent.syncContent = reactComponent.syncContent || function(fn: () => unknown) {
        flushSync(fn);
    };

    const parent = wrap.querySelector('.b-gantt-task-content') as HTMLElement;

    if (jsx) {

        const
            portal        = portals.get(portalId),
            updateContent = () => {
                // Clean-up the content element
                parent!.innerHTML = '';
                const
                    jsxContainer = DomHelper.createElement({
                        className     : 'b-jsx-container',
                        // As stated above, we are at the wrapper, but we should render the JSX inside the content element
                        parent,
                        // Signal DomSync to not remove React-controlled content
                        retainElement : true
                    }) as Element,
                    portal       = ReactDOM.createPortal(jsx, jsxContainer) as ReactPortalWithTaskGeneration;

                // Store taskGeneration on the portal to easily determine later if it needs to be updated
                portal.taskGeneration = wrap.elementData.taskGeneration;

                // Save portalId for later use
                wrap.lastPortalId = portalId;

                // Store portal in map in state, so that React can keep track of it
                portals.set(portalId, portal);
                updateGeneration(reactComponent, true);

                targetElement.didSetTextContent = true;
            };

        // Recreate portal only if the underlying taskRecord has changed or is different from last used.
        // Also re-create if the portal's container element is no longer connected to the DOM.
        // Fixes: https://github.com/bryntum/support/issues/10649
        if (!portal || !portal.containerInfo?.isConnected || portal.taskGeneration !== wrap.elementData.taskGeneration || wrap.lastPortalId !== portalId) {
            // Delete the old portal if one exists
            deletePortal(reactComponent, portalId);
            updateContent();
        }
    }

    return true;
}

/**
 * Generate a unique portal ID for an event.
 * @param {object} assignmentRecord The assignment record
 * @param {object} [eventRecord] The event record
 * @param {string} [segment] Segment identifier for split events
 * @param {boolean} [isExporting] To check if exporting is in progress
 * @returns {string} The generated portal ID
 */
function generateEventPortalId(assignmentRecord: any, eventRecord?: any, segment?: string, isExporting?: boolean): string {
    const isRecurring = eventRecord?.isRecurring || eventRecord?.isOccurrence;
    return `assignment-${assignmentRecord?.id}${isRecurring ? '-' + (eventRecord.recurrence?.id || '') : ''}${segment ? '-' + segment : ''}${isExporting ? '-export' : ''}`;
}

/**
 * Delete portals for all nested event children for a given parent event. When a parent event is released,
 * DomSync only fires callback for it and not for children. The nested children are removed as part of
 * removing the parent, so their callbacks don't fire individually. We must explicitly clean up their portals here.
 * @param {*} component React Component, the wrapper itself
 * @param {object} parentEventRecord The parent event record
 * @param {object} resourceRecord The resource record (needed for assignment lookup)
 * @param {boolean} isExporting Whether we're in export mode
 */
function deleteNestedEventPortals(component: any, parentEventRecord: any, resourceRecord: any, isExporting: boolean): void {
    const children = parentEventRecord?.children;

    if (!children?.length) {
        return;
    }

    const { portals } = component.state;

    for (const childEvent of children) {
        // Find the assignment for this child event and resource
        const assignmentRecord = childEvent.assignments?.find((a: any) => a.resourceId === resourceRecord?.id);

        if (assignmentRecord) {
            const portalId = generateEventPortalId(assignmentRecord, null, '', isExporting);
            if (portals.has(portalId)) {
                deletePortal(component, portalId);
            }
        }

        // Recursively handle nested children because nesting depth can be more than 1
        if (childEvent.isParent && childEvent.children?.length) {
            deleteNestedEventPortals(component, childEvent, resourceRecord, isExporting);
        }
    }
}

function processEventContent(this: any, {
    jsx, // React element to render in portal
    action, // Rendering action
    targetElement, // DOM element to create portal in
    isRelease, // true if releasing element
    reactComponent, // the React wrapper component
    scrolling,
    domConfig
}: {
    jsx: ReactElement
    action: string
    targetElement: HTMLElement
    isRelease: boolean
    reactComponent: React.Component & { syncContent: (fn: () => unknown) => void }
    scrolling: boolean
    domConfig: any
}): boolean {

    if (this.type === 'calendar' && this.mode !== 'timeline' && this.mode?.type !== 'scheduler') {

        return processCalendarEventContent.call(this, arguments[0]);
    }

    const { eventResize, eventDrag, eventEdit, nestedEvents } = this.features;



    // @ts-ignore
    if (!reactComponent || action === 'none' || (eventResize?.isResizing && !eventResize.dragging.completed && !scrolling)) {
        return false;
    }

    // Vertical nests renderData, while horizontal does not
    const domConfigData = this.isVertical ? domConfig?.elementData?.renderData : domConfig?.elementData;

    let wrap: any   = targetElement,
        parent: any = null,
        // Non-empty string only for split event segments
        segment     = '',
        // True signals the caller to finish further processing of this event
        returnValue = false;

    // When passed jsx, we are event content
    if (jsx) {
        // Milestone has a dedicated label element used for padding
        // We are looking here for `.b-sch-event-wrap`. This method is faster than `.closest(...)`
        if (domConfig?.dataset?.isMilestone) {
            wrap   = targetElement.parentElement!.parentElement!.parentElement!;
            parent = targetElement.parentElement!;
        }
        else {
            wrap   = targetElement.parentElement!.parentElement!;
            parent = targetElement;
        }

        // If we are processing a split event (an event with segments) we don't have the proper wrap so find it
        if (!wrap.elementData) {
            wrap = wrap.closest('.b-sch-event-wrap');

            // Set the segment id for portalId calculation
            segment = parent.parentElement.dataset?.segment || '';
        }
    }

    // When not passed jsx, we only care about continuing if we are the wrap, and not a ResourceTimeRange
    else if (!domConfigData?.isWrap || domConfigData.eventRecord.isResourceTimeRange) {
        return returnValue;
    }

    const
        // Vertical nests renderData, while horizontal does not
        wrapData    = this.isVertical ? wrap.elementData.renderData : wrap.elementData,
        // Use domConfigData when available to avoid stale data from reused elements. When elements are reused across
        // recurring/non-recurring events, wrap.elementData may contain data from a different event type, causing
        // incorrect isRecurring detection and wrong portalId calculation. This caused non-recurring events to
        // render without JSX when scrolling back (when both recurring and non-recurring events are present).
        // Fixes: https://github.com/bryntum/support/issues/10595
        currentData = domConfigData ?? wrapData,
        {
            assignmentRecord,
            eventRecord,
            resourceRecord
        }           = currentData,
        // Store portals in state to let React keep track of them
        { state }   = reactComponent,
        // @ts-ignore
        { portals } = state,
        // Recurring events are handled a bit differently so get the flag
        isRecurring = eventRecord.isRecurring || eventRecord.isOccurrence,
        isExporting = this.isExporting,
        // Portals are used for cells etc too, use a unique id for the map
        portalId    = generateEventPortalId(assignmentRecord, eventRecord, segment, isExporting);

    // When a parent event is reused, its nested children DOM elements were removed (due to releaseThreshold: 0),
    // but DomSync won't re-sync them because lastDomConfig appears unchanged. Clear it to force re-sync.
    if (nestedEvents?.enabled && action === 'reuseOwnElement' && eventRecord.isParent) {
        const eventElement = targetElement.firstElementChild;
        if (eventElement) {
            // @ts-ignore - lastDomConfig is a DomSync internal property
            eventElement.lastDomConfig = null;
        }
    }

    // Make this function available for testing. It should only be called on event drop.
    reactComponent.syncContent = reactComponent.syncContent || function(fn: () => unknown) {
        flushSync(fn);
    };

    // Don't delete portals of recurring events
    if (isRelease && !isRecurring) {
        let generationUpdateFlag = false;

        if (portals.has(portalId)) {
            deletePortal(reactComponent, portalId);
            generationUpdateFlag = true;
        }

        // If nestedEvents feature is enabled and this is an event with nested children, need
        // to clean up their portals. Because DomSync only fires callback for the parent when it's released,
        // nested children are removed as part of removing the parent, so their callbacks don't fire.
        if (nestedEvents?.enabled && eventRecord.children?.length) {
            deleteNestedEventPortals(reactComponent, eventRecord, resourceRecord, isExporting);
            generationUpdateFlag = true;
        }

        if (generationUpdateFlag) {
            updateGeneration(reactComponent, true);
        }
    }
    else {
        // We also need to handle reusing own element containing a React element.
        // The portal for it has been released and needs to be restored
        jsx = jsx || (action === 'reuseOwnElement' && wrap.lastJSX);

        if (jsx) {
            parent = parent || wrap.querySelector('.b-sch-event-content');

            const
                portal        = portals.get(portalId),
                updateContent = () => {
                    // Clean-up the content element
                    parent.innerHTML = '';
                    const
                        jsxContainer = DomHelper.createElement({
                            className     : 'b-jsx-container b-event-text-wrap',
                            // As stated above, we are at the wrapper, but we should render the JSX inside the content element
                            parent,

                            retainElement : true
                        }) as Element,
                        portal       = ReactDOM.createPortal(jsx, jsxContainer);

                    // Store eventGeneration on the portal to easily determine later if it needs to be updated
                    // @ts-expect-error
                    portal.eventGeneration = wrap.elementData.eventGeneration;

                    // Store the React element so that we can reuse it when reusing wrap element
                    wrap.lastJSX = jsx;
                    // Store portal in map in state, so that React can keep track of it
                    portals.set(portalId, portal);

                    // When exporting/printing, use "flushSync" to force React to render the portal content synchronously. During
                    // export, the scheduler creates temporary DOM elements attached to document.body, renders events into them
                    // via DomSync, and then captures the HTML via outerHTML. Without "flushSync", React's default async rendering
                    // means the portal content wouldn't be in the DOM when outerHTML is captured, resulting in empty event content
                    // in the printed output. "flushSync" forces React to process the state update and render the portal content
                    // immediately, ensuring the JSX is converted to DOM elements before the HTML capture occurs.
                    // Fixes https://github.com/bryntum/support/issues/12135
                    if (isExporting) {
                        flushSync(() => updateGeneration(reactComponent, true));
                    }
                    else {
                        updateGeneration(reactComponent, true);
                    }
                },

                isEditing     = eventEdit?.isEditing,
                isDragging    = eventDrag?.isDragging;

            // Recurring events need re-creating always:
            //  - https://github.com/bryntum/support/issues/10595
            // Re-create portal only if the underlying eventRecord changed its generation or if exporting.
            // Also re-create if the portal's container element is no longer connected to the DOM, which can happen
            // when an event is removed from the store while visible (without triggering the isRelease path), leaving
            // a stale portal in the Map whose container was removed by Bryntum's cleanup.
            // Fixes: https://github.com/bryntum/support/issues/10649
            if (!portal || !portal.containerInfo?.isConnected || isRecurring || isExporting || portal.eventGeneration !== wrap.elementData.eventGeneration || this.$isExpanding) {
                if ((scrolling || !isDragging) && !isEditing) {
                    updateContent();
                }
                else {

                    reactComponent.syncContent(updateContent);
                }
            }

            returnValue = true;
        }
    }
    return returnValue;
}

/**
 * Called from DomSync callback to handle JSX
 * returned from ResourceHeader headerRenderer
 */
function processResourceHeader(
    { jsx, targetElement }:
    { jsx: ReactElement; targetElement: HTMLElement }): void {

    if (!jsx) {
        return;
    }

    const
        // @ts-ignore
        { reactComponent } = this,
        { state }          = reactComponent,
        { portals }        = state,
        portalId           = `resource-header-${targetElement.dataset.resourceId}`;

    // Delete portal if we already have one
    if (portals.has(portalId)) {
        portals.delete(portalId);

        // Update the generation (force React re-rendering) in this tick
        updateGeneration(reactComponent, true);
    }

    portals.set(portalId, ReactDOM.createPortal(jsx, targetElement));

    // Trigger the React portals re-rendering in the next animation frame
    updateGeneration(reactComponent);

}

/**
 * Handles the content provided by a React component for the widget.
 * @param {Widget} widget Owner widget
 * @param {*} element React element
 */
function handleReactElement(widget: Widget, element: any): void {
    const
        parent         = widget.closest((c: any) => Boolean(c.reactComponent)),
        // Attempt to find a React component

        reactComponent = (parent as any)?.reactComponent ||
            (Widget.query((c: any) => Boolean(c.reactComponent?.state)) as any)?.reactComponent;

    reactComponent?.processWidgetContent({
        reactElement : element,
        widget,
        reactComponent
    });
}

/**
 * Handles the React header element by processing JSX content within the widget.
 *
 * @param {object} column Object containing grid and id properties
 * @param {HTMLElement} headerElement The header element to be processed
 * @param {any} html JSX content to be processed
 */
function handleReactHeaderElement(column: { grid: any; id: string }, headerElement: HTMLElement, html: any): void {
    const
        { reactComponent } = column.grid,
        contentElement     = headerElement.querySelector('.b-grid-header-text-content');

    // Process JSX as if it was in the widget.
    reactComponent?.processWidgetContent({
        reactElement : html,
        widget       : { id : column.id },
        reactComponent,
        contentElement
    });
}

export { createWidget, shouldComponentUpdate, processWidgetContent };

// Expose wrapper methods on window.bryntum
window.bryntum       = window.bryntum || {};
window.bryntum.react = {
    isReactElement,
    handleReactHeaderElement,
    handleReactElement
};
