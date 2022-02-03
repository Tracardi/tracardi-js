export async function request({url, header, method, data, asBeacon=false}) {

    if (typeof header == "undefined") {
        header = {"Content-Type": 'application/json'};
    }

    if (typeof method == "undefined") {
        method = "get";
    }

    if (asBeacon === true) {
        const blob = new Blob([JSON.stringify(data)], {type : 'application/json'});

        navigator.sendBeacon(
            config.tracker.url.api + '/track',
            blob
        );

    } else {

        let response = await fetch(url, {
            method: method,
            headers: header,
            body: JSON.stringify(data),
            credentials: 'omit'
        });
        response['data'] = await response.json()

        return response;

    }

};
