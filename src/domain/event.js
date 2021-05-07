export default function Event() {
    return {
        build: ({type, source, metadata, session, profile, context, properties, user}) => {
            return {
                type: type,
                metadata: metadata,
                session: session,
                profile: profile,
                context: context,
                properties: properties,
                user: user,
                source: source
            }
        },
        dynamic: (data) => {
            return {
                properties: data.properties,
                type: data.type,
                user: data.user
            }
        },
        static: (payload) => {
            return {
                metadata: payload.metadata,
                source: payload.source,
                context: payload.context,
                profile: payload.profile,
                session: payload.session
            };
        }
    }
}