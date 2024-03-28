import Cookies from 'js-cookie';

export function getCookie(name) {
    return Cookies.get(name);
}

export function setCookie(name, value, expiresInMin, path) {
    Cookies.set(name, value, { expires: expiresInMin/1440, sameSite: 'lax', path: path});
}

export function hasCookies(name) {
    return !!Cookies.get(name);
}

export function removeCookie(name) {
    Cookies.remove(name);
}