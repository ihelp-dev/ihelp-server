var geoClient = require("../lib/db/geoddb")
var tableManager = require("../lib/db/config")
const gapi = require("../lib/gapi/gapi")
const err = require("../util/error")
var util = require("../util/utility")
const GOOGLE_API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;
const AWS = require("aws-sdk");
const { response } = require("express")
const e = require("express")
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
async function updateDbFromGApi(hospitalList) {
    for (let i in hospitalList) {
        location = hospitalList[i]["geometry"]["location"]
        lat = location["lat"]
        long = location["lng"]
        data = convertToGeoDbDataStruct(hospitalList[i], lat, long)
        client.InsertIntoTable(data)
    }
}

// data : Map
//lat : String
//long : String
function convertToGeoDbDataStruct(data, lat, long) {
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

//Origin: String ie lat,long eg 2.2,3.3
//Destinations: String ie lat1,long1|lat2,long2 eg 22.22,33.33|1.1,2.2|45.4,66.6
//dbDict: List[{String: Map}, {String1:Map1}]
async function calculateDistanceBetweenGeoPoints(origin, destinations, dbDict) {
    var results = dbDict
    var distance = await gapi.getDistanceBetweenLatLong(origin, destinations)
    .then(response => {
        return response
    })
    .catch(err => {
        console.error("getDistanceBetweenLatLong Error" + err.toString())
        return results
    })
    if ( distance.length == 0 ) {
        return results
    }
    if (!distance.hasOwnProperty("data")
        || !distance["data"].hasOwnProperty("rows")
        || distance["data"]["rows"].length == 0
        || !distance["data"]["rows"][0].hasOwnProperty("elements")){
        return results
    }
    var _elements = distance["data"]["rows"][0]["elements"]

    //Destinations = 77.33,66.1|55.5,44.4|11.2,33.1
    _arr = destinations.split("|")
    if ( results.length == 0 ) {
        return results
    }
    for ( var i in _arr) {
        results[i]["distance"] = _elements[i]["distance"]["text"]
        results[i]["duration"] = _elements[i]["duration"]["text"]
        results[i]["duration_in_traffic"] = _elements[i]["duration_in_traffic"]["text"] 
    }
    return results
}


//dbDict: List[<Map>]
//gDict: List[<Map>]
//params: Dict
async function mergeDbAndGApiResponse(dbDict, gDict, params) {
    var _dict = {}
    var notInDb = []
    destinations = ""
    for (let i in dbDict) {
        try {
            location = JSON.parse(dbDict[i]["geoJson"])
            lat = location["coordinates"][1]
            long = location["coordinates"][0]
            var key = `${lat},${long}`
            destinations += key +  "|"
            _dict[key] = dbDict[i]
        } catch (e) {
            _errStr = "mergeDbAndGApiResponse Warning: " + JSON.stringify(dbDict[i]) + " : " + e.toString()
            console.warn(_errStr)
        }
    }
   
    for (let j in gDict) {
        try {
            location = gDict[j]["geometry"]["location"]
            lat = location["lat"]
            long = location["lng"]
            key = `${lat},${long}`
            if (!_dict.hasOwnProperty(key)) {
                destinations += key + "|"
                notInDb.push(gDict[j])
                dbDict[key] = convertToGeoDbDataStruct( gDict, lat, long)
            }
        } catch (e) {
            _errStr = "mergeDbAndGApiResponse Warning: " + JSON.stringify(gDict[j]) + " : " + e.toString() 
            console.warn(_errStr)
        }
    }
    //destinations=> 77.6,22.5|24.5,65.6...
    destinations = destinations.slice(0, -1)
    var results = await calculateDistanceBetweenGeoPoints(`${params["lat"]},${params["long"]}`, destinations, dbDict)
    .then(response => {
        return response
    })
    .catch(
        err => {
            console.error("mergeDbAndGApiResponse Error: " + err.toString())
            return dbDict
        })
    updateDbFromGApi(notInDb)
    console.log('difference ', notInDb.length)
    return results
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

    //Get all list of hospitals from google client
    if (NODE_ENV == 'production') {//Dont want to call google api unnecessarily
        var gResults = await gapi.getHospitalsFromLocationByRadius(params)
            .then((response) => {
                return response.results
            })
            .catch((err) => {
                console.error("getHospitalsWithinRadius Error: " + err.toString())
                return []
            })
    }

    if (req.body.hasOwnProperty(["shortcut"]) && req.body["shortcut"]) {
        util.handleSuccess(res, gResults)
        return
    }

    //Get all list of hospitals from database
    var dbResults = await client.QueryWithinRadius(params)
        .then((response) => {
            return response
        })
        .catch((err) => {
            console.error("getHospitalsWithinRadius Error: " + err.toString())
            return [];
        })
    var _results = await mergeDbAndGApiResponse(dbResults, gResults, params)
    .then(response => {
        return response
    })
    .catch( err => {
        console.error("getHospitalsWithinRadius Error: " + err.toString())
        return []
    })

    util.handleSuccess(res, _results)
}

module.exports = {
    initGeoTable,
    getHospitalsWithinRadius
}