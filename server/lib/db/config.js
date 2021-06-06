const AWS = require('aws-sdk');
const _geoddb = require('dynamodb-geo');
const geoDdbPort = process.env.GEO_DDB_PORT || 3005;
const creds = require('../../creds.json')
const NODE_ENV = process.env.NODE_ENV || 'development'

function TableManager(tableName) {
  var _ddb
  AWS.config.update({
    region: creds.region,
    accessKeyId: creds.aws_access_key_id,
    secretAccessKey: creds.aws_secret_access_key,
  })
  if (NODE_ENV != 'production' || NODE_ENV != 'staging') {
    _ddb =   new AWS.DynamoDB({ endPoint: new AWS.Endpoint(`http://localhost:${geoDdbPort}`) });
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
 
  /*
  GeoDataManagerConfiguration config = new GeoDataManagerConfiguration(ddb, "Schools")
  .withHashKeyAttributeName("schoolHashKey")
  .withRangeKeyAttributeName("schoolId")
  .withGeohashAttributeName("schoolGeohash")
  .withGeoJsonAttributeName("schoolGeoJson")
  .withGeohashIndexName("school-geohash-index");
  */
  
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
