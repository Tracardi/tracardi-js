import Analytics from 'analytics'
import tracardiPlugin from './tracardi'

const analytics = Analytics({
    app: 'app-name',
    plugins: [
        tracardiPlugin(options)
    ]
})

export default analytics;
