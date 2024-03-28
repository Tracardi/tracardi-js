import Event from './event';
import {getCookie} from "../cookies";

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
                console.error("[Tracardi] Missing container in EventsList.")
            }

        },
        get: (config) => {
            // Add performance to each collected event if configured
            // This is a context on top tracker level

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

            let googleAnalyticsId = getCookie('_ga');
            if (googleAnalyticsId) {
                container.events = container.events.map(event => {
                    event.context = {
                        ...event.context,
                        ga: googleAnalyticsId
                    }
                    return event
                })
            }

            return container;
        },

        reset: () => {
            container = {events: null};
        }
    }
}