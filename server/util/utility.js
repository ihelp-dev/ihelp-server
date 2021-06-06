var apiVersion = "/api/v1"

function getApi(api) {
    return apiVersion + "/" + api 
}

function handleBadRequest(res, errStr) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.json({"err": errStr})
}

function handleErrorResponse(res, errStr) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.json({"err": errStr})
}

function handleSuccess(res, resStr) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.json({"msg": resStr})
}

module.exports = {
    getApi,
    handleBadRequest,
    handleErrorResponse,
    handleSuccess 
}