export const map = L.map('map', {
    center: [11.1271, 78.6569], 
    zoom: 7,
    dragging: true,
    worldCopyJump: false,
    zoomControl: true 
});

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap, © CartoDB'
}).addTo(map);

let markers = [];
export let drawnIcons = []; 

export function clearMarkers() {
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    drawnIcons = [];
}

export function addMarker(lat, lng, weight, popupHTML) {
    const size = Math.min(50, 24 + weight);
    const scaledIcon = L.icon({
        iconUrl: 'trashicon.png',
        iconSize: [size, size],
        iconAnchor: [size / 2, size],
        popupAnchor: [0, -size]
    });

    const marker = L.marker([lat, lng], {icon: scaledIcon})
        .addTo(map)
        .bindPopup(popupHTML);
    markers.push(marker);
    drawnIcons.push({lat, lng});
}

// Distance helper (Haversine formula) for density and anti-fraud
export function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c; 
}
