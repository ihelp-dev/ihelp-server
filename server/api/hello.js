
function hello(req,res) {
    res.send('Hello!')
}

function helloWorld(req, res) {
    res.send('Hello World!')
}

module.exports = {
    hello,
    helloWorld
}