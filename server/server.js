var express = require('express')
var cors = require('cors')
var morgan = require('morgan')

var app = express()
var port = process.env.NODE_PORT || 8081

app.use(cors())
app.use(morgan('combined'))

app.get('/', (req, res) => {
  res.send('Hello World!')
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
