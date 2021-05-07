import Event from './event';

export default function EventsList(container) {

    let store = null
    const eventObject = Event();
    if(container !== null) {
        container.events || (container.events = null);
    }

    return {

        add: (payload) => {
            if(container !== null) {
                if(container.events === null) {
                    container = eventObject.static(payload);
                    container.events = []
                }
                container.events.push(eventObject.dynamic(payload));
            } else {
                store = eventObject.static(payload);
                store.events = [eventObject.dynamic(payload)];
            }

        },
        get: () => {
            return (container !== null)
                ? container
                : store;
        },

        reset: () => {
            if(container !== null) {
                container = {};
            } else {
                store =null;
            }
        }
    }
}