let map;
let vehicleMarkers = {};
let vesselMarkers = {};
let eventMarkers = {}; // To manage temporary event markers
let hazardZoneMarkers = {};

let eventChart; // Chart.js instance

// Initialize the map
function initializeMap() {
    map = L.map('map').setView([17.9689, 79.5940], 13); // Centered around Hanamkonda
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Custom icons
    vehicleIcon = L.icon({
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/1047/1047711.png', // Car icon
        iconSize: [25, 25],
        iconAnchor: [12, 12],
        popupAnchor: [0, -10]
    });

    vesselIcon = L.icon({
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/1217/1217036.png', // Ship icon
        iconSize: [25, 25],
        iconAnchor: [12, 12],
        popupAnchor: [0, -10]
    });

    congestionIcon = L.icon({
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/575/575306.png', // Traffic jam icon
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });

    accidentIcon = L.icon({
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/1000/1000965.png', // Accident icon
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });

    hazardIcon = L.icon({
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/2908/2908233.png', // Hazard sign
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });

    weatherIcon = L.icon({
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/2864/2864817.png', // Stormy weather
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });

    distressIcon = L.icon({
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/820/820464.png', // SOS icon
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });
}

// Update vehicle/vessel markers
function updateMarkers(data) {
    // Update vehicles
    data.vehicles.forEach(vehicle => {
        if (vehicleMarkers[vehicle.id]) {
            vehicleMarkers[vehicle.id].setLatLng([vehicle.latitude, vehicle.longitude]);
            vehicleMarkers[vehicle.id].setPopupContent(`<b>Vehicle ID: ${vehicle.id}</b><br>Speed: ${vehicle.speed.toFixed(1)} km/h<br>Heading: ${vehicle.heading.toFixed(0)}°`);
        } else {
            const marker = L.marker([vehicle.latitude, vehicle.longitude], { icon: vehicleIcon }).addTo(map);
            marker.bindPopup(`<b>Vehicle ID: ${vehicle.id}</b><br>Speed: ${vehicle.speed.toFixed(1)} km/h<br>Heading: ${vehicle.heading.toFixed(0)}°`);
            vehicleMarkers[vehicle.id] = marker;
        }
    });

    // Remove old vehicle markers
    Object.keys(vehicleMarkers).forEach(id => {
        if (!data.vehicles.some(v => v.id == id)) {
            map.removeLayer(vehicleMarkers[id]);
            delete vehicleMarkers[id];
        }
    });

    // Update vessels
    data.vessels.forEach(vessel => {
        if (vesselMarkers[vessel.id]) {
            vesselMarkers[vessel.id].setLatLng([vessel.latitude, vessel.longitude]);
            vesselMarkers[vessel.id].setPopupContent(`<b>Vessel ID: ${vessel.id}</b><br>Speed: ${vessel.speed.toFixed(1)} knots<br>Heading: ${vessel.heading.toFixed(0)}°`);
        } else {
            const marker = L.marker([vessel.latitude, vessel.longitude], { icon: vesselIcon }).addTo(map);
            marker.bindPopup(`<b>Vessel ID: ${vessel.id}</b><br>Speed: ${vessel.speed.toFixed(1)} knots<br>Heading: ${vessel.heading.toFixed(0)}°`);
            vesselMarkers[vessel.id] = marker;
        }
    });

    // Remove old vessel markers
    Object.keys(vesselMarkers).forEach(id => {
        if (!data.vessels.some(v => v.id == id)) {
            map.removeLayer(vesselMarkers[id]);
            delete vesselMarkers[id];
        }
    });
}

// Display hazard zones
function displayHazardZones(hazardZones) {
    hazardZones.forEach(zone => {
        if (!hazardZoneMarkers[zone.id]) {
            const circle = L.circle([zone.latitude, zone.longitude], {
                color: 'red',
                fillColor: '#f03',
                fillOpacity: 0.2,
                radius: zone.radius
            }).addTo(map);
            circle.bindPopup(`<b>Hazard Zone: ${zone.name}</b><br>Radius: ${zone.radius}m`);
            hazardZoneMarkers[zone.id] = circle;
        }
    });
}


// Update event list and markers
function updateEvents(events) {
    const eventList = document.getElementById('event-list');
    eventList.innerHTML = ''; // Clear previous events

    // Clear old temporary event markers
    Object.values(eventMarkers).forEach(marker => map.removeLayer(marker));
    eventMarkers = {};

    events.forEach(event => {
        const li = document.createElement('li');
        li.className = `type-${event.type.replace('_', '-')}`; // For CSS styling
        const timestamp = new Date(event.timestamp).toLocaleTimeString();
        li.innerHTML = `<strong>${event.type.replace(/_/g, ' ').toUpperCase()}</strong><br>${event.description} <br> <small>${timestamp}</small>`;
        eventList.prepend(li); // Add new events to the top

        // Add a marker for the event if it has a location
        if (event.latitude && event.longitude) {
            let icon;
            switch (event.type) {
                case 'congestion': icon = congestionIcon; break;
                case 'accident_risk': icon = accidentIcon; break;
                case 'damaged_road': icon = hazardIcon; break;
                case 'rough_weather': icon = weatherIcon; break;
                case 'distress_call': icon = distressIcon; break;
                default: icon = L.divIcon({className: 'custom-div-icon', html: '!', iconSize: [20,20]}); break;
            }
            const marker = L.marker([event.latitude, event.longitude], { icon: icon }).addTo(map);
            marker.bindPopup(`<b>${event.type.replace(/_/g, ' ').toUpperCase()}</b><br>${event.description}<br><small>${timestamp}</small>`);
            // Assign a unique ID for the marker to manage its lifecycle
            eventMarkers[event.id] = marker; 
        }
    });
}


// Update statistics chart
function updateChart(summaryData) {
    const labels = summaryData.map(item => item.type.replace(/_/g, ' ').toUpperCase());
    const data = summaryData.map(item => item.count);
    const backgroundColors = [
        'rgba(255, 99, 132, 0.6)', // accident_risk (red)
        'rgba(54, 162, 235, 0.6)', // damaged_road (blue)
        'rgba(255, 206, 86, 0.6)', // congestion (yellow)
        'rgba(75, 192, 192, 0.6)', // rough_weather (teal)
        'rgba(153, 102, 255, 0.6)',// distress_call (purple)
        'rgba(255, 159, 64, 0.6)'  // other (orange)
    ];

    const chartData = {
        labels: labels,
        datasets: [{
            label: 'Number of Events (Last 24h)',
            data: data,
            backgroundColor: backgroundColors,
            borderColor: backgroundColors.map(color => color.replace('0.6', '1')), // Darker border
            borderWidth: 1
        }]
    };

    if (!eventChart) {
        const ctx = document.getElementById('eventChart').getContext('2d');
        eventChart = new Chart(ctx, {
            type: 'bar',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) { if (value % 1 === 0) { return value; } }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    } else {
        eventChart.data = chartData;
        eventChart.update();
    }
}

// Fetch data from Flask API
async function fetchData() {
    try {
        const [simDataResponse, summaryDataResponse] = await Promise.all([
            fetch('/api/update_simulation'),
            fetch('/api/events_summary')
        ]);

        const simData = await simDataResponse.json();
        const summaryData = await summaryDataResponse.json();

        // Update counts in header
        document.getElementById('vehicle-count').textContent = `Vehicles: ${simData.vehicles.length}`;
        document.getElementById('vessel-count').textContent = `Vessels: ${simData.vessels.length}`;
        document.getElementById('event-count').textContent = `Events: ${simData.events.length}`;
        document.getElementById('current-time').textContent = new Date().toLocaleTimeString();

        updateMarkers(simData);
        updateEvents(simData.events);
        displayHazardZones(simData.hazard_zones);
        updateChart(summaryData);

    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

// Initial setup
document.addEventListener('DOMContentLoaded', () => {
    initializeMap();
    fetchData(); // Fetch immediately on load
    setInterval(fetchData, UPDATE_INTERVAL_MS); // Then poll every UPDATE_INTERVAL_MS
});