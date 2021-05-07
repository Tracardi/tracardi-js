export default function Event() {
    return {
        build: ({type, scope, sessionId, profileId, userId, properties, payload, payloadMetadata}) => {
            return {
                type: type,
                metadata: {
                    scope: scope,
                    time: {
                        now: new Date(),
                        timezone: (new Date()).getTimezoneOffset() / 60,
                    },
                    payload: payloadMetadata
                },
                session: {
                    id: sessionId
                },
                profile: {
                    id: profileId,
                    userId: userId
                },
                properties: properties,
                payload: payload
            }
        },
        dynamic: (data) => {
            return {
                payload: data.payload,
                type: data.type
            }
        },
        static: (payload) => {
            return {
                metadata: payload.metadata,
                properties: payload.properties,
                profile: payload.profile,
                session: payload.session
            };
        }
    }
}