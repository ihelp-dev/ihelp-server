const AWS = require("aws-sdk");
const { response } = require("express")
const ilib = require("ihelp-lib")
const e = require("express")
const NODE_ENV = process.env.NODE_ENV || "development";
const geoDdbPort = process.env.GEO_DDB_PORT || 3005;
var PLACES_RADIUS = 50000; //50kms
const TST_DB_NAME = "TST_INDIA_HOSPITAL_LIST"
const DB_NAME = "INDIA_HOSPITAL_LIST"
let client = null;

function initGeoTable() {
    if (NODE_ENV == 'production') {
        client = ilib.InitDefaultConfigGeoTable(DB_NAME)
        
    } else {
       client = ilib.InitDefaultConfigGeoTable(TST_DB_NAME) 
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

//gapiResp = [dictOfgapiR1, dictOfgapiR2 ]
//Destinations: String ie lat1,long1|lat2,long2 eg 22.22,33.33|1.1,2.2|45.4,66.6
//dbDict: List[Map1, Map2]
function embedGapiResponseIntoDbDict(destinations, dbDict, gapiResp) {
    if (!gapiResp.hasOwnProperty("data")
        || !gapiResp["data"].hasOwnProperty("rows")
        || gapiResp["data"]["rows"].length == 0
        || !gapiResp["data"]["rows"][0].hasOwnProperty("elements"))
    {
        console.warn("getDistanceBetweenLatLong Warning: Distances returned from gapi doesn't have valid attributes")
        return
    }
    var elements = gapiResp["data"]["rows"][0]["elements"]

    //Destinations = 77.33,66.1|55.5,44.4|11.2,33.1
    _arr = destinations.split("|")

    for ( var i in dbDict) {
        try {
            location = JSON.parse(dbDict[i]["geoJson"])
            lat = location["coordinates"][1]
            long = location["coordinates"][0]
            key = `${lat},${long}`
            idx = _arr.indexOf(key)
            if ( idx == -1 ) {
                continue;
            }
            dbDict[i]["distance"] = elements[idx]["distance"]["text"]
            dbDict[i]["duration"] = elements[idx]["duration"]["text"]
            dbDict[i]["duration_in_traffic"] = elements[idx]["duration_in_traffic"]["text"]
       } catch(err) {
            errStr = "getDistanceBetweenLatLong Warning: " + JSON.stringify(dbDict[i]) + " : " + err.toString()
            console.warn(errStr)
       }
    }
}

function sortListOfDictByDistance(listOfDict) {
    listOfDict.sort(function(x,y) {
        if (!x.hasOwnProperty("distance") && !y.hasOwnProperty("distance")) {
            return true
        }
        if (!x.hasOwnProperty("distance")) {
            return false
        }
        if (!y.hasOwnProperty("distance")) {
            return true
        }
        xDistance = parseInt((x["distance"].split(" "))[0], 10)
        yDistance = parseInt((y["distance"].split(" "))[0], 10)
        return xDistance - yDistance
    })
}

//dbDict: List[<Map>]
//gDict: List[<Map>]
//params: Dict
async function mergeDbAndGApiResponse(dbDict, gDict, params) {
    var _dict = {}
    var notInDb = []
    destinations = []
    for (let i in dbDict) {
        try {
            location = JSON.parse(dbDict[i]["geoJson"])
            lat = location["coordinates"][1]
            long = location["coordinates"][0]
            var key = `${lat},${long}`
            destinations.push(key)
            _dict[key] = dbDict[i]
        } catch (err) {
            _errStr = "mergeDbAndGApiResponse Warning: " + JSON.stringify(dbDict[i]) + " : " + err.toString()
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
                destinations.push(key)
                notInDb.push(gDict[j])
                dbDict[key] = convertToGeoDbDataStruct( gDict, lat, long)
            }
        } catch (err) {
            _errStr = "mergeDbAndGApiResponse Warning: " + JSON.stringify(gDict[j]) + " : " + err.toString() 
            console.warn(_errStr)
        }
    }
    //Call google api and get the distances from origin to destinations
    //Gapi can only process max 25 destinations at a time
    let destinationsStrList = []
    //destinationStr=> ["77.6,22.5|24.5,65.6...", "88.899.7|11.1,22.2..." ...]
    let start = 0
    for ( let end = 1; end < destinations.length; end++ ) {
        if ( end % 24 == 0) {
            let items = destinations.slice(start,end)
            destinationsStrList.push(items.join("|"))
            start = end
        }
    }
    //process remaining destination items
    let remainingItems = destinations.slice(start, destinations.length)
    if (remainingItems.length != 0 ) {
        destinationsStrList.push(remainingItems.join("|"))
    }
    let origin = `${params["lat"]},${params["long"]}`
    const destinationPromises = []
    destinationsStrList.map(dest => {
        destinationPromises.push(ilib.gapi.getDistanceBetweenLatLong(origin, dest))
    })
    let promiseResults = await Promise.allSettled(destinationPromises)
    //embed durations in dbDict
    for ( var i = 0; i < promiseResults.length; i++) {
        embedGapiResponseIntoDbDict(destinationsStrList[i], dbDict, promiseResults[i].value)
    }
    sortListOfDictByDistance(dbDict)
    updateDbFromGApi(notInDb)
    //TODO: Push difference metrics to cloudwatch metrics
    console.log('difference ', notInDb.length)
    return dbDict
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
        ilib.util.handleBadRequest(res, err.LAT_IS_MISSING)
        return;
    }
    if (!req.body.hasOwnProperty(["long"])) {
        ilib.util.handleBadRequest(res, err.LONG_IS_MISSING)
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
        var gResults = await ilib.gapi.getHospitalsFromLocationByRadius(params)
            .then((response) => {
                return response.results
            })
            .catch((err) => {
                console.error("getHospitalsWithinRadius Error: " + err.toString())
                return []
            })
    }

    if (req.body.hasOwnProperty(["shortcut"]) && req.body["shortcut"]) {
        ilib.util.handleSuccess(res, gResults)
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

    ilib.util.handleSuccess(res, _results)
}

module.exports = {
    initGeoTable,
    getHospitalsWithinRadius
}