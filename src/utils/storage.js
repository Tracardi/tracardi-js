import {getCookie, setCookie} from "../cookies";
import {v4 as uuid4} from "uuid";
import {getItem, setItem} from "@analytics/storage-utils";

const cookieName = 'tracardi-session-id';
const profileName = 'tracardi-profile-id';
const cookieExpires = 30 * 60;  // 30 min
let profileId = getItem(profileName)

export function getSessionId() {
    // Every time the cookie is fetched its expiration gets prolonged.
    let sessionId = getCookie(cookieName);
    if (!sessionId) {
        sessionId = uuid4();
        console.warn("Cookie missing or expired", cookieName, sessionId)
    }
    setCookie(cookieName, sessionId, cookieExpires, '/')
    return sessionId
}


export function getProfileId(config) {

    // This is a way to statically define profile ID. See `Forcing Profile ID` in the documentation.

    if (config?.tracker?.profile) {
        return config.tracker.profile  // It returns {id: xxx}
    }
    return (profileId != null)
        ? {id: profileId}
        : null
}

export function keepSessionId(startScriptSessionId) {
    const endScriptSessionId = getCookie(cookieName)
    // This code fixes the error in FireFox that recreates session, god knows why.
    if (startScriptSessionId !== endScriptSessionId) {
        console.error('[Tracardi] Tracker did not end with the same session.', startScriptSessionId, endScriptSessionId);
        setCookie(cookieName, startScriptSessionId, cookieExpires, "/")
    }
}

export function setProfileId(profileId) {
    if (!getItem(profileName)) {
        setItem(profileName, profileId);
        setItem('__tr_pid', profileId);
        setCookie('__tr_pid', profileId, 30, '/')
    } else {
        setItem("__tr_id", profileId);
        setCookie('__tr_id', profileId, 30, '/')
    }
}