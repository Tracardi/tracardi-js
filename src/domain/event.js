import {getItem, setItem} from "@analytics/storage-utils";
import {v4 as uuid4} from "uuid";
const deviceIdKey = 'tracardi-device-id';

const getDeviceId = () => {
    let deviceId = getItem(deviceIdKey);
    if (!deviceId) {
        deviceId = uuid4();
        setItem(deviceIdKey, deviceId)
    }
    return deviceId
}

export default function Event() {
    return {
        build: ({type, source, session, profile, context, properties, options}) => {
            return {
                type: type,
                session: session,
                device: {id: getDeviceId()},
                profile: profile,
                context: context,
                properties: properties,
                source: source,
                options: options
            }
        },
        dynamic: (data, eventContext) => {
            return {
                properties: data.properties,
                type: data.type,
                options: data.options,
                context: eventContext
            }
        },
        static: (payload) => {
            return {
                metadata: payload.metadata,
                source: payload.source,
                context: payload.context,
                profile: payload.profile,
                device: {id: getDeviceId()},
                session: payload.session,
            };
        }
    }
}