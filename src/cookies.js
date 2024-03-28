import Cookies from 'js-cookie';

export function getCookie(name) {
    return Cookies.get(name);
}

export function setCookie(name, value, expiresInMin, path) {
    Cookies.set(name, value, {expires: expiresInMin / 1440, sameSite: 'lax', path: path});
}

// export function hasCookie(name) {
//     return !!Cookies.get(name);
// }

export function removeCookie(name) {
    Cookies.remove(name);
}

export function hasCookiesEnabled() {
    const testCookieName = '__t_c';
    const testCookieValue = '1';

    // Attempt to set a test cookie
    Cookies.set(testCookieName, testCookieValue, {expires: 1, sameSite: "lax"});

    // Attempt to read the test cookie
    const cookieFound = Cookies.get(testCookieName) === testCookieValue;

    // Clean up by removing the test cookie
    Cookies.remove(testCookieName);

    // Return true if the test cookie was found, indicating cookies are enabled
    return cookieFound;

}