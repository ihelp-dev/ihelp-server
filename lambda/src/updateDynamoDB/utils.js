import { S2Cell, S2LatLng } from "nodes2ts";
import cryptoJs from "crypto-js";

var generateGeohash = (lat, lng) => {
    const latLng = S2LatLng.fromDegrees(lat, lng);
    const cell = S2Cell.fromLatLng(latLng);
    return cell.id.id
}

var generateHashKey = (geohash, hashKeyLength) => {
    console.log(geohash)
    if (geohash.lessThan(0)) {
        hashKeyLength++;
    }
    const geohashString = geohash.toString(10);
    const denominator = Math.pow(10, geohashString.length - hashKeyLength);
    return geohash.divide(denominator);
}

var generateObjectId = (lat, lng) => {
    var word = lat.toString() + ":" + lng.toString()
    var hash = cryptoJs.SHA256(word).toString()
    return hash
}

var generateGeoJson = (lat, lng) => JSON.stringify({"type":"POINT","coordinates":[lng, lat]})

export { generateGeohash, generateHashKey, generateObjectId, generateGeoJson }