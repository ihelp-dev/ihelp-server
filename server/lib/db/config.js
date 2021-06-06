const AWS = require('aws-sdk');
const _geoddb = require('dynamodb-geo');
//prod server should run with NODE_ENV=production node app.js
const REGION = process.env.AWS_REGION || "us-west-2";
const NODE_ENV = process.env.NODE_ENV || "development";
const accessKey = process.env.AWS_ACCESS_KEY || "";
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || ""
const geoDdbPort = process.env.GEO_DDB_PORT || 3005;


function TableManager(tableName) {
  var _ddb
  AWS.config.update({
    region: REGION,
    accessKeyId: accessKey ,
    secretAccessKey: secretAccessKey
  })

  if (NODE_ENV != 'production' || NODE_ENV != 'staging') {
    _ddb =   new AWS.DynamoDB(/*{ endPoint: new AWS.Endpoint(`http://localhost:${geoDdbPort}`) }*/);
  } else { //production
    _ddb =   new AWS.DynamoDB();
  }

  const _config = new _geoddb.GeoDataManagerConfiguration(_ddb, tableName);
  _config.rangeKeyAttributeName = "objectId";
  _config.hashKeyLength = 8;
  _config.longitudeFirst = true;
  const _tableManager = new _geoddb.GeoDataManager(_config);
  const _createTableInput = _geoddb.GeoTableUtil.getCreateTableRequest(_config);
  // Tweak the schema as desired
  _createTableInput.ProvisionedThroughput.ReadCapacityUnits = 20;
  _createTableInput.ProvisionedThroughput.WriteCapacityUnits = 20;
  
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
