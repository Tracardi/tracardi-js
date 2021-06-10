import axios from "axios";

export async function request({url, header, method, data}) {

    if (typeof header == "undefined") {
        header = {"Content-Type": 'application/json'};
    }

    if (typeof method == "undefined") {
        method = "get";
    }

    const response =  await axios({
        url,
        method,
        header,
        data
    });

    return response
};
