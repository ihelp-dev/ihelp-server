# ihelp-server

External api: http://ihelp-Publi-1ASXPS8OBC7ON-1721964325.us-west-2.elb.amazonaws.com
Internal backend api: http://internal-ihelp-Priva-107I6U8Z5H03V-910592265.us-west-2.elb.amazonaws.com 

# Available Api:
/getHospitalsWithinRadius
Returns the hospital list within radius based on lat, long, radius is defined in Kms: 100,000 => 100kms
required: lat, long
optional: radius(default 50kms)


# Test


# Create and run the docker test locally
You must have ~/.aws/credentials file setup with profile name "covid":
Copy/Paste below to ~/.aws/credentials

[covid]
region=us-west-2
aws_access_key_id=234343343
aws_secret_access_key=23434233424

make docker_local

//if there is error with downloading node image try to run:
make login_ecs

curl -X POST http://localhost:8080/getHospitalsWithinRadius -H "Content-Type: application/json" -d "{\"lat\" : 27.1763098, \"long\": 77.9099723, \"radius\":100000 }"

or run against production server:
curl -i -X POST -H "Content-Type: application/json" -d "{\"lat\" : 27.1763098, \"long\": 77.9099723, \"radius\":100000 }" http://ihelp-publi-1asxps8obc7on-1721964325.us-west-2.elb.amazonaws.com/api/v1/getHospitalsWithinRadius


# Lambdas
	Create a new folder "helloworld"
	If need to init package, use "npm init --yes" to initialize module(If doesn't want to use default module use: npm --init and follow prompts)
	Make sure to have dependencies listed as part of package.json(use npm install package-name --save-prod)
	Only use libraries which are required (there is a hard size limit on lambda function code)
	Add lambda cloudformation code to: lambda/cfn.yaml, follow HelloWorld example
	Specify Code property which the folder name and handler, eg. Code: src/helloworld/. and Handler: hello.HelloWorldHanlder
	