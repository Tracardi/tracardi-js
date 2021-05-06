import axios from 'axios'

export default function tracardiPlugin(options) {
    // return object for analytics to use
    return {
        /* All plugins require a name */
        name: 'tracardi-plugin',
        /* Everything else below this is optional depending on your plugin requirements */
        config: {
            url: options.url,
            scope: options.scope
        },
        initialize: ({ config }) => {
            // load provider script to page
            console.debug("Plugin init", config)
            window.config = config
        },
        page: ({ payload }) => {
            console.debug("Event page",payload, window.config);
            // call provider specific page tracking

            const getPageInfo = () => {

                const getRefferer = () => {

                    var referrerURL = document.referrer;
                    if (referrerURL) {
                        // parse referrer URL
                        var referrer = document.createElement('a');
                        referrer.href = referrerURL;
                
                        // only process referrer if it's not coming from the same site as the current page
                        var local = document.createElement('a');
                        local.href = document.URL;
                        if (referrer.host !== local.host) {
                            // get search element if it exists and extract search query if available
                            var search = referrer.search;
                            var query = undefined;
                            if (search && search != '') {
                                // parse parameters
                                var queryParams = [], param;
                                var queryParamPairs = search.slice(1).split('&');
                                for (var i = 0; i < queryParamPairs.length; i++) {
                                    param = queryParamPairs[i].split('=');
                                    queryParams.push(param[0]);
                                    queryParams[param[0]] = param[1];
                                }
                
                                // try to extract query: q is Google-like (most search engines), p is Yahoo
                                query = queryParams.q || queryParams.p;
                                query = decodeURIComponent(query).replace(/\+/g, ' ');
                            }
                
                            return {
                                host: referrer.host,
                                query: query
                            }
    
                        }
                    }
                    return {
                        host: null,
                        query: null
                    }
                }

                return {
                    url: location.href,
                    path : location.pathname,
                    hash: location.hash,
                    title: document.title,
                    refferer: getRefferer(),
                    history: {
                        length: history.length,
                    }
                }
            }

            const clientInfo = () => {

                let info = {

                    time: {
                        now: new Date(),
                        timezone: (new Date()).getTimezoneOffset()/60,
                    },
                    
                    storage: {
                        local: localStorage,
                        cookie: {
                            cookies1: document.cookie,
                            cookies2: decodeURIComponent(document.cookie.split(";")),
                        }
                    },
                    page: getPageInfo(),

                    document: {
                        width: document.width,
                        height: document.height,
                        referrer: document.referrer,
                    },

                    screen: {
                        width: screen.width,
                        height: screen.height,
                        innerWidth: innerWidth,
                        innerHeight: innerHeight,
                        availWidth: screen.availWidth,
                        availHeight: screen.availHeight,
                        colorDepth: screen.colorDepth,
                        pixelDepth: screen.pixelDepth,
                    }
                    
                }

                if(typeof navigator !== "undefined") {
                    const browserInfo = {
                        browser: {
                            name: navigator.appName,
                            engine: navigator.product,
                            appVersion: navigator.appVersion,
                            userAgent: navigator.userAgent,
                            language: navigator.language,
                            onLine: navigator.onLine,
                            platform: navigator.platform,
                            javaEnabled: navigator.javaEnabled(),
                            cookieEnabled: navigator.cookieEnabled,
                        }
                    }
                    Object.assign(info, browserInfo)
                }

                if(typeof position !== "undefined") {
                    const infoPosition = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        altitude: position.coords.altitude,
                        altitudeAccuracy: position.coords.altitudeAccuracy,
                        heading: position.coords.heading,
                        speed: position.coords.speed,
                        timestamp: position.timestamp,
                    }

                    Object.assign(info, infoPosition)
                }

                return info
            };
            axios.post(
                'http://localhost:8001/test',
                clientInfo()
            ).then(
                (response) => {
                    console.log(response)
                }
            ).catch((e) => {
                console.log(e)
            })
        },

        track: ({ payload }) => {
            console.debug("Event track", payload);
            // call provider specific event tracking
        },
        identify: ({ payload }) => {
            console.debug("Event identify",payload)
            // call provider specific user identify method
        },
        loaded: () => {
            console.debug("Plugin loaded")
            // return boolean so analytics knows when it can send data to third party
            return !!window.tracardi
        }
    }
}
