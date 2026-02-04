let map;
let vehicleMarkers = {}; // Stores Leaflet markers for vehicles
let vesselMarkers = {};  // Stores Leaflet markers for vessels
let eventMarkers = L.layerGroup(); // Layer for event markers
let hazardZoneMarkers = L.layerGroup(); // Layer for hazard zone circles

document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM Content Loaded. Initializing map and fetching data...");
    initializeMap();
    fetchSimulationData();
    setInterval(fetchSimulationData, SIMULATION_UPDATE_INTERVAL_MS);
    
    document.getElementById('reportHazardBtn').addEventListener('click', function() {
        const description = prompt("Enter a description for the hazard (e.g., 'Pothole', 'Debris'):");
        if (description) {
            alert("Now, click on the map where the hazard is located.");
            map.once('click', function(e) {
                reportHazard(e.latlng.lat, e.latlng.lng, description);
            });
        }
    });
});

function initializeMap() {
    try {
        map = L.map('map').setView([INITIAL_LATITUDE, INITIAL_LONGITUDE], 13);
        console.log("Map initialized successfully using OpenStreetMap tiles.");

        // --- Using OpenStreetMap tiles ---
        // This tile layer does NOT require an access token.
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        eventMarkers.addTo(map);
        hazardZoneMarkers.addTo(map);
    } catch (e) {
        console.error("Error initializing map:", e);
        document.getElementById('map').innerHTML = '<div style="text-align: center; padding-top: 100px; color: red;">Error loading map. Check console for details.</div>';
    }
}

function fetchSimulationData() {
    fetch('/api/simulation_data')
        .then(response => {
            if (!response.ok) {
                console.error(`HTTP error! status: ${response.status} for /api/simulation_data`);
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            updateEntityMarkers(data.entities);
            updateEventMarkers(data.events);
            updateHazardZoneMarkers(data.hazard_zones);
            updateAlertsSidebar(data.events);
        })
        .catch(error => {
            console.error('Error fetching simulation data:', error);
            const alertsContainer = document.getElementById('alerts-container');
            alertsContainer.innerHTML = `<div style="color: red;">Error: Failed to load real-time data. ${error.message}</div>`;
        });
}

function updateEntityMarkers(entities) {
    if (!map) { console.error("Map not initialized, cannot update entity markers."); return; }
    
    entities.filter(e => e.type === 'vehicle').forEach(vehicle => {
        if (!vehicleMarkers[vehicle.id]) {
            vehicleMarkers[vehicle.id] = L.circleMarker([vehicle.latitude, vehicle.longitude], {
                radius: 6,
                color: '#3498db',
                fillColor: '#3498db',
                fillOpacity: 0.8
            }).addTo(map);
        } else {
            vehicleMarkers[vehicle.id].setLatLng([vehicle.latitude, vehicle.longitude]);
        }
        vehicleMarkers[vehicle.id].bindPopup(`<b>${vehicle.id} (Vehicle)</b><br>Speed: ${vehicle.speed_kmh.toFixed(1)} km/h<br>Heading: ${vehicle.heading_deg.toFixed(0)}°`);
    });

    entities.filter(e => e.type === 'vessel').forEach(vessel => {
        if (!vesselMarkers[vessel.id]) {
            vesselMarkers[vessel.id] = L.marker([vessel.latitude, vessel.longitude], {
                icon: L.icon({
                    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3246/3246571.png', // Small boat icon
                    iconSize: [25, 25],
                    iconAnchor: [12, 12]
                })
            }).addTo(map);
        } else {
            vesselMarkers[vessel.id].setLatLng([vessel.latitude, vessel.longitude]);
        }
        vesselMarkers[vessel.id].bindPopup(`<b>${vessel.id} (Vessel)</b><br>Speed: ${vessel.speed_kmh.toFixed(1)} km/h<br>Heading: ${vessel.heading_deg.toFixed(0)}°`);
    });
}

function updateEventMarkers(events) {
    if (!map) { console.error("Map not initialized, cannot update event markers."); return; }
    eventMarkers.clearLayers();
    events.forEach(event => {
        let iconHtml = '⚠️';
        let className = 'event-marker';

        if (event.type === 'Congestion') {
            iconHtml = '🚦';
            className += ' congestion';
        } else if (event.type === 'Accident Risk') {
            iconHtml = '💥';
            className += ' accident';
        } else if (event.type === 'Damaged Road/Hazard' || event.type === 'User Reported Hazard') {
            iconHtml = '🚧';
            className += ' hazard';
        } else if (event.type === 'Rough Weather' || event.type === 'Distress Call') {
            iconHtml = '🌊';
            className += ' maritime';
        }

        const customIcon = L.divIcon({
            className: className,
            html: iconHtml,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
        });

        L.marker([event.latitude, event.longitude], { icon: customIcon })
            .bindPopup(`<b>${event.type}</b><br>${event.description}<br>Time: ${new Date(event.timestamp * 1000).toLocaleTimeString()}`)
            .addTo(eventMarkers);
    });
}

function updateHazardZoneMarkers(zones) {
    if (!map) { console.error("Map not initialized, cannot update hazard zone markers."); return; }
    hazardZoneMarkers.clearLayers();
    zones.forEach(zone => {
        L.circle([zone.latitude, zone.longitude], {
            color: '#8e44ad',
            fillColor: '#8e44ad',
            fillOpacity: 0.2,
            radius: zone.radius_m
        }).bindPopup(`<b>Hazard Zone:</b> ${zone.name}<br>Radius: ${zone.radius_m}m`).addTo(hazardZoneMarkers);
    });
}

function updateAlertsSidebar(events) {
    const alertsContainer = document.getElementById('alerts-container');
    if (!alertsContainer) { console.error("Alerts container not found."); return; }
    alertsContainer.innerHTML = '';

    if (events.length === 0) {
        alertsContainer.innerHTML = 'No recent alerts.';
        return;
    }

    events.sort((a, b) => b.timestamp - a.timestamp);

    events.forEach(event => {
        const alertDiv = document.createElement('div');
        alertDiv.classList.add('alert-item');
        
        let typeClass = '';
        if (event.type === 'Congestion') typeClass = 'congestion';
        else if (event.type === 'Accident Risk') typeClass = 'accident';
        else if (event.type.includes('Hazard')) typeClass = 'hazard';
        else if (event.type.includes('Weather') || event.type.includes('Distress')) typeClass = 'maritime';
        
        alertDiv.classList.add(typeClass);

        alertDiv.innerHTML = `
            <strong>${event.type}:</strong> ${event.description}
            <br><small>${new Date(event.timestamp * 1000).toLocaleTimeString()}</small>
        `;
        alertsContainer.appendChild(alertDiv);
    });
}

function reportHazard(latitude, longitude, description) {
    fetch('/report_hazard', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ latitude: latitude, longitude: longitude, description: description }),
    })
    .then(response => {
        if (!response.ok) {
            console.error(`HTTP error! status: ${response.status} for /report_hazard`);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        alert(data.message);
        fetchSimulationData();
    })
    .catch((error) => {
        console.error('Error reporting hazard:', error);
        alert('Failed to report hazard. Please check browser console for details.');
    });
}