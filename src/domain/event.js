export default function Event() {
    return {
        build: ({type, source, session, profile, context, properties, options}) => {
            return {
                type: type,
                session: session,
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
                session: payload.session,
            };
        }
    }
}