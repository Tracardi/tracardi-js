import Event from './event';

export default function EventsList(container, profile) {

    const eventObject = Event();

    if(container !== null) {
        container.events || (container.events = null);
    }

    return {

        add: (payload, eventContext) => {
            if(container !== null) {
                // Multiple
                if(container.events === null) {
                    container = eventObject.static(payload);
                    container.options = profile.context
                    container.events = []
                }
                container.events.push(eventObject.dynamic(payload, eventContext));
            } else {
                console.error("[Trackardi] Missing container in EventsList.")
            }

        },
        get: (config) => {
            // Add performance to each event if configured

            if (config?.tracker?.context?.performance === true && typeof window?.performance?.getEntriesByType === 'function') {
                const performance = window.performance.getEntriesByType("navigation")
                if (Array.isArray( performance) && performance.length > 0) {
                    container.events = container.events.map(event => {
                        event.context = {
                            ...event.context,
                            performance: performance[0]
                        }
                        return event
                    })
                }
            }

            return container;
        },

        reset: () => {
            container = {events: null};
        }
    }
}