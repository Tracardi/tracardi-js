import {getCookie, setCookie, hasCookies, removeCookie} from './cookies';
import {v4 as uuid4} from 'uuid';
import Event from './domain/event';
import ClientInfo from './domain/clientInfo';
import EventsList from './domain/eventsList';
import {toUTCISOStringWithMilliseconds} from './utils/date';
import {getItem, removeItem, setItem} from "@analytics/storage-utils";
import {request} from "./apiCall";
import {addListener} from "@analytics/listener-utils";
// import {getLCP, getFID, getCLS} from 'web-vitals';

export default function tracardiPlugin(options) {

    const cookieName = 'tracardi-session-id';
    const profileName = 'tracardi-profile-id';
    const cookieExpires = 30*60;  // 30 min

    const getSessionId = () => {
        // Every time the cookie is fetched its expiration gets prolonged.
        let sessionId = getCookie(cookieName);
        if (!sessionId) {
            sessionId = uuid4();
            console.warn("Cookie missing or expired", cookieName, sessionId)
        }
        setCookie(cookieName, sessionId, cookieExpires, '/')
        return sessionId
    }

    const startScriptSessionId = getSessionId()
    setCookie(cookieName, startScriptSessionId, cookieExpires, '/');
    console.debug("[Tracardi] Session:", startScriptSessionId)

    const sendTrackPayload = async (payload) => {
        return await request(payload)
    }

    const clientInfo = ClientInfo();
    const event = Event();
    const trackEventList = EventsList({}, window.response);
    const immediateTrackEventList = EventsList({}, window.response);
    const beaconTrackEventList = EventsList({}, window.response);
    let profileId = getItem(profileName)
    let singleApiCall = {}

    const isObject = (a) => {
        return (!!a) && (a.constructor === Object);
    }

    function injectUX(ux) {
        if (Array.isArray(ux) && ux.length>0) {
            console.debug("[Tracardi] UIX found.")
            ux.map(tag => {
                    const placeholder = document.createElement(tag.tag);
                    for (let key in tag.props) {
                        placeholder.setAttribute(key, tag.props[key]);
                    }
                    if(tag.content) {
                        placeholder.text = tag.content
                    }
                    document.body.appendChild(placeholder);
                }
            )
        }
    }

    async function TriggerEventTrack(eventPayload, eventContext) {

        immediateTrackEventList.add(event.build(eventPayload), eventContext)

        const data = immediateTrackEventList.get(config)

        console.debug("[Tracardi] Immediate /track requested:", data)

        const response = await sendTrackPayload(
            {
                method: "POST",
                url: config.tracker.url.api + '/track',
                data: data,
                asBeacon: false
            },
        );
        injectUX(response?.data?.ux)
        immediateTrackEventList.reset();

        return response
    }

    async function onTrigger(element) {
        console.log(`Element (${element.id}) is now visible on the screen.`);
        // Access the custom data directly from the element
        console.log("Custom Data:", element.customData);

        const payload = element.customData.payload
        const config = element.customData.config

        const eventPayload = await getEventPayload(payload, config)
        const eventContext = getEventContext(config, payload)

        await TriggerEventTrack(eventPayload, eventContext)
    }

    const observer = new IntersectionObserver(async (entries, observer) => {
        entries.forEach(entry => {
            if(entry.isIntersecting){
                (async (entry) => {
                    // The observed element is available as entry.target
                    // Run your async function with the element
                    await onTrigger(entry.target);

                    // Optional: Unobserve the element
                    observer.unobserve(entry.target);
                })(entry);
            }
        });
    }, { threshold: 0.1 });

    // Function to observe an element with custom data
    function observeWithCustomData(element, customProperties) {
        // Attach custom data directly to the element
        element.customData = customProperties;
        // Start observing the element
        observer.observe(element);
    }

    function getSelectedText() {
        if (window.getSelection) {
            return window.getSelection().toString();
        } else if (document.selection && document?.selection?.type !== "Control") {
            return document.selection.createRange().text;
        }
        return '';
    }

    function bindOnMouseOver(element, customProperties) {
        element.addEventListener('mouseover', async (e) => {
            // Function to get the selected text
            const selectedText = getSelectedText();
            if (selectedText) {
                const properties = {...customProperties}
                if (!properties?.payload?.properties) {
                    properties.payload.properties = {}
                }
                properties.payload.properties.text = selectedText
                element.customData = properties
                await onTrigger(element);
            }
        });
    }


    function bindOnTextSelect(element, customProperties) {
        element.addEventListener('mouseup', async (e) => {
            // Function to get the selected text
            const selectedText = getSelectedText();
            if (selectedText) {
                const properties = {...customProperties}
                if(!properties?.payload?.properties) {
                    properties.payload.properties = {}
                }
                properties.payload.properties.text = selectedText
                element.customData = properties
                await onTrigger(element);
            }
        });

        // Optional: Consider touch devices
        element.addEventListener('touchend', async (e) => {
            const selectedText = getSelectedText();
            if (selectedText) {
                const properties = {...customProperties}
                if(!properties?.payload?.properties) {
                    properties.payload.properties = {}
                }
                properties.payload.properties.text = selectedText
                element.customData = properties
                await onTrigger(element);
            }
        });
    }


    const trackExternalLinks = (domains, profileId, sourceId) => {
        // Add a click event listener to all anchor tags (links) on the page
        const links = document.getElementsByTagName('a');
        for (let i = 0; i < links.length; i++) {
            const link = links[i];

            // Check if the link has a full URL (starts with 'http://' or 'https://')
            if (link.href.indexOf('http://') === 0 || link.href.indexOf('https://') === 0) {

                try {
                    const parsedUrl = new URL(link.href);
                    const linkDomain = parsedUrl.hostname;

                    for (const allowedDomain of domains) {
                        if (linkDomain.endsWith(allowedDomain)) {
                            // Add a click event listener to the link
                            link.addEventListener('click', function (event) {
                                // Prevent the default behavior of the link click, which would cause the browser to navigate to the link's href
                                event.preventDefault();

                                // Get the href attribute of the clicked link
                                const href = this.getAttribute('href');

                                const parameter = `__tr_pid=${profileId.trim()}&__tr_src=${sourceId.trim()}`;
                                const updatedHref = href + (href.indexOf('?') === -1 ? '?' : '&') + parameter;

                                // Navigate to the updated URL
                                window.location.href = updatedHref;
                            });

                            // const parameter = `__tr_pid=${profileId.trim()}&__tr_src=${sourceId.trim()}`;
                            // const updatedHref = link.href + (link.href.indexOf('?') === -1 ? '?' : '&') + parameter;
                            // link.href = updatedHref

                            console.debug(`[Tracardi] Patched Link: ${link.href}`)
                        }
                    }
                } catch (error) {
                    console.error('Invalid URL: ' + link.href);
                }
            }
        }

    }

    const isEmptyObjectOrNull = (obj) => {
        return !obj || obj === null || (isObject(obj) && Object.keys(obj).length === 0);
    }

    const hasMethods = function (obj /*, method list as strings */) {
        let i = 1, methodName;
        while ((methodName = arguments[i++])) {
            if (typeof obj[methodName] != 'function') {
                return false;
            }
        }
        return true;
    }

    const fireExternalApiCalls = async (config, eventPayload) => {
        await Promise.all(config.map(
            async (externalConfig) => {
                let data = getItem(externalConfig.storage)
                if (data) {
                    try {
                        eventPayload.context = {
                            ...eventPayload.context,
                            [externalConfig.key]: JSON.parse(data)
                        }
                    } catch (e) {
                        removeItem(externalConfig.storage)
                    }
                } else {
                    try {
                        const response = await sendTrackPayload({
                            url: externalConfig?.url,
                            method: externalConfig?.method,
                            body: externalConfig?.body
                        })
                        if (response?.data) {
                            setItem(externalConfig.storage, JSON.stringify(response?.data));
                            eventPayload.context = {
                                ...eventPayload.context,
                                [externalConfig.key]: response?.data
                            }
                        }
                    } catch (e) {
                        console.error(e)
                    }
                }
            }
        ))

        return eventPayload
    }

    const getProfileId = (config) => {
        if(config?.tracker?.profile) {
            return config.tracker.profile
        }
        return (profileId != null)
            ? {id: profileId}
            : null
    }

    const getEventContext = (config, payload=null) => {
        let eventContext = {}
        if (typeof config.tracker.context.page === "undefined" || config.tracker.context.page === true) {
            eventContext = {
                page: clientInfo.page()
            }
        }

        if (!isEmptyObjectOrNull(payload?.options?.context)) {
            eventContext = {...eventContext, ...payload?.options?.context}
        }

        return eventContext
    }

    const getEventPayload = async (payload, config) => {
        const context = config.tracker.context
        const deviceContext = config?.context

        const now = new Date();

        let eventPayload = {
            time: {
              create: toUTCISOStringWithMilliseconds(now)
            },
            type: payload.event,
            source: config.tracker.source,
            session: {id: getSessionId()},
            profile: getProfileId(config),
            context: {
                time: clientInfo.time(),
            },
            properties: payload.properties,
        }

        if(deviceContext) {
            eventPayload.context.device= deviceContext
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

        let googleAnalyticsId = getCookie('_ga');
        if (googleAnalyticsId) {
            eventPayload.context.ids = {
                ga: googleAnalyticsId
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

        if(context?.location) {
            const geo = getCookie('__tr_geo')
            try {
                eventPayload.context.location = JSON.parse(geo)
            } catch (e) {
                removeCookie('__tr_geo')
            }

        }

        // Externals
        if (config?.tracker?.external) {
            eventPayload = await fireExternalApiCalls(config?.tracker?.external, eventPayload)
        }

        if (typeof context.tracardiPass === "undefined" || context?.tracardiPass === true) {
            const queryString = window.location.search
            const urlParams = new URLSearchParams(queryString)

            const hasPid = urlParams.has('__tr_pid') ||
                urlParams.has('__tr_src')

            if (hasPid) {
                const passedPid = {
                    ...(urlParams.has('__tr_pid')) && {profile: urlParams.get("__tr_pid")},
                    ...(urlParams.has('__tr_src')) && {source: urlParams.get("__tr_src")}
                }
                eventPayload.context.tracardi = {
                    pass: passedPid
                }
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
                eventPayload.context.utm = {
                    ...(urlParams.has('utm_source')) && {source: urlParams.get("utm_source")},
                    ...(urlParams.has('utm_medium')) && {medium: urlParams.get("utm_medium")},
                    ...(urlParams.has('utm_campaign')) && {campaign: urlParams.get("utm_campaign")},
                    ...(urlParams.has('utm_term')) && {term: urlParams.get("utm_term")},
                    ...(urlParams.has('utm_content')) && {content: urlParams.get("utm_content")},
                }
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
                console.error("[Tracardi] " + e.response.data.detail);
            } else {
                console.error("[Tracardi] " + e.message);
            }
        } else {
            console.error("[Tracardi] " + e.message);
        }
    }

    const push = async (config) => {
        let response = null;

        try {

            const payload = trackEventList.get(config)

            console.debug("[Tracardi] Collected page event sent:", payload)

            response = await sendTrackPayload(
                {
                    method: "POST",
                    url: config.tracker.url.api + '/track',
                    data: payload,
                    asBeacon: false
                }
            );

            trackEventList.reset();

            console.debug("[Tracardi] Collected page event response:", response)

            if (response.status !== 200) {
                console.error("[Tracardi] Incorrect response status", response?.status, response?.statusText)
                console.error("[Tracardi] Tracardi responded", response?.data)
            }

            // If browser profile is the same as context profile then consent displayed
            // Consent is displayed when there is new profile created.

            if (typeof response?.data?.profile?.id === "undefined") {
                console.error("[Tracardi] /track must return profile id. No profile id returned.")
            } else {
                // Set profile id
                profileId = response.data.profile.id
                if(!getItem(profileName)) {
                    setItem(profileName, profileId);
                    setItem('__tr_pid', profileId);
                    setCookie('__tr_pid', profileId, 0, '/')
                } else {
                    setItem("__tr_id", profileId);
                    setCookie('__tr_id', profileId, 0, '/')
                }
            }

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
            injectUX(response?.data?.ux)

        });



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
                const eventContext = getEventContext(config, payload)

                payload = {
                    event: eventType,
                    properties: (payload) ? payload : {},
                    options: {...options, fire: true}
                }

                const eventPayload = await getEventPayload(payload, config);

                let trackerPayload = event.static(eventPayload);
                trackerPayload.options = window.response.context;
                trackerPayload.events = [event.dynamic(eventPayload, eventContext)];

                console.debug("[Tracardi] Helper /track requested:", trackerPayload)

                console.log(trackerPayload)

                const response = await sendTrackPayload(
                    {
                        method: "POST",
                        url: config.tracker.url.api + '/track',
                        data: trackerPayload,
                        asBeacon: options?.asBeacon === true
                    }
                );

                injectUX(response?.data?.ux)

                console.debug("[Tracardi] Helper /track response:", response)

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
                console.error("[Tracardi] Tracker init stopped because config.tracker is undefined.");
                return abort('Cancel the initialize call because of config.tracker.source is undefined.');
            }

            if (typeof config.tracker.source === 'undefined') {
                console.error("[Tracardi] Tracker init stopped because config.tracker.source is undefined.");
                return abort('Cancel the initialize call because of config.tracker.source is undefined.');
            }

            if (typeof config.tracker.url === "undefined") {
                console.error("[Tracardi] Tracker init stopped because config.tracker.url is undefined.");
                return abort('Cancel the initialize call because of config.tracker.url is undefined.');
            }

            if (typeof config.tracker.url.api === "undefined") {
                console.error("[Tracardi] Tracker init stopped because config.tracker.url.api is undefined.");
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

            if(config?.tracker?.context?.location === true) {
                config.tracker.context.location = {
                    url: 'https://geolocation-db.com/json/', data: function (data) {
                        if (!data) {
                            return null
                        }
                        return {
                            country: {
                                name: data.country_name,
                                code: data.country_code,
                            },
                            city: data.city,
                            county: data.state,
                            latitude: data.latitude,
                            longitude: data.longitude,
                            ip: data.IPv4
                        }
                    }
                }
            }

            if(config?.tracker?.context?.location?.url) {
                const geo = getCookie('__tr_geo')
                if(!geo) {
                    fetch(config?.tracker?.context?.location?.url, {method: 'get'}).then(response => {
                        response.json().then(json => {
                            if(config?.tracker?.context?.location?.data) {
                                json = config.tracker.context.location.data(json);
                                setCookie('__tr_geo', JSON.stringify(json), 0, '/');
                            }
                        })
                    });
                }
            }

            const domains  = config?.tracker?.settings?.trackExternalLinks

            if(domains && Array.isArray(domains) && domains.length > 0) {
                console.debug("[Tracardi] External links patched.")
                trackExternalLinks(domains,
                    profileId,
                    config?.tracker?.source?.id)
            }

            if(config?.tracker?.auto?.triggers) {
                let elements
                for (const trigger of config?.tracker?.auto?.triggers) {
                    if(trigger?.trigger === 'onVisible') {
                        elements = document.querySelectorAll(`[data-tracardi-tag="${trigger.tag}"]`);
                        elements.forEach(element => observeWithCustomData(
                            element, {config, payload: trigger.data}
                            ));
                    } else if(trigger?.trigger === 'onTextSelect') {
                        elements = document.querySelectorAll(`[data-tracardi-tag="${trigger.tag}"]`);
                        elements.forEach(element => bindOnTextSelect(element, {config, payload: trigger.data}));
                    } else if(trigger?.trigger === 'onMouseOver') {
                        elements = document.querySelectorAll(`[data-tracardi-tag="${trigger.tag}"]`);
                        elements.forEach(element => bindOnMouseOver(element, {config, payload: trigger.data}));
                    }
                }
            }

        },

        initialize: ({config}) => {

            console.debug("[Tracardi] Plugin init configuration", config)

            singleApiCall = {
                tracks: false
            }

            if (!hasCookies()) {
                console.error("[Tracardi] Cookies disabled.");
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

            if (typeof config.listeners.onInit !== "undefined") {
                const onInit = config.listeners.onInit
                if (typeof onInit !== "function") {
                    throw new TypeError("onInit must be a function.");
                }

                onInit(
                    {
                        session: {id: getSessionId()},
                        tracker: window.tracardi.default,
                        helpers: window.tracardi.default.plugins.tracardi
                    }
                )
            }

            window.config = config
        },

        track: async ({payload, config}) => {

            if (typeof config == 'undefined' || typeof config.tracker == 'undefined' || typeof config.tracker.source === 'undefined') {
                console.error("[Tracardi] config.tracker.source undefined.");
                return;
            }

            const eventPayload = await getEventPayload(payload, config)
            const eventContext = getEventContext(config, payload)

            if (payload?.options?.asBeacon === true) {

                console.debug("[Tracardi] Beacon /track requested (no response):", data)
                beaconTrackEventList.add(event.build(eventPayload), eventContext)
                const data = beaconTrackEventList.get(config)

                const response = await sendTrackPayload(
                    {
                        method: "POST",
                        url: config.tracker.url.api + '/track',
                        data: data,
                        asBeacon: true
                    },
                );

                beaconTrackEventList.reset();

                console.debug("[Tracardi] Beacon /track response:", response)

                return response

            } else if (payload?.options?.fire === true) {
                try {
                    return await TriggerEventTrack(eventPayload, eventContext)
                } catch (e) {
                    handleError(e);
                }
            } else {
                trackEventList.add(event.build(eventPayload), eventContext);
            }
        },

        trackEnd: async ({config}) => {
            if (!singleApiCall.tracks) {
                singleApiCall.tracks = true;
                const autoEvents = config?.tracker?.auto?.events
                if (autoEvents) {
                    let eventPayload;
                    for (const [eventType, eventProperties] of autoEvents) {
                        eventPayload = await getEventPayload({
                            event: eventType,
                            properties: eventProperties
                        }, config)
                        const eventContext = getEventContext(config)
                        trackEventList.add(event.build(eventPayload), eventContext);
                    }
                }

                await push(config)

                console.debug('[Tracardi] TrackEnd');
                const endScriptSessionId = getCookie(cookieName)
                // This code fixes the error in FireFox that recreates session, god knows why.
                if(startScriptSessionId !== endScriptSessionId) {
                    console.error('[Tracardi] Tracker did not end with the same session.', startScriptSessionId, endScriptSessionId);
                    setCookie(cookieName, startScriptSessionId, cookieExpires, "/")
                }
            }
        },

        loaded: () => {
            // return boolean so analytics knows when it can send data to third party
            return !!window.tracardi
        },
    }
}
