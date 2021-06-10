import Event from './event';

export default function EventsList(container, profile) {

    const eventObject = Event();
    if(container !== null) {
        container.events || (container.events = null);
    }

    return {

        add: (payload) => {
            if(container !== null) {
                // Multiple
                if(container.events === null) {
                    container = eventObject.static(payload);
                    container.options = profile.context
                    container.events = []
                }
                container.events.push(eventObject.dynamic(payload));
            } else {
                console.error("[Trackardi] Missing container in EventsList.")
            }

        },
        get: () => {
            return container;
        },

        reset: () => {
            container = {events: null};
        }
    }
}