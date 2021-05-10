window.tracker || (window.tracker = {});
(function () {

    const trackerQueue = [];
    const tracker_path = 'tracker.min.js';
    const methods = ['track', 'page', 'identify'];

    const factory = function (method) {
        return function () {
            let args = Array.prototype.slice.call(arguments);
            args.unshift(method);
            trackerQueue.push(args);
            return window.tracker;
        };
    };

    // For each of our methods, generate a queueing stub.
    for (let i = 0; i < methods.length; i++) {
        let method = methods[i];
        window.tracker[method] = factory(method);
    }

    function callback(e) {
        console.debug("[Tracker] Rerun callbacks.")
        // Now window.tracardi.default is present
        if(!window.tracardi.default.getState().plugins['tracardi-plugin'].initialized) {
            console.error("[Tracardi] Callbacks stopped. Tracker not initialized.");
            return;
        }
        window.tracker = window.tracardi.default
        while (trackerQueue.length > 0) {
            const item = trackerQueue.shift();
            const method = item.shift();
            if (tracker[method]) {
                tracker[method].apply(tracker, item);
            }
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        let script = document.createElement('script');
        script.type = 'text/javascript';
        script.async = true;

        if(typeof options.tracker === "undefined" &&
            typeof options.tracker.url === "undefined" &&
            typeof options.tracker.url.script === "undefined") {
            console.error("[Tracker] Undefined options.tracker.url.script. This url defines location of tracker code.");
            return;
        }

        if (options.tracker.url.script !== null) {
            if (options.tracker.url.script.startsWith("http")) {
                script.src = options.tracker.url.script + '/' + tracker_path;
            } else {
                script.src = options.tracker.url.script
            }
        } else {
            script.src = tracker_path;
        }
        console.debug("[Tracker] Loading: " + script.src);

        if (script.addEventListener) {
            script.addEventListener('load', function (e) {
                if (typeof callback === 'function') {
                    callback(e);
                }
            }, false);
        } else {
            script.onreadystatechange = function () {
                if (this.readyState === 'complete' || this.readyState === 'loaded') {
                    callback(window.event);
                }
            };
        }

        let first = document.getElementsByTagName('script')[0];
        first.parentNode.insertBefore(script, first);
    });
})();