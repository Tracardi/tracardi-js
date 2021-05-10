import axios from "axios";

export const request = ({url, header, method, data, onSuccess}) => {

    if(typeof header == "undefined") {
        header = {"Content-Type":'application/json'};
    }

    if(typeof method == "undefined") {
        method = "get";
    }

    try {

        axios({
            url,
            method,
            header,
            data
        }).then(response => {
            if(typeof onSuccess !== "undefined") {
                onSuccess(response);
            }
        }).catch((e) => {
            if (e.response) {
                if( typeof e.response.data === 'object') {
                    console.error("[Tracker] " + e.response.data.detail);
                } else {
                    console.error("[Tracker] " + e.message);
                }
            } else {
                console.error("[Tracker] " + e.message);
            }
        });
    } catch (e) {
        console.error("[Tracker] " + e.message);
    }
};
