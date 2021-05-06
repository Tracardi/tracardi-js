window.tracker || (window.tracker = {});
(function () {

    const trackerQueue = [];

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
    for (var i = 0; i < methods.length; i++) {
        var method = methods[i];
        window.tracker[method] = factory(method);
    }

    function callback(e) {
        console.debug("Rerun callbacks")
        // Now window.tracardi.default is presnet
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
        if (options.url !== null) {
            script.src = options.url + '/dist/tracker.js';
        } else {
            script.src = 'dist/tracker.js';
        }


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