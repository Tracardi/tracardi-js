import axios from 'axios';
import { getCookie, setCookie, hasCookieSupport } from '@analytics/cookie-utils';
import { v4 as uuid4 } from 'uuid';
import Event from './domain/event';
import ClientInfo from './domain/clientInfo';
import EventsList from './domain/eventsList';
import {getItem, setItem} from "@analytics/storage-utils";
import {request} from "./api_call";


export default function tracardiPlugin(options) {

    const clientInfo = ClientInfo();
    const event = Event();
    const pageInfo = clientInfo.page();

    const tracks = {};
    const trackEventList = EventsList(tracks);
    const identifyEventList = EventsList(null);
    const initEventList = EventsList(null);
    const pageEventList = EventsList(null);
    const cookieName = 'tracardi-session-id';
    const profileName = 'tracardi-profile-id';
    const profileId = getItem(profileName)
    let sessionId = getCookie(cookieName);
    if(!sessionId) {
        sessionId = uuid4();
        const expires = 60*60*31*30;
        setCookie(cookieName, sessionId, expires);
    }
    let singleApiCall = {}

    return {
        name: 'tracardi-plugin',

        config: {
            tracker: options.tracker
        },
        initialize: ({ config }) => {

            console.debug("Plugin init", config)

            singleApiCall = {
                page: false,
                tracks: false
            }

            if(!hasCookieSupport()) {
                console.error("[Tracker] Cookies disabled.");
                return;
            }

            if(typeof config == 'undefined' || typeof config.tracker == 'undefined' || typeof config.tracker.source === 'undefined') {
                console.error("[Tracker] config.tracker.source undefined.");
                return;
            }

            window.config = config

            let payload = {
                type: "sessionCreated",
                source: config.tracker.source,
                metadata: {
                    time: clientInfo.time(),
                },
                session: {id: sessionId},
                profile: {id: profileId},
                context: {
                    browser: clientInfo.browser(),
                    storage: clientInfo.storage(),
                    screen: clientInfo.screen(),
                }
            }

            if(typeof window.config !== "undefined"  &&
                typeof window.config.tracker !== "undefined" &&
                typeof window.config.tracker.init !== "undefined") {
                    Object.assign(payload, {properties: window.config.tracker.init})
            }

            initEventList.add(event.build(payload))

            // console.log("payload", payload)
            // console.log("copy")
            // console.log(initEventList.get())

            if(typeof window.config !== "undefined"  &&
                typeof window.config.tracker !== "undefined" &&
                typeof window.config.tracker.url !== "undefined" &&
                typeof window.config.tracker.url.api !== "undefined") {
                    request(
                        {
                            method: "POST",
                            url: window.config.tracker.url.api + '/init',
                            data: initEventList.get()
                        }
                    );
                    // axios.post(
                    //     window.config.tracker.url + '/init',
                    //     initEventList.get()
                    // ).then(
                    //     (response) => {
                    //         console.log(response.data.profile)
                    //         setItem(profileName, response.data.profile.id)
                    //         // todo raise event onContextReady
                    //     }
                    // ).catch((e) => {
                    //     console.log(e)
                    // });
            } else {
                console.error("[Tracker] Event initialize:sessionCreated not sent. Undefined options.tracker.url");
            }


        },
        page: ({ payload }) => {
            console.log("Event page",payload);

            if(typeof config == 'undefined' || typeof config.tracker == 'undefined' || typeof config.tracker.source === 'undefined') {
                console.error("[Tracker] config.tracker.source undefined.");
                return;
            }

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
                source: config.tracker.source,
                metadata: {
                    time: clientInfo.time(),
                },
                session: {id: sessionId},
                profile: {id: profileId},
                context: {
                    page: pageInfo,
                    screen: clientInfo.screen(),
                },
                properties: payload.properties,
                user: {id: payload.userId}
            }
            pageEventList.add(event.build(eventPayload));
        },

        track: ({ payload }) => {
            console.log("Event track", payload);

            if(typeof config == 'undefined' ||
                typeof config.tracker == 'undefined' ||
                typeof config.tracker.source === 'undefined') {
                console.error("[Tracker] config.tracker.source undefined.");
                return;
            }

            const eventPayload = {
                type: payload.event,
                source: config.tracker.source,
                metadata: {
                    time: clientInfo.time(),
                },
                session: {id: sessionId},
                profile: {id: profileId},
                context: {
                    page: pageInfo,
                },
                properties: payload.properties,
                user: {id: payload.userId}
            }
            trackEventList.add(event.build(eventPayload));
        },
        identify: ({ payload }) => {
            console.log("Event identify",payload)

            if(typeof config == 'undefined' ||
                typeof config.tracker == 'undefined' ||
                typeof config.tracker.source === 'undefined') {
                console.error("[Tracker] config.tracker.source undefined.");
                return;
            }

            const eventPayload = {
                type: payload.event,
                source: config.tracker.source,
                metadata: {
                    time: clientInfo.time(),
                },
                session: {id: sessionId},
                profile: {id: profileId},
                context: {
                    page: pageInfo,
                },
                properties: payload.traits,
                user: {id: payload.userId}
            }
            identifyEventList.add(event.build(eventPayload));
        },
        loaded: () => {
            // return boolean so analytics knows when it can send data to third party
            return !!window.tracardi
        },
        trackEnd: () => {
            if(!singleApiCall.tracks) {
                singleApiCall.tracks = true;
                console.log('trackEnd');
                console.log(trackEventList.get());

                if(typeof window.config !== "undefined"  &&
                    typeof window.config.tracker !== "undefined" &&
                    typeof window.config.tracker.url !== "undefined" &&
                    typeof window.config.tracker.url.api !== "undefined"
                ) {

                    request(
                        {
                            method: "POST",
                            url: window.config.tracker.url.api + '/track',
                            data: trackEventList.get()
                        }
                    );

                    // axios.post(
                    //     window.config.tracker.url + '/track',
                    //     trackEventList.get()
                    // ).then(
                    //     (response) => {
                    //         console.log(response)
                    //     }
                    // ).catch((e) => {
                    //     console.log(e)
                    // })
                } else {
                    console.error("[Tracker] Event tracks:* not sent. Undefined options.tracker.url");
                }
            }
        },
        pageEnd: () => {
            if(!singleApiCall.page) {
                singleApiCall.page = true;
                console.log("config", window.config)

                if(typeof window.config !== "undefined"  &&
                    typeof window.config.tracker !== "undefined" &&
                    typeof window.config.tracker.url !== "undefined" &&
                    typeof window.config.tracker.url.api !== "undefined") {

                    request(
                        {
                            method: "POST",
                            url: window.config.tracker.url.api + '/page',
                            data: pageEventList.get()
                        }
                    )

                    // axios.post(
                    //     window.config.tracker.url + '/page',
                    //     pageEventList.get()
                    // ).then(
                    //     (response) => {
                    //         console.log(response)
                    //     }
                    // ).catch((e) => {
                    //     console.error("[Tracardi] " + e.toString())
                    // })
                } else {
                    console.error("[Tracker] Event page:view not sent. Undefined options.tracker.url");
                }
            }
        }
    }
}
