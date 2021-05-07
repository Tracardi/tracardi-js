export default function Event() {
    return {
        build: ({type, metadata, session, profile, properties, payload, userId}) => {
            return {
                type: type,
                metadata: metadata,
                session: session,
                profile: profile,
                properties: properties,
                payload: payload,
                user: userId
            }
        },
        dynamic: (data) => {
            return {
                payload: data.payload,
                type: data.type,
                user: data.user
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