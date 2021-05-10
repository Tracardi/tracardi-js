import {getCookie, setCookie, hasCookieSupport} from '@analytics/cookie-utils';
import {v4 as uuid4} from 'uuid';
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
    let profileId = getItem(profileName)
    let sessionId = getCookie(cookieName);
    if (!sessionId) {
        sessionId = uuid4();
        const expires = 60 * 60 * 31 * 30;
        setCookie(cookieName, sessionId, expires);
    }
    let singleApiCall = {}

    return {
        name: 'tracardi',

        config: {
            tracker: options.tracker
        },
        methods: {
            consent(type, granted) {
                request(
                    {
                        method: "POST",
                        url: window.config.tracker.url.api + '/consent',
                        data: {
                            profile: {
                                id: profileId
                            },
                            consent: {
                                id: type,
                                granted: granted
                            }
                        }
                    }
                );
            },
        },
        initializeStart: ({abort, config}) => {

            if (typeof config === "undefined") {
                console.error(" because config is undefined.");
                return abort('Cancel the initialize call because of config is undefined.');
            }

            if (typeof config.tracker == 'undefined') {
                console.error("[Tracker] Tracker init stopped because config.tracker is undefined.");
                return abort('Cancel the initialize call because of config.tracker.source is undefined.');
            }

            if (typeof config.tracker.source === 'undefined') {
                console.error("[Tracker] Tracker init stopped because config.tracker.source is undefined.");
                return abort('Cancel the initialize call because of config.tracker.source is undefined.');
            }

            if (typeof config.tracker.url === "undefined") {
                console.error("[Tracker] Tracker init stopped because config.tracker.url is undefined.");
                return abort('Cancel the initialize call because of config.tracker.url is undefined.');
            }

            if (typeof config.tracker.url.api === "undefined") {
                console.error("[Tracker] Tracker init stopped because config.tracker.url.api is undefined.");
                return abort('Cancel the initialize call because of config.tracker.url.api s undefined.');
            }
        },
        initialize: ({config}) => {

            console.debug("[Tracker] Plugin init", config)

            singleApiCall = {
                page: false,
                tracks: false
            }

            if (!hasCookieSupport()) {
                console.error("[Tracker] Cookies disabled.");
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

            if (typeof window.config !== "undefined" &&
                typeof window.config.tracker !== "undefined" &&
                typeof window.config.tracker.init !== "undefined") {
                Object.assign(payload, {properties: window.config.tracker.init})
            }

            initEventList.add(event.build(payload))
        },
        page: ({payload}) => {
            console.debug("[Tracker] Event page", payload);

            if (typeof config == 'undefined' || typeof config.tracker == 'undefined' || typeof config.tracker.source === 'undefined') {
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

        track: ({payload}) => {
            console.debug("[Tracker] Event track", payload);

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
        identify: ({payload}) => {
            console.debug("[Tracker] Event identify", payload)

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
        initializeEnd: () => {
            request(
                {
                    method: "POST",
                    url: window.config.tracker.url.api + '/init',
                    data: initEventList.get(),
                    onSuccess: (response) => {

                        // Set profile id
                        profileId = response.data.profile.id
                        setItem(profileName, profileId);

                        if(typeof response.data.source.consent === "undefined" || response.data.source.consent===null) {
                            console.log("[Tracker] No consent defined.");
                            return;
                        }

                        if(typeof response.data.source.consent.required === "undefined") {
                            console.log("[Tracker] No consent requirement defined.");
                            return;
                        }

                        if(response.data.source.consent.required) {
                            console.log(response.data.source.consent);
                            if(typeof response.data.source.consent.box !== "undefined" &&
                                typeof response.data.source.consent.box.id !== "undefined") {
                                documentReady(() => {
                                    const consentBox = document.getElementById(response.data.source.consent.box.id);
                                    if(consentBox) {
                                        consentBox.style.display = "block";
                                    }
                                })
                            } else {
                                console.log("[Tracker] No consent.box.id defined.")
                            }

                        }
                    }
                }
            );
        },
        trackEnd: () => {
            if (!singleApiCall.tracks) {
                singleApiCall.tracks = true;
                console.debug('[Tracker] TrackEnd');
                console.debug(trackEventList.get());

                request(
                    {
                        method: "POST",
                        url: window.config.tracker.url.api + '/track',
                        data: trackEventList.get()
                    }
                );

            }
        },
        pageEnd: () => {
            if (!singleApiCall.page) {
                singleApiCall.page = true;
                console.debug("[Tracker] Config", window.config)

                request(
                    {
                        method: "POST",
                        url: window.config.tracker.url.api + '/page',
                        data: pageEventList.get()
                    }
                )
            }
        }
    }
}
