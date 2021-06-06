# ihelp-server

External api: http://ihelp-Publi-1ASXPS8OBC7ON-1721964325.us-west-2.elb.amazonaws.com
Internal backend api: http://internal-ihelp-Priva-107I6U8Z5H03V-910592265.us-west-2.elb.amazonaws.com 
# Available Api:
/getHospitalsWithinRadius
Returns the hospital list within radius based on lat, long, radius is defined in Kms: 100,000 => 100kms
required: lat, long
optional: radius(default 50kms)

export API=http://ihelp-Publi-1ASXPS8OBC7ON-1721964325.us-west-2.elb.amazonaws.com/api/v1
curl -X POST ${API}/getHospitalsWithinRadius -H "Content-Type: application/json" -d "{\"lat\" : 27.1763098, \"long\": 77.9099723, \"radius\":100000 }"


