import {getCookie, setCookie, hasCookies} from '@analytics/cookie-utils';
import {v4 as uuid4} from 'uuid';
import Event from './domain/event';
import ClientInfo from './domain/clientInfo';
import EventsList from './domain/eventsList';
import {getItem, setItem} from "@analytics/storage-utils";
import {request} from "./apiCall";
import {addListener} from "@analytics/listener-utils";
// import {getLCP, getFID, getCLS} from 'web-vitals';

export default function tracardiPlugin(options) {

    const clientInfo = ClientInfo();
    const event = Event();

    let isCookieSet = true
    const trackEventList = EventsList({}, window.response);
    const immediateTrackEventList = EventsList({}, window.response);
    const cookieName = 'tracardi-session-id';
    const profileName = 'tracardi-profile-id';
    let profileId = getItem(profileName)
    let sessionId = getCookie(cookieName);
    if (!sessionId) {
        sessionId = uuid4();
        const expires = 0;
        setCookie(cookieName, sessionId, expires);
        isCookieSet = false
    }
    let singleApiCall = {}

    const isObject = (a) => {
        return (!!a) && (a.constructor === Object);
    }

    const isEmptyObjectOrNull = (obj) => {
        return !obj || obj === null || (isObject(obj) && Object.keys(obj).length === 0);
    }

    const hasMethods = function(obj /*, method list as strings */){
        let i = 1, methodName;
        while((methodName = arguments[i++])){
            if(typeof obj[methodName] != 'function') {
                return false;
            }
        }
        return true;
    }

    const getEventPayload = (payload, context) => {

        let eventPayload = {
            type: payload.event,
            source: config.tracker.source,
            session: {id: sessionId},
            profile: (profileId != null)
                ? {id: profileId}
                : null,
            context: {
                time: clientInfo.time(),
            },
            properties: payload.properties,
        }

        if (typeof context.browser === "undefined" || context?.browser === true) {
            eventPayload.context.browser = {
                ...eventPayload.context.browser,
                local: clientInfo.browser()
            }
        }

        if (typeof context.screen === "undefined" || context?.screen === true) {
            eventPayload.context.screen = {
                ...eventPayload.context.screen,
                local: clientInfo.screen()
            }
        }

        if (context?.storage === true) {
            eventPayload.context.storage = {
                ...eventPayload.context.storage,
                local: clientInfo.storage()
            }
        }

        if (context?.cookies === true) {
            eventPayload.context.storage = {
                ...eventPayload.context.storage,
                cookies: clientInfo.cookies()
            }
        }

        if (typeof context.utm === "undefined" || context?.utm === true) {
            const queryString = window.location.search
            const urlParams = new URLSearchParams(queryString)

            const hasUtm = urlParams.has('utm_source') ||
                urlParams.has('utm_medium') ||
                urlParams.has('utm_campaign') ||
                urlParams.has('utm_term') ||
                urlParams.has('utm_content')

            if (hasUtm) {
                const utm = {
                    ...(urlParams.has('utm_source')) && {source: urlParams.get("utm_source")},
                    ...(urlParams.has('utm_medium')) && {medium: urlParams.get("utm_medium")},
                    ...(urlParams.has('utm_campaign')) && {campaign: urlParams.get("utm_campaign")},
                    ...(urlParams.has('utm_term')) && {term: urlParams.get("utm_term")},
                    ...(urlParams.has('utm_content')) && {content: urlParams.get("utm_content")},
                }
                eventPayload.context.utm = utm
            }
        }

        if (payload.options) {
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
        let response = null;

        try {

            response = await request(
                {
                    method: "POST",
                    url: config.tracker.url.api + '/track',
                    data: trackEventList.get(config),
                    asBeacon: false
                }
            );

            // If browser profile is the same as context profile then consent displayed
            // Consent is displayed when there is new profile created.

            if (typeof response?.data?.profile?.id === "undefined") {
                console.error("[Tracardi] /track must return profile id. No profile id returned.")
            }

            // Set profile id
            profileId = response.data.profile.id
            setItem(profileName, profileId);

        } catch (e) {
            handleError(e);
        }

        documentReady(() => {

            const params = {
                tracker: window.tracardi.default,
                helpers: window.tracardi.default.plugins.tracardi,
                context: response !== null && typeof response.data !== "undefined" ? response.data : null,
                config: config
            }

            // onTracardiReady
            if (typeof window.onTracardiReady === 'object' && hasMethods(window.onTracardiReady, 'bind', 'call')) {
                window.onTracardiReady.call(params)
            } else {
                console.error("[Tracardi] Incorrect window.onTracardiReady. Please use bind do not assign value to window.onTracardiReady.")
            }

            // Ux
            if (Array.isArray(response?.data?.ux)) {
                console.log("[Tracardi] UIX found.")
                response.data.ux.map(tag => {
                        console.debug(tag)
                        const placeholder = document.createElement(tag.tag);
                        for (let key in tag.props) {
                            placeholder.setAttribute(key, tag.props[key]);
                        }
                        document.body.appendChild(placeholder);
                    }
                )
            }

        });

        trackEventList.reset();

    }

    return {
        name: 'tracardi',

        config: {
            tracker: options.tracker,
            listeners: options.listeners,
            context: options.context
        },
        methods: {
            track: async (eventType, payload, options) => {
                let eventContext = {}
                if (config?.tracker?.context?.page === true) {
                    eventContext = {
                        page: clientInfo.page()
                    }
                }

                payload = {
                    event: eventType,
                    properties: (payload) ? payload : {}
                }

                const eventPayload = getEventPayload(payload, config.tracker.context);

                let trackerPayload = event.static(eventPayload);
                trackerPayload.options = window.response.context;
                trackerPayload.events = [event.dynamic(eventPayload, eventContext)];

                const response = await request(
                    {
                        method: "POST",
                        url: config.tracker.url.api + '/track',
                        data: trackerPayload,
                        asBeacon: options?.asBeacon === true
                    }
                );

                return response
            },

            onClick: (object, func) => {
                return addListener(object, 'click', func);
            },
            addListener: (object, event, func) => {
                return addListener(object, event, func);
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

            if (typeof config.listeners === "undefined") {
                config.listeners = {}
            }

            if (typeof config.tracker.context === "undefined") {
                config.tracker.context = {
                    cookies: false,
                    storage: false,
                    screen: true,
                    page: true,
                    browser: true
                }
            }
        },

        initialize: ({config}) => {

            console.debug("[Tracker] Plugin init configuration", config)

            singleApiCall = {
                tracks: false
            }

            if (!hasCookies()) {
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

            if (typeof config.listeners.onInit !== "undefined") {
                const onInit = config.listeners.onInit
                if (typeof onInit !== "function") {
                    throw new TypeError("onInit must be a function.");
                }

                onInit(
                    {
                        session: {id: sessionId},
                        tracker: window.tracardi.default,
                        helpers: window.tracardi.default.plugins.tracardi
                    }
                )
            }

            window.config = config

        },

        track: ({payload, config}) => {

            if (typeof config == 'undefined' || typeof config.tracker == 'undefined' || typeof config.tracker.source === 'undefined') {
                console.error("[Tracker] config.tracker.source undefined.");
                return;
            }

            console.debug("[Tracker] Event track", payload);

            const eventPayload = getEventPayload(payload, config.tracker.context)

            let eventContext = {}
            if (typeof config.tracker.context.page === "undefined" || config.tracker.context.page === true) {
                eventContext = {
                    page: clientInfo.page()
                }
            }

            if (!isEmptyObjectOrNull(payload?.options?.context)) {
                eventContext = {...eventContext, ...payload?.options?.context}
            }

            if (payload?.options?.fire === true) {
                try {

                    immediateTrackEventList.add(event.build(eventPayload), eventContext)

                    const response = request(
                        {
                            method: "POST",
                            url: config.tracker.url.api + '/track',
                            data: immediateTrackEventList.get(config),
                            asBeacon: payload?.options?.asBeacon === true
                        },
                    );
                    console.warn("[Tracardi] Tracking with option `fire: true` will not trigger listeners such as onContextReady, onConsentRequired, etc.")

                    immediateTrackEventList.reset();
                    return response

                } catch (e) {
                    handleError(e);
                }
            } else {
                trackEventList.add(event.build(eventPayload), eventContext);
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
