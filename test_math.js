const zoom = 5;
const lat = 22.5;
const mpp = (40075016 * Math.cos(lat * Math.PI / 180)) / Math.pow(2, zoom + 8);
console.log("mpp at zoom 5:", mpp);
console.log("25000 meters in pixels at zoom 5:", 25000 / mpp);
