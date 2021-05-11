import Analytics from 'analytics'
import tracardiPlugin from './tracardi'

const analytics = Analytics({
    app: 'app-name',
    debug: true,
    plugins: [
        tracardiPlugin(options)
    ]
});

export default analytics;