(function(funcName, baseObj) {
    "use strict";
    // The public function name defaults to window.docReady
    // but you can modify the last line of this function to pass in a different object or method name
    // if you want to put them in a different namespace and those will be used instead of
    // window.docReady(...)
    funcName = funcName || "documentReady";
    baseObj = baseObj || window;
    let readyList = [];
    let readyFired = false;
    let readyEventHandlersInstalled = false;

    // call this when the document is ready
    // this function protects itself against being called more than once
    function ready() {
        if (!readyFired) {
            // this must be set to true before we start calling callbacks
            readyFired = true;
            for (let i = 0; i < readyList.length; i++) {
                // if a callback here happens to add new ready handlers,
                // the docReady() function will see that it already fired
                // and will schedule the callback to run right after
                // this event loop finishes so all handlers will still execute
                // in order and no new ones will be added to the readyList
                // while we are processing the list
                readyList[i].fn.call(window, readyList[i].ctx);
            }
            // allow any closures held by these functions to free
            readyList = [];
        }
    }

    function readyStateChange() {
        if ( document.readyState === "complete" ) {
            ready();
        }
    }

    // This is the one public interface
    // docReady(fn, context);
    // the context argument is optional - if present, it will be passed
    // as an argument to the callback
    baseObj[funcName] = function(callback, context) {
        if (typeof callback !== "function") {
            throw new TypeError("callback for documentReady(fn) must be a function");
        }
        // if ready has already fired, then just schedule the callback
        // to fire asynchronously, but right away
        if (readyFired) {
            setTimeout(function() {callback(context);}, 1);
            return;
        } else {
            // add the function and context to the list
            readyList.push({fn: callback, ctx: context});
        }
        // if document already ready to go, schedule the ready function to run
        // IE only safe when readyState is "complete", others safe when readyState is "interactive"
        if (document.readyState === "complete" || (!document.attachEvent && document.readyState === "interactive")) {
            setTimeout(ready, 1);
        } else if (!readyEventHandlersInstalled) {
            // otherwise if we don't have event handlers installed, install them
            if (document.addEventListener) {
                // first choice is DOMContentLoaded event
                document.addEventListener("DOMContentLoaded", ready, false);
                // backup is window load event
                window.addEventListener("load", ready, false);
            } else {
                // must be IE
                document.attachEvent("onreadystatechange", readyStateChange);
                window.attachEvent("onload", ready);
            }
            readyEventHandlersInstalled = true;
        }
    }
})("documentReady", window);

const bindListeners = [];

window.tracker || (window.tracker = {});
window.response || (window.response = {context: {}});
window.onTracardiReady = {
    bind: (func) => {
        if(typeof func === "function") {
            bindListeners.push(func)
        }
    },

    call: (params) => {
        bindListeners.forEach((func) => {
            func(params)
        })
    }
};

(function () {

    const trackerQueue = [];
    const tracker_path = 'liliput.min.js';
    const methods = ['track'];

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
        console.debug("[Loader] Rerun callbacks.")
        // Now window.tracardi.default is present
        if(typeof window.tracardi.default === 'undefined') {
            console.error("[Loader] Callbacks stopped. Tracker not initialized. Is script url correct?");
            return;
        }
        if(!window.tracardi.default.getState().plugins['tracardi'].initialized) {
            console.error("[Loader] Callbacks stopped. Tracker not initialized.");
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

    documentReady(function () {

        if(navigator.doNotTrack === '1' && options?.tracker?.settings?.respectDoNotTrack === true) {
            console.log("We are respecting do not track setting. Tracardi disabled.");
            return;
        }

        let script = document.createElement('script');
        script.type = 'text/javascript';
        script.async = true;

        if(typeof options.tracker === "undefined" &&
            typeof options.tracker.url === "undefined" &&
            typeof options.tracker.url.script === "undefined") {
            console.error("[Loader] Undefined options.tracker.url.script. This url defines location of tracker code.");
            return;
        }

        if (options.tracker.url.script !== null) {
            if (options.tracker.url.script.startsWith("http") || options.tracker.url.script.startsWith("//")) {
                script.src = options.tracker.url.script + '/' + tracker_path;
            } else {
                script.src = options.tracker.url.script
            }
        } else {
            script.src = tracker_path;
        }
        console.debug("[Loader] Loading: " + script.src);

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