var geoClient = require("../lib/db/geoddb")
var tableManager = require("../lib/db/config")
const gapi = require("../lib/gapi/gapi")
const err = require("../util/error")
var util = require("../util/utility")
const GOOGLE_API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;
const AWS = require("aws-sdk");
const { response } = require("express")
const NODE_ENV = process.env.NODE_ENV || "development";
const geoDdbPort = process.env.GEO_DDB_PORT || 3005;
var PLACES_RADIUS = 50000; //50kms
const TST_DB_NAME = "TST_INDIA_HOSPITAL_LIST"
const DB_NAME = "INDIA_HOSPITAL_LIST"
let client = null;

async function initGeoTable() {
    if (NODE_ENV == 'production' || NODE_ENV == 'staging') {
        var config = tableManager(DB_NAME)
        client = new geoClient(config)
    } else {
        var config = tableManager(TST_DB_NAME)
        client = new geoClient(config)
    }

    if (!(await client.TableExists())) {
        console.log('Table doesnt exist creating new table')
        await client.CreateTable()
    } else {
        console.log('Table already exist')
    }
}

/*
  Update database using response from google api
  Input: list of google api response
*/
function updateDbFromGApi(hospitalList) {
    for (let i in hospitalList) {
        location = hospitalList[i]["geometry"]["location"]
        lat = location["lat"]
        long = location["lng"]
        data = convertToGeoDbResponse(hospitalList[i], lat, long)
        client.InsertIntoTable(data)
    }
}

function convertToGeoDbResponse(data, lat, long) {
    params = client.GetDefaultParams()
    for (const [key, value] of Object.entries(params)) {
        if (data.hasOwnProperty('name')) {
            params["name_english"] = data['name']
        }
        if (data.hasOwnProperty('business_status')) {
            params["business_status"] = data.business_status
        }
        if (data.hasOwnProperty('vicinity')) {
            params["landmark"] = data.vicinity
        }
        if (data.hasOwnProperty('rating')) {
            params["ratings"] = data.rating
        }
        if (data.hasOwnProperty('user_ratings_total')) {
            params["user_ratings_total"] = data.user_ratings_total
        }
        if (data.hasOwnProperty('opening_hours')) {
            params["open_now"] = data["opening_hours"]["open_now"]
        }
    }
    params["lat"] = lat
    params["long"] = long
    return params
}

function mergeDbAndGApiResponse(dbDict, gDict) {
    var _dict = {}
    var notInDb = []
    var _result = dbDict
    for (let i in dbDict) {
        try {
            location = JSON.parse(dbDict[i]["geoJson"])
            lat = location["coordinates"][1]
            long = location["coordinates"][0]
            key = `${lat}:${long}`
            _dict[key] = dbDict[i]
        } catch (e) {
            _errStr = "Error: " + JSON.stringify(dbDict[i]) + " : " + JSON.stringify(e)
            console.error(_errStr)
        }
    }
    for (let i in gDict) {
        try {
            location = gDict[i]["geometry"]["location"]
            lat = location["lat"]
            long = location["lng"]
            key = `${lat}:${long}`

            if (!_dict.hasOwnProperty(key)) {
                notInDb.push(gDict[i])
                _result.push(convertToGeoDbResponse(gDict[i], lat, long)) ///this is required so that client can understand geo db response
            }
        } catch (e) {
            _errStr = "Error: " + JSON.stringify(gDict[i]) + " : " + JSON.stringify(e)
            console.error(_errStr)
        }
    }
    updateDbFromGApi(notInDb)
    console.log('difference ', notInDb.length)
    return _result
    //Push difference metrics to cloudwatch metrics
}


//////////////////////////////////////// API ////////////////////////////

/* 
    Api to get nearby hospitals within radius
      {
          "lat": 27.1763098, (Required)
          "long": 77.9099723, (Required)
          "radius": 100000 //ie 100kms
      }
      if radius not defined default radius: PLACES_RADIUS 50kms
*/
async function getHospitalsWithinRadius(req, res) {
    var params = {};
    if (!req.body.hasOwnProperty(["lat"])) {
        util.handleBadRequest(res, err.LAT_IS_MISSING)
        return;
    }
    if (!req.body.hasOwnProperty(["long"])) {
        util.handleBadRequest(res, err.LONG_IS_MISSING)
        return;
    }
    if (!req.body.hasOwnProperty(["radius"])) {
        params["radius"] = PLACES_RADIUS
    } else {
        params["radius"] = req.body.radius
    }
    params["lat"] = req.body.lat
    params["long"] = req.body.long

    //Get all list from google client
    var gResults = await gapi.getHospitalsFromLocationByRadius(params)
        .then((response) => {
            console.log(response)
            return response.results
        })
        .catch((err) => {
            console.log(err)
            return []
        })
    if (req.body.hasOwnProperty(["shortcut"]) && req.body["shortcut"]) {
        util.handleSuccess(res, gResults)
        return
    }

    var dbResults = await client.QueryWithinRadius(params)
        .then((response) => {
            return response
        })
        .catch((err) => {
            console.error(err)
            return [];
        })
    var _results = mergeDbAndGApiResponse(dbResults, gResults)
    util.handleSuccess(res, _results)
}

module.exports = {
    initGeoTable,
    getHospitalsWithinRadius
}