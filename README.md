# ihelp-server

External api: http://ihelp-Publi-1ASXPS8OBC7ON-1721964325.us-west-2.elb.amazonaws.com
Internal backend api: http://internal-ihelp-Priva-107I6U8Z5H03V-910592265.us-west-2.elb.amazonaws.com 

# Available Api:
/getHospitalsWithinRadius
Returns the hospital list within radius based on lat, long, radius is defined in Kms: 100,000 => 100kms
required: lat, long
optional: radius(default 50kms)


# Test
1. Create and run the docker test locally: 
   make docker_local

export API=http://ihelp-Publi-1ASXPS8OBC7ON-1721964325.us-west-2.elb.amazonaws.com/api/v1

curl -X POST http://localhost:8080/getHospitalsWithinRadius -H "Content-Type: application/json" -d "{\"lat\" : 27.1763098, \"long\": 77.9099723, \"radius\":100000 }"


