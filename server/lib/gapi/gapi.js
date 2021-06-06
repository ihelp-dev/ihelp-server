const axios = require("axios");
const PLACES_API = "https://maps.googleapis.com/maps/api/place/nearbysearch/json?"
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY
const err = require("../../util/error")

function checkStatus(response) {
    var errflag = true;
    var error = new Error(response.statusText)
    error.response = response
    if (response.status >= 200 && response.status < 300) {
        errFlag = false
    }
    if (response.data.status == 'REQUEST_DENIED') {
        errFlag = true
        error.response = err.GAPI_REQUEST_DENIED
        error.debug_response = response
    }
    if (errFlag) {
        throw error;
    } else {
        return response
    }
}

function getHospitalsFromLocationByRadius(params) {
    const lat = params.lat
    const long = params.long
    const radius = params.radius
    return new Promise((resolve, reject) => {
        const api = `${PLACES_API}location=${lat},${long}&radius=${radius}&type=hospital&key=${GOOGLE_API_KEY}`;
        axios.get(api)
            .then(response => checkStatus(response))
            .then(response => resolve(response.data))
            .catch(err => reject(err))
    });
}

module.exports = {
    getHospitalsFromLocationByRadius
}

