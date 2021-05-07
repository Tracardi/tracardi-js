export default function ClientInfo() {

    const getReferer = () => {

        let referrerURL = document.referrer;
        if (referrerURL) {
            // parse referrer URL
            let referrer = document.createElement('a');
            referrer.href = referrerURL;

            // only process referrer if it's not coming from the same site as the current page
            let local = document.createElement('a');
            local.href = document.URL;
            if (referrer.host !== local.host) {
                // get search element if it exists and extract search query if available
                let search = referrer.search;
                let query = undefined;
                if (search && search !== '') {
                    // parse parameters
                    let queryParams = [], param;
                    let queryParamPairs = search.slice(1).split('&');
                    for (let i = 0; i < queryParamPairs.length; i++) {
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

        time: () => {
            return {
                now: new Date(),
                timezone: (new Date()).getTimezoneOffset() / 60,
            }
        },

        page: () => {
            return {
                url: location.href,
                path: location.pathname,
                hash: location.hash,
                title: document.title,
                referer: getReferer(),
                history: {
                    length: history.length,
                }
            }
        },

        screen: () => {
            return {
                width: screen.width,
                height: screen.height,
                innerWidth: innerWidth,
                innerHeight: innerHeight,
                availWidth: screen.availWidth,
                availHeight: screen.availHeight,
                colorDepth: screen.colorDepth,
                pixelDepth: screen.pixelDepth,
            }
        },

        browser: () => {
            if (typeof navigator !== "undefined") {
                const browserInfo = {
                    browser: {
                        name: navigator.appName,
                        engine: navigator.product,
                        appVersion: navigator.appVersion,
                        userAgent: navigator.userAgent,
                        language: navigator.language,
                        onLine: navigator.onLine,
                        javaEnabled: navigator.javaEnabled(),
                        cookieEnabled: navigator.cookieEnabled,
                    },
                    device: {
                        platform: navigator.platform,
                    }
                }
                return browserInfo;
            }
            return {}
        },

        storage: () => {
            return {
                local: localStorage,
                cookie: {
                    cookies1: document.cookie,
                    cookies2: decodeURIComponent(document.cookie.split(";")),
                }
            }
        }
    }
}
