var express = require('express')
var cors = require('cors')
var morgan = require('morgan')
const bodyParser = require('body-parser');

var utility = require("./util/utility")
var helloController = require('./api/hello')
var hospitalController = require("./api/hospital")

var app = express()
var port = process.env.NODE_PORT || 8080

app.use(cors())
app.use(morgan('combined'))
app.use(express.json())
app.use(bodyParser.json());
app.use(bodyParser.raw());

hospitalController.initGeoTable()


//Required by ecs service
app.get('/health', (req, res) => {
  res.sendStatus(200)
})


// /api/v1
app.get(utility.getApi(""), helloController.helloWorld);

// /api/v1/hello
app.get(utility.getApi("hello"), helloController.hello);

app.post(utility.getApi("getHospitalsWithinRadius"), hospitalController.getHospitalsWithinRadius);


/*
app.get('/tstGeoDdb', (req,res) =>{
  tstGeoDdb()
  res.send('tstGeoDdb test cases')
})

app.get('/tstLocation', (req,res) => {
  tstLocation()
  console.send('location test cases')
})
*/

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
  //console.log("using env ", process.env)
})