var express = require('express')
var cors = require('cors')
var morgan = require('morgan')

var app = express()
var port = process.env.NODE_PORT || 8080

app.use(cors())
app.use(morgan('combined'))

app.get('/api/v1/', (req, res) => {
  res.send('Hello World!')
})

//Required by ecs service
app.get('/health', (req, res) => {
  res.sendStatus(200)
})

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
})
