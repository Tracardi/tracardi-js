import {getCookie, setCookie, hasCookieSupport} from '@analytics/cookie-utils';
import {v4 as uuid4} from 'uuid';
import Event from './domain/event';
import ClientInfo from './domain/clientInfo';
import EventsList from './domain/eventsList';
import {getItem, setItem} from "@analytics/storage-utils";
import {request} from "./api_call";
import {addListener} from "@analytics/listener-utils";

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
    const consentKey = 'tracardi-consent-id';
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
            tracker: options.tracker,
            listeners: options.listeners
        },
        methods: {
            track: (event, payload) => {
                const {track} = window.tracardi.default
                track(event, payload, {fire: true})
            },
            identify: (event, payload) => {
                const {identify} = window.tracardi.default
                identify(event, payload, {fire: true})
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
                session: {id: sessionId},
                profile: (profileId != null)
                    ? {id: profileId}
                    : null,
                context: {
                    browser: clientInfo.browser(),
                    storage: clientInfo.storage(),
                    screen: clientInfo.screen(),
                }
            }

            if (typeof config !== "undefined" &&
                typeof config.tracker !== "undefined" &&
                typeof config.tracker.init !== "undefined") {
                Object.assign(payload, {properties: config.tracker.init})
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
                session: {id: sessionId},
                profile: (profileId != null)
                    ? {id: profileId}
                    : null,
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


            // console.log("x",x)
            // const {payload} = x
            console.debug("[Tracker] Event track", payload);

            const eventPayload = {
                type: payload.event,
                source: config.tracker.source,
                session: {id: sessionId},
                profile: (profileId != null)
                    ? {id: profileId}
                    : null,
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
                session: {id: sessionId},
                profile: (profileId != null)
                    ? {id: profileId}
                    : null,
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
        initializeEnd: ({config}) => {
            request(
                {
                    method: "POST",
                    url: config.tracker.url.api + '/context',
                    data: initEventList.get(),
                    onSuccess: (response) => {

                        // If browser profile is the same as context profile then consent displayed
                        // Consent is displayed when there is new profile created.
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

                                onContextReady({
                                        context: response.data,
                                        tracker: window.tracardi.default,
                                        helpers: window.tracardi.default.plugins.tracardi
                                    }
                                );

                            }

                            // onConsentRequired
                            if (typeof response.data.source.consents !== "undefined" && response.data.source.consents !== null) {
                                if (typeof response.data.source.consents.required !== "undefined") {
                                    if (response.data.source.consents.required === true && !isConsentGiven) {
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
                            }
                        });
                    }
                }
            );
            initEventList.reset();
        },
        trackEnd: ({config, payload}) => {
            if (typeof payload.options.fire !== "undefined" && payload.options.fire) {
                request(
                    {
                        method: "POST",
                        url: config.tracker.url.api + '/track',
                        data: trackEventList.get()
                    }
                );
                trackEventList.reset();
            } else if (!singleApiCall.tracks) {
                singleApiCall.tracks = true;
                console.debug('[Tracker] TrackEnd');
                console.debug(trackEventList.get());

                request(
                    {
                        method: "POST",
                        url: config.tracker.url.api + '/track',
                        data: trackEventList.get()
                    }
                );
                trackEventList.reset();
            }
        },
        pageEnd: ({config, payload}) => {
            if (typeof payload.options.fire !== "undefined" && payload.options.fire) {
                request(
                    {
                        method: "POST",
                        url: config.tracker.url.api + '/page',
                        data: pageEventList.get()
                    }
                );
                pageEventList.reset();
            } else if (!singleApiCall.page) {
                singleApiCall.page = true;
                console.debug("[Tracker] Config", config)

                request(
                    {
                        method: "POST",
                        url: config.tracker.url.api + '/page',
                        data: pageEventList.get()
                    }
                );
                pageEventList.reset();
            }

        }
    }
}
