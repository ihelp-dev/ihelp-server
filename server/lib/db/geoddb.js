///Library functions for geo database
const { SharedIniFileCredentials } = require('aws-sdk')
const AWS = require('aws-sdk')
var cryptoJs = require('crypto-js')
const unmarshalItem = require('dynamodb-marshaler').unmarshalItem;

function GeoDdbClient(geoConfig) {
    this.config = geoConfig.config
    this.ddb = geoConfig.ddb
    this.tableManager = geoConfig.tableManager
    this.geoddb = geoConfig.geoddb
    this.createTableInput = geoConfig.createTableInput
}


async function updateTablePoint(tableManager, req) {
    await tableManager.updatePoint({
        RangeKeyValue: { S: getUniqueKey(req["lat"], req["long"]) },
        GeoPoint: { // An object specifying latitutde and longitude as plain numbers.
            latitude: req["lat"],
            longitude: req["long"]
        },
        UpdateItemInput: { // TableName and Key are filled in for you
            UpdateExpression: req.updateExpression,
            ExpressionAttributeValues: AWS.DynamoDB.Converter.marshall(req.attributes)
        }
    }).promise()
        .then(res => {
            resolve(res)
        })
        .catch(err => {
            console.error("Error: updated failed ", err)
            reject(err)
        })
}

async function insertIntoTable(tableManager, req, lat, long) {

    await tableManager.putPoint({
        RangeKeyValue: { S: getUniqueKey(lat, long) }, // Use this to ensure uniqueness of the hash/range pairs.
        GeoPoint: { // An object specifying latitutde and longitude as plain numbers. Used to build the geohash, the hashkey and geojson data
            latitude: lat,
            longitude: long,
        },
        PutItemInput: { // Passed through to the underlying DynamoDB.putItem request. TableName is filled in for you.
            Item: AWS.DynamoDB.Converter.marshall(req) // The primary key, geohash and geojson data is filled in for you
            // ... Anything else to pass through to `putItem`, eg ConditionExpression
        }
    }).promise()
        .then(res => {
            Promise.resolve(res)
        })
        .catch(err => {
            console.error("Error: Insert failed ", err)
            Promise.reject(err)
        })
}

function getUniqueKey(lat, long) {
    //create some unique key here
    //var UUID ='1@2!3$5^6&i.help<>me!' 
    //hash = crypto.createHash('md5').update(lat.toString() + long.toString() ).digest("hex")
    word = lat.toString() + ":" + long.toString()
    hash = cryptoJs.SHA256(word).toString()
    return hash
}

///Public APIs:
GeoDdbClient.prototype.TableExists = async function TableExists() {
    const params = { TableName: this.config.tableName };
    return new Promise((resolve, reject) => {
        this.ddb.describeTable(params, function (err, data) {
            if (err) {
                reject(false)
            } else {
                resolve(true)
            }
        })
    }).catch(err => {
        console.error("Describe table failed: ", err)
    })
}


GeoDdbClient.prototype.CreateTable = async function () {
    // Create the table
    const ddb = this.ddb;
    const config = this.config;
    console.log('Creating ddb table with default schema:');
    console.dir(this.createTableInput, { depth: null });
    await ddb.createTable(this.createTableInput).promise()
        // Wait for it to become ready
        .then(function () { return ddb.waitFor('tableExists', { TableName: config.tableName }).promise() })
        .then(function () { console.log('Table created: ', config.tableName, 'and ready!') });
}

GeoDdbClient.prototype.GetDefaultParams = function getDefaultParams() {
    var _req = {
        "name_english": "NA",
        "name_hindi": "NA",
        "total_beds": "NA",
        "available_beds": "NA",
        "isolation_beds": "NA",
        "oxygen_supported": "NA",
        "reserved_icu_hdu": "NA",
        "access": "NA",
        "street_address": "NA",
        "district": "NA",
        "city": "NA",
        "zip": "NA",
        "country": "NA",
        "url": "NA",
        "tag": "Hospital",
        "operational": "NA",
        "landmark": "NA",
        "created_at": Date.now().toString(),
        "updated_at": "",
    }
    return _req
}

GeoDdbClient.prototype.InsertIntoTable = async function (input) {
    //default
    if (!input.hasOwnProperty("lat") || !input.hasOwnProperty("long")) {
        console.log("InsertIntoTable: lat/long not specified", input)
    }

    _req = this.GetDefaultParams()

    for (const [key, value] of Object.entries(_req)) {
        if (input.hasOwnProperty(key)) {
            _req[key] = input[key]
        }
    }

    insertIntoTable(this.tableManager, _req, input["lat"], input["long"])

}

GeoDdbClient.prototype.UpdateTable = function UpdateTable(input) {
    var updateExpression = "SET "
    var attr = {}
    var _req = {}
    for (const [key, value] of Object.entries(input)) {
        if (key == "lat" || key == "long") {
            continue
        }
        updateExpression += `${key}= :new_${key}, `
        attr[`:new_${key}`] = `${value}`
    }
    _req["lat"] = input["lat"]
    _req["long"] = input["long"]
    updateExpression += `updated_at= :new_updated_at`
    attr[`:new_updated_at`] = Date.now().toString()
    _req["updateExpression"] = updateExpression
    _req["attributes"] = attr
    console.log(updateExpression)
    console.log(attr)
    updateTablePoint(this.tableManager, _req)
}

GeoDdbClient.prototype.QueryWithinRadius = async function(req) {
    const tableManager = this.tableManager
    var result = await tableManager.queryRadius({
        RadiusInMeter: req["radius"],
        CenterPoint: {
            latitude: req["lat"],
            longitude: req["long"]
        }
    })
    return result.map(unmarshalItem);
}

GeoDdbClient.prototype.ListTables = async function () {
    const ddb = this.ddb
    await ddb.listTables(function (err, data) {
        if (err) {
            console.log("ListTable: Error listing tables ", err)
        }
        if (data) {
            console.log("ListTable: Listing Tables ", data)
        }

    }).promise()
}

GeoDdbClient.prototype.DeleteTable = async function () {
    const ddb = this.ddb
    const config = this.config
    const params = {
        TableName: config.tableName
    }
    await ddb.deleteTable(params, function (err, data) {
        if (err) {
            console.log("DeleteTable: Error deleting tables ", err)
        }
        if (data) {
            console.log("Deleted Table: ", data)
        }
    })
}

GeoDdbClient.prototype.QueryTable = async function () {
    const ddb = this.ddb
    const config = this.config
    const params = {
        TableName: config.tableName
    }
    const res = await ddb.scan(params, function (err, data) {
        if (err) {
            console.log("QueryTable: Error querying table ", err)
        }
        if (data) {
            console.log("QueryTable: ", JSON.stringify(data))
        }
    })

}

module.exports = GeoDdbClient;

