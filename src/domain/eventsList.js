import Event from './event';

export default function EventsList(container) {

    const eventObject = Event();
    container.events || (container.events = null);

    return {
        add: (payload) => {

            if(container.events === null) {
                container = eventObject.static(payload);
                console.log('xxx', payload);
                container.events = []
            }

            container.events.push(eventObject.dynamic(payload));
        },
        get: () => {
            return container;
        },

        reset: () => {
            container = {}
        }
    }
}