import axios from 'axios';
import { getCookie, setCookie, hasCookieSupport } from '@analytics/cookie-utils';
import { v4 as uuid4 } from 'uuid';
import Event from './domain/event';
import ClientInfo from './domain/clientInfo';
import EventsList from './domain/eventsList';


export default function tracardiPlugin(options) {

    let page = null;
    const tracks = {};
    const trackEventList = EventsList(tracks);
    const cookieName = 'tracardi-session-id';
    let singleApiCall = {}

    return {
        /* All plugins require a name */
        name: 'tracardi-plugin',
        /* Everything else below this is optional depending on your plugin requirements */
        config: {
            url: options.url,
            tracker: options.tracker
        },
        initialize: ({ config }) => {

            console.debug("Plugin init", config)

            singleApiCall = {
                page: false,
                tracks: false
            }

            window.config = config

            if(!hasCookieSupport()) {
                console.error("[Tracker] Cookies disabled.");
                return;
            }

            let sessionId = getCookie(cookieName);
            if(!sessionId) {
                sessionId = uuid4();
                const expires = 60*60*31*30;
                setCookie(cookieName, sessionId, expires);
            }

            const event = Event();
            const clientInfo = ClientInfo();
            let payload = {
                type: "sessionCreated",
                scope: config.scope,
                sessionId: sessionId,
                profileId: null,
                properties: {
                    time: clientInfo.time(),
                    browser: clientInfo.browser(),
                    storage: clientInfo.storage(),
                    screen: clientInfo.screen(),
                }
            }

            if(typeof window.config !== "undefined"  &&
                typeof window.config.tracker !== "undefined" &&
                typeof window.config.tracker.init !== "undefined") {
                    Object.assign(payload, {payload: window.config.tracker.init})
            }

            if(typeof window.config !== "undefined"  &&
                typeof window.config.tracker !== "undefined" &&
                typeof window.config.tracker.url !== "undefined") {
                    axios.post(
                        window.config.tracker.url + '/init',
                        event.build(payload)
                    ).then(
                        (response) => {
                            console.log(response)
                        }
                    ).catch((e) => {
                        console.log(e)
                    });
            } else {
                console.error("[Tracker] Event initialize:sessionCreated not sent. Undefined options.tracker.url");
            }


        },
        page: ({ payload }) => {
            console.log("Event page",payload);
            const event = Event();
            const clientInfo = ClientInfo();
            const pageInfo = clientInfo.page();
            pageInfo.search = payload.properties.search;
            delete payload.properties.width;
            delete payload.properties.height;
            delete payload.properties.url;
            delete payload.properties.search;
            delete payload.properties.hash;
            delete payload.properties.path;
            delete payload.properties.title;

            const eventPayload = {
                type: "view",
                scope: config.scope,
                sessionId: getCookie(cookieName),
                profileId: null,
                userId: payload.userId,
                properties: {
                    page: pageInfo,
                    screen: clientInfo.screen(),
                },
                payload: payload.properties
            }
            page = event.build(eventPayload);
        },

        track: ({ payload }) => {
            console.log("Event track", payload);
            // call provider specific event tracking
            const event = Event();
            const clientInfo = ClientInfo();
            const pageInfo = clientInfo.page();
            // pageInfo.search = payload.properties.search;
            // delete payload.properties.width;
            // delete payload.properties.height;
            // delete payload.properties.url;
            // delete payload.properties.search;
            // delete payload.properties.hash;
            // delete payload.properties.path;
            // delete payload.properties.title;

            const eventPayload = {
                type: payload.event,
                scope: config.scope,
                sessionId: getCookie(cookieName),
                profileId: null,
                userId: payload.userId,
                properties: {
                    page: pageInfo,
                },
                payload: payload.properties
            }
            trackEventList.add(event.build(eventPayload));
        },
        identify: ({ payload }) => {
            console.debug("Event identify",payload)
            // call provider specific user identify method
        },
        loaded: () => {
            console.debug("Plugin loaded")
            // return boolean so analytics knows when it can send data to third party
            return !!window.tracardi
        },
        trackEnd: () => {
            if(!singleApiCall.tracks) {
                singleApiCall.tracks = true;
                console.log('trackEnd');
                console.log(trackEventList.get());
                const payload = {
                    "events": trackEventList.get()
                }

                if(typeof window.config !== "undefined"  &&
                    typeof window.config.tracker !== "undefined" &&
                    typeof window.config.tracker.url !== "undefined") {
                    axios.post(
                        window.config.tracker.url + '/track',
                        payload
                    ).then(
                        (response) => {
                            console.log(response)
                        }
                    ).catch((e) => {
                        console.log(e)
                    })
                } else {
                    console.error("[Tracker] Event tracks:* not sent. Undefined options.tracker.url");
                }
            }
        },
        pageEnd: () => {
            if(!singleApiCall.page) {
                singleApiCall.page = true;
                console.log('pageEnd', page);
                console.log("config", window.config)

                if(typeof window.config !== "undefined"  &&
                    typeof window.config.tracker !== "undefined" &&
                    typeof window.config.tracker.url !== "undefined") {
                    axios.post(
                        window.config.tracker.url + '/page',
                        page
                    ).then(
                        (response) => {
                            console.log(response)
                        }
                    ).catch((e) => {
                        console.log(e)
                    })
                } else {
                    console.error("[Tracker] Event page:view not sent. Undefined options.tracker.url");
                }
            }
        }
    }
}
