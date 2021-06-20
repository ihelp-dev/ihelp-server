const helloWorld = ( name, data, callback ) => {
	console.log("hello world reached");
	console.log("name: " + name);
	console.log("data: " + data);
	data = JSON.parse(data);
	//do something and send response
	sendResponse(200, "Hello World: " + name, callback)
}

function sendResponse (statusCode, message, callback) {
	const res =  {
		statusCode: statusCode,
		body: JSON.stringify(message)
	};
	callback(null, res);
};

exports.HelloWorldHandler = (event, context, callback) => {
	helloWorld(event.pathParameters.name, event.body, callback);
    };