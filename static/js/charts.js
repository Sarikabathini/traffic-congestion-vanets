let eventTypeChart;
let recentEventsChart;

document.addEventListener('DOMContentLoaded', function() {
    console.log("Charts JS loaded. Initializing charts...");
    initializeCharts();
    fetchChartData();
    setInterval(fetchChartData, SIMULATION_UPDATE_INTERVAL_MS * 2); 
});

function initializeCharts() {
    const eventTypeCtx = document.getElementById('eventTypeChart');
    if (!eventTypeCtx) { console.error("eventTypeChart canvas not found."); return; }
    
    eventTypeChart = new Chart(eventTypeCtx.getContext('2d'), {
        type: 'pie',
        data: {
            labels: [],
            datasets: [{
                label: 'Event Types',
                data: [],
                backgroundColor: [
                    'rgba(231, 76, 60, 0.7)',  // Accident Risk
                    'rgba(243, 156, 18, 0.7)', // Congestion
                    'rgba(142, 68, 173, 0.7)', // Damaged Road/Hazard
                    'rgba(22, 160, 133, 0.7)', // Rough Weather
                    'rgba(52, 152, 219, 0.7)', // Distress Call
                    'rgba(46, 204, 113, 0.7)', // User Reported Hazard
                    'rgba(189, 195, 199, 0.7)' // Fallback Grey
                ],
                borderColor: [
                    'rgba(231, 76, 60, 1)',
                    'rgba(243, 156, 18, 1)',
                    'rgba(142, 68, 173, 1)',
                    'rgba(22, 160, 133, 1)',
                    'rgba(52, 152, 219, 1)',
                    'rgba(46, 204, 113, 1)',
                    'rgba(189, 195, 199, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Distribution of Event Types'
                }
            }
        }
    });
    console.log("eventTypeChart initialized.");

    const recentEventsCtx = document.getElementById('recentEventsChart');
    if (!recentEventsCtx) { console.error("recentEventsChart canvas not found."); return; }

    recentEventsChart = new Chart(recentEventsCtx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Number of Recent Events',
                data: [],
                backgroundColor: 'rgba(52, 152, 219, 0.6)',
                borderColor: 'rgba(52, 152, 219, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    beginAtZero: true
                },
                y: {
                    beginAtZero: true,
                    stepSize: 1
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Recent Event Frequency by Type'
                }
            }
        }
    });
    console.log("recentEventsChart initialized.");
}

function fetchChartData() {
    // Fetch event counts for the pie chart
    fetch('/api/event_counts')
        .then(response => {
            if (!response.ok) {
                console.error(`HTTP error! status: ${response.status} for /api/event_counts`);
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            const labels = data.map(item => item.event_type);
            const counts = data.map(item => item.count);
            
            eventTypeChart.data.labels = labels;
            eventTypeChart.data.datasets[0].data = counts;
            eventTypeChart.update();
        })
        .catch(error => console.error('Error fetching event counts for pie chart:', error));

    // Fetch recent events (last 50) for the bar chart
    fetch('/api/events')
        .then(response => {
            if (!response.ok) {
                console.error(`HTTP error! status: ${response.status} for /api/events`);
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            const eventTypeCounts = {};
            data.forEach(event => {
                eventTypeCounts[event.event_type] = (eventTypeCounts[event.event_type] || 0) + 1;
            });

            const labels = Object.keys(eventTypeCounts);
            const counts = Object.values(eventTypeCounts);

            recentEventsChart.data.labels = labels;
            recentEventsChart.data.datasets[0].data = counts;
            recentEventsChart.update();
        })
        .catch(error => console.error('Error fetching recent events for bar chart:', error));
}