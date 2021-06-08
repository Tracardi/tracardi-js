import Analytics from 'analytics'
import tracardiPlugin from './tracardi'

const analytics = Analytics({
    app: 'tracardi',
    debug: true,
    plugins: [
        tracardiPlugin(options)
    ]
});

export default analytics;