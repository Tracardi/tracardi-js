import {getCookie, setCookie, hasCookieSupport} from '@analytics/cookie-utils';
import {v4 as uuid4} from 'uuid';
import Event from './domain/event';
import ClientInfo from './domain/clientInfo';
import EventsList from './domain/eventsList';
import {getItem, setItem} from "@analytics/storage-utils";
import {request} from "./apiCall";
import {addListener} from "@analytics/listener-utils";
// import loadJS from "./utils/loadJs";

export default function tracardiPlugin(options) {

    const clientInfo = ClientInfo();
    const event = Event();

    let isCookieSet = true
    const trackEventList = EventsList({}, window.response);
    const immediateTrackEventList = EventsList({}, window.response);
    const cookieName = 'tracardi-session-id';
    const profileName = 'tracardi-profile-id';
    const consentKey = 'tracardi-consent-id';
    let profileId = getItem(profileName)
    let sessionId = getCookie(cookieName);
    if (!sessionId) {
        sessionId = uuid4();
        const expires = 0;
        setCookie(cookieName, sessionId, expires);
        isCookieSet = false
    }
    let singleApiCall = {}

    const getEventPayload = (payload) => {
        let eventPayload = {
            type: payload.event,
            source: config.tracker.source,
            session: {id: sessionId},
            profile: (profileId != null)
                ? {id: profileId}
                : null,
            context: {
                time: clientInfo.time(),
                page: clientInfo.page(),
                browser: clientInfo.browser(),
                storage: clientInfo.storage(),
                screen: clientInfo.screen(),
            },
            properties: payload.properties,
        }

        if(payload.userId) {
            eventPayload['user'] = {id: payload.userId}
        }

        if(payload.options) {
            eventPayload['options'] = payload.options
        }

        return eventPayload;
    }

    const handleError = (e) => {
        if (e.response) {
            if (typeof e.response.data === 'object') {
                console.error("[Tracker] " + e.response.data.detail);
            } else {
                console.error("[Tracker] " + e.message);
            }
        } else {
            console.error("[Tracker] " + e.message);
        }
    }

    const push = async (config) => {

        try {

            const response = await request(
                {
                    method: "POST",
                    url: config.tracker.url.api + '/track',
                    data: trackEventList.get()
                }
            );

            // If browser profile is the same as context profile then consent displayed
            // Consent is displayed when there is new profile created.

            if(typeof response.data.profile.id === "undefined") {
                console.error("[Tracardi] /track must return profile id. No profile id returned.")
            }

            const isConsentGiven = getItem(consentKey) === response.data.profile.id;

            // Set profile id
            profileId = response.data.profile.id
            setItem(profileName, profileId);

            documentReady(() => {

                if (typeof config.listeners === "undefined") {
                    return
                }

                // onContextReady event
                if (typeof config.listeners.onContextReady !== "undefined") {
                    const onContextReady = config.listeners.onContextReady

                    if (typeof onContextReady !== "function") {
                        throw new TypeError("onContextReady must be a function.");
                    }

                    // loadJS(
                    //     "src/test.js",
                    //     ()=>{typeof main === "function" && main(response.data)},
                    //     document.body,
                    //     'script'
                    // )

                    onContextReady({
                            context: response.data,
                            tracker: window.tracardi.default,
                            helpers: window.tracardi.default.plugins.tracardi
                        }
                    );

                }

                // onConsentRequired
                if (typeof response.data.source.consent !== "undefined" && response.data.source.consent !== null) {
                    if (response.data.source.consent === true && !isConsentGiven) {
                        if (typeof config.listeners.onConsentRequired !== "undefined") {
                            const onConsentRequired = config.listeners.onConsentRequired

                            if (typeof onConsentRequired !== "function") {
                                throw new TypeError("onConsentRequired must be a function.");
                            }

                            onConsentRequired({
                                context: response.data,
                                tracker: window.tracardi.default,
                            });

                        }
                    }
                }

            });

            trackEventList.reset();

        } catch(e) {
            handleError(e);
        }
    }

    return {
        name: 'tracardi',

        config: {
            tracker: options.tracker,
            listeners: options.listeners
        },
        methods: {
            track: async (eventType, payload) => {

                try {

                    payload = {
                        event: eventType,
                        properties: (payload) ? payload : {}
                    }

                    const eventPayload = getEventPayload(payload);

                    let trackerPayload = event.static(eventPayload);
                    trackerPayload.options = window.response.context;
                    trackerPayload.events = [event.dynamic(eventPayload)];

                    const response = await request(
                        {
                            method: "POST",
                            url: config.tracker.url.api + '/track',
                            data: trackerPayload
                        }
                    );

                    return response

                } catch (e) {
                    return null
                }
            },

            onClick: (object, func) => {
                return addListener(object, 'click', func);
            },
            addListener: (object, event, func) => {
                return addListener(object, event, func);
            },
            consentSubmitted() {
                setItem(consentKey, profileId);
            }
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
                tracks: false
            }

            if (!hasCookieSupport()) {
                console.error("[Tracker] Cookies disabled.");
                if (typeof config.listeners.onCookiesDisabled !== "undefined") {
                    const onCookiesDisabled = config.listeners.onCookiesDisabled

                    if (typeof onCookiesDisabled !== "function") {
                        throw new TypeError("onSessionSet must be a function.");
                    }

                    onCookiesDisabled({
                            tracker: window.tracardi.default,
                            helpers: window.tracardi.default.plugins.tracardi
                        }
                    );

                }
                return;
            }

            // onSessionSet event
            if (!isCookieSet && typeof config.listeners.onSessionSet !== "undefined") {
                const onSessionSet = config.listeners.onSessionSet

                if (typeof onSessionSet !== "function") {
                    throw new TypeError("onSessionSet must be a function.");
                }

                onSessionSet({
                        session: {id: sessionId},
                        tracker: window.tracardi.default,
                        helpers: window.tracardi.default.plugins.tracardi
                    }
                );

            }

            window.config = config

        },

        track: ({payload}) => {

            if (typeof config == 'undefined' || typeof config.tracker == 'undefined' || typeof config.tracker.source === 'undefined') {
                console.error("[Tracker] config.tracker.source undefined.");
                return;
            }

            console.debug("[Tracker] Event track", payload);

            const eventPayload = getEventPayload(payload)

            if (typeof payload.options.fire !== "undefined" && payload.options.fire) {
                try {
                    immediateTrackEventList.add(event.build(eventPayload))
                    const response = request(
                        {
                            method: "POST",
                            url: config.tracker.url.api + '/track',
                            data: immediateTrackEventList.get()
                        }
                    );
                    console.warn("[Tracardi] Tracking with option `fire: true` will not trigger listeners such as onContextReady, onConsentRequired, etc.")

                    immediateTrackEventList.reset();
                    return response
                } catch(e) {
                    handleError(e);
                }
            } else {
                trackEventList.add(event.build(eventPayload));
            }
        },

        trackEnd: ({config}) => {
            if (!singleApiCall.tracks) {
                singleApiCall.tracks = true;

                console.debug('[Tracker] TrackEnd');

                push(config);
            }
        },

        loaded: () => {
            // return boolean so analytics knows when it can send data to third party
            return !!window.tracardi
        },
    }
}
