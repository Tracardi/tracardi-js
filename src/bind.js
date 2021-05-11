import {addListener} from "@analytics/listener-utils";

const bind = (query, elementEvent, trackerEvent, payload) => {
    const element = document.querySelector(query)
    addListener(element, elementEvent, () => {
        const { track } = this.instance
        track(trackerEvent, payload);
    })
};

export default bind;
