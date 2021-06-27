import { DynamoDB } from "@aws-sdk/client-dynamodb"
import axios from "axios"
import { generateGeohash, generateHashKey, generateObjectId, generateGeoJson } from "./utils.js"

const GOOGLE_API_KEY = "YOUR_GOOGLE_API_KEY"

(async () => {
	const client = new DynamoDB({ region: "us-west-2" });
	try {
	const results = await client.listTables({});
	console.log(results.TableNames.join("\n"));
	} catch (err) {
	console.error(err);
	}
	axios.get("https://coviddelhi.com/data/coviddelhi.com/bed_data.json?_=c930471_20210530085318")
	.then(async (res) => {
		for (var record of res.data) {
			try {
				var hospitalAddress = record["hospital_address"]
				var hospitalName = record["hospital_name"]
				var response = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json?address=${hospitalAddress}&key=${GOOGLE_API_KEY}`)
				var result = response.data.results[0]
				var location = result["geometry"]["location"]
				var lat = location["lat"]
				var lng = location["lng"]
				var geohash = generateGeohash(lat, lng)
				var hashKey = generateHashKey(geohash, 8).toString(10)
				var objectId = generateObjectId(lat, lng)
				console.log(hashKey, objectId)
				
				var TableName = "INDIA_HOSPITAL_LIST"
				console.log(generateGeoJson(lat, lng))
				client.updateItem({
					TableName,
					Key:{'hashKey':{'N':hashKey}, 'objectId': {'S':objectId}},
					ExpressionAttributeValues:{
						':g': {'S': generateGeoJson(lat, lng)}, 
						':f': {'S': hospitalName},
						':h': {'S': Date.now().toString()}
					},
					UpdateExpression:'SET geoJson = :g, name_english = :f, created_at = :h'
				})
				.then(console.log)
			}
			catch (e) {
				console.log(e)
			}
		}
	})

})();

