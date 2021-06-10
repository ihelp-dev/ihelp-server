///Library function for google api 
const axios = require("axios");
const PLACES_API = "https://maps.googleapis.com/maps/api/place/nearbysearch/json?"
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY
const DISTANCE_API = "https://maps.googleapis.com/maps/api/distancematrix/json?units=metric&departure_time=now"


const err = require("../../util/error")

function checkStatus(response) {
    var errFlag = true;
    var error = new Error(response.statusText)
    error.response = response
    if (response.status >= 200 && response.status < 300) {
        errFlag = false
    }
    if (response.data.status == 'REQUEST_DENIED') {
        console.error("Gapi checkStatus ", response.data)
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

function getDistanceBetweenLatLong(origin, destinations) {
    const api = `${DISTANCE_API}&key=${GOOGLE_API_KEY}&origins=${origin}&destinations=${destinations}`
    return new Promise((resolve, reject) => {
        axios.get(api)
            .then(response => checkStatus(response))
            .then(response => resolve(response))
            .catch(err => {
                console.error("Gapi getDistanceBetweenLatLong : ", err.toString())
                reject(err)
            })
    });
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
            .catch(err => {
                console.error("getHospitalsFromLocationByRadius : ", err.toString())
                reject(err)
            })
    });
}

module.exports = {
    getHospitalsFromLocationByRadius,
    getDistanceBetweenLatLong
}

