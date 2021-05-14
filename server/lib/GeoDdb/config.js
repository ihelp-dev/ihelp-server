const AWS = require('aws-sdk');
const _geoddb = require('dynamodb-geo');
//prod server should run with NODE_ENV=production node app.js
const REGION = process.env.AWS_REGION || "us-west-2";
const ENV = process.env.NODE_ENV || "development";
const accessKey = process.env.AWS_ACCESS_KEY || "";
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || ""
const geoDdbPort = process.env.GEO_DDB_PORT || 3005; 
var _ddb;




function TableManager(tableName) {
  var ddbConfig = {}
  var awsConfig = {
    region: REGION,
  };
  AWS.config.update(awsConfig);

  if (ENV == 'development') {
    console.log("using env ", process.env)
    ddbConfig = {
      //endPoint: `http://localhost:${geoDdbPort}`
    }
    AWS.config.update({
      region: REGION,
      secretAccessKey: secretAccessKey,
      accessKeyId: accessKey
    })
  }

  _ddb =   new AWS.DynamoDB(ddbConfig);
  
  const _config = new _geoddb.GeoDataManagerConfiguration(_ddb, tableName);
  _config.rangeKeyAttributeName = "objectId";
  _config.hashKeyLength = 5;
  _config.longitudeFirst = true;
  const _tableManager = new _geoddb.GeoDataManager(_config);
  const _createTableInput = _geoddb.GeoTableUtil.getCreateTableRequest(_config);
  // Tweak the schema as desired
  _createTableInput.ProvisionedThroughput.ReadCapacityUnits = 5;
  
  
  //_tableManager.proto
  _geoddb.GeoDataManager.prototype.createTable = (createTableInput) => {
    return _ddb.createTable(createTableInput).promise();
    
  }

  return { 
    tableManager: _tableManager, 
    ddb: _ddb, 
    geoddb: _geoddb, 
    config: _config,
    createTableInput: _createTableInput,
  };
}

module.exports = TableManager
