const map = L.map("map").setView(
    [-23.5015, -47.4526],
    13
);

L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        attribution: '&copy; OpenStreetMap contributors'
    }
).addTo(map);

map.on("click", function (event) {

    const latitude = event.latlng.lat;
    const longitude = event.latlng.lng;

    console.log("Latitude:", latitude);
    console.log("Longitude:", longitude);

});

let marcador = null;

map.on("click", function (event) {

    const latitude = event.latlng.lat;
    const longitude = event.latlng.lng;

    if(marcador){
        map.removeLayer(marcador);
    }

    marcador = L.marker([
        latitude,
        longitude
    ]).addTo(map);
});