from flask import Flask, render_template, request, jsonify, g
import sqlite3
import time
import math
import random
from datetime import datetime, timedelta
from config import Config
from database import get_db, close_db, init_app # Make sure init_db is imported too, although we'll use it inline here

app = Flask(__name__)
app.config.from_object(Config)

# Apply teardown for database connection
init_app(app) # Call this once to register the teardown handler

# --- Database Initialization Logic ---
# This block runs when the Flask app starts.
# It ensures tables are created if they don't exist and populates initial data.
with app.app_context():
    db = get_db()
    cursor = db.cursor()
    try:
        # Attempt to select from a table to check if it exists and is accessible
        cursor.execute("SELECT 1 FROM vehicles LIMIT 1;")
        print("Database tables (vehicles) already exist.")
    except sqlite3.OperationalError:
        # If 'vehicles' table doesn't exist, execute the schema to create all tables
        print("Database tables not found. Initializing database from schema.sql...")
        with app.open_resource('schema.sql') as f:
            db.executescript(f.read().decode('utf8'))
        db.commit()
        print("Database initialized successfully.")

        # Populate initial vehicles after schema creation
        print(f"Populating {Config.NUM_VEHICLES} vehicles and {Config.NUM_VESSELS} vessels...")
        for i in range(Config.NUM_VEHICLES):
            lat = random.uniform(17.95, 18.00) # Hanamkonda general area
            lon = random.uniform(79.58, 79.62)
            speed = random.uniform(20, 60)
            heading = random.uniform(0, 360)
            db.execute("INSERT INTO vehicles (latitude, longitude, speed, heading) VALUES (?, ?, ?, ?)",
                       (lat, lon, speed, heading))
        
        # Initial vessels (simulated in a nearby "maritime" area)
        for i in range(Config.NUM_VESSELS):
            lat = random.uniform(17.80, 17.85) # South of Hanamkonda, conceptual sea
            lon = random.uniform(79.70, 79.75)
            speed = random.uniform(5, 20)
            heading = random.uniform(0, 360)
            db.execute("INSERT INTO vessels (latitude, longitude, speed, heading) VALUES (?, ?, ?, ?)",
                       (lat, lon, speed, heading))
        db.commit()
        print("Initial vehicles and vessels added.")
    except Exception as e:
        print(f"An unexpected error occurred during database initialization: {e}")

# --- Rest of your app.py remains the same ---

# Helper function to calculate distance between two lat/lon points (Haversine formula)
def calculate_distance(lat1, lon1, lat2, lon2):
    R = 6371000  # Radius of Earth in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    distance = R * c
    return distance

# ALGORITHMS IMPLEMENTATION

def simulate_movement(current_lat, current_lon, speed_kmh, heading_deg, time_step_s=1):
    speed_mps = speed_kmh / 3.6
    distance_moved_m = speed_mps * time_step_s

    # Earth's radius for calculating degree changes
    R_earth_m = 6371000
    
    # Convert heading to radians
    heading_rad = math.radians(heading_deg)

    # Calculate change in latitude and longitude
    delta_lat = (distance_moved_m * math.cos(heading_rad)) / R_earth_m * (180 / math.pi)
    # The longitudinal distance represented by one degree of longitude varies with latitude
    delta_lon = (distance_moved_m * math.sin(heading_rad)) / (R_earth_m * math.cos(math.radians(current_lat))) * (180 / math.pi)
    
    new_lat = current_lat + delta_lat
    new_lon = current_lon + delta_lon
    
    # Apply boundary conditions or "wrap around" if needed, or simply constrain to a region
    # For now, let's keep it simple and just update
    
    # Add small random perturbation to speed and heading
    new_speed = max(0, speed_kmh + random.uniform(-2, 2)) # max 0 to prevent negative speed
    new_heading = (heading_deg + random.uniform(-10, 10)) % 360 # Wrap around 0-360

    return new_lat, new_lon, new_speed, new_heading

def detect_accident_risk(vehicles, vessels):
    accident_risks = []
    entities = list(vehicles) + list(vessels) # Combine for V2V and V2V (maritime)
    
    for i in range(len(entities)):
        for j in range(i + 1, len(entities)):
            entity_a = entities[i]
            entity_b = entities[j]

            distance = calculate_distance(entity_a['latitude'], entity_a['longitude'],
                                          entity_b['latitude'], entity_b['longitude'])
            speed_difference = abs(entity_a['speed'] - entity_b['speed'])

            if distance < Config.ACCIDENT_RISK_PROXIMITY_M and \
               speed_difference > Config.ACCIDENT_RISK_SPEED_DIFFERENCE_KMH:
                mid_lat = (entity_a['latitude'] + entity_b['latitude']) / 2
                mid_lon = (entity_a['longitude'] + entity_b['longitude']) / 2
                description = f"Potential collision between {entity_a['id']} and {entity_b['id']}"
                involved_ids = f"{entity_a['id']},{entity_b['id']}" # Store IDs
                accident_risks.append({
                    'type': 'accident_risk',
                    'description': description,
                    'latitude': mid_lat,
                    'longitude': mid_lon,
                    'involved_entities': involved_ids
                })
    return accident_risks

def detect_congestion(vehicles):
    congestion_events = []
    if not vehicles:
        return congestion_events

    # Simplified congestion: Check vehicle density within the overall simulation area
    num_vehicles = len(vehicles)
    # We assume a square simulation area, so area = size^2
    simulation_area_sqkm = Config.SIMULATION_AREA_SIZE_KM * Config.SIMULATION_AREA_SIZE_KM
    current_density = num_vehicles / simulation_area_sqkm if simulation_area_sqkm > 0 else 0

    if current_density > Config.CONGESTION_THRESHOLD_DENSITY:
        # Approximate center of the simulation area
        center_lat = (17.95 + 18.00) / 2 # Hanamkonda general area from vehicle init
        center_lon = (79.58 + 79.62) / 2
        description = f"High traffic congestion detected. Density: {current_density:.2f} vehicles/sqkm"
        congestion_events.append({
            'type': 'congestion',
            'description': description,
            'latitude': center_lat,
            'longitude': center_lon,
            'entity_id': None
        })
    return congestion_events

def detect_damaged_road_alerts(vehicles, hazard_zones):
    hazard_alerts = []
    for vehicle in vehicles:
        for zone in hazard_zones:
            distance = calculate_distance(vehicle['latitude'], vehicle['longitude'],
                                          zone['latitude'], zone['longitude'])
            if distance < zone['radius']:
                description = f"Vehicle {vehicle['id']} approaching/in {zone['name']}"
                hazard_alerts.append({
                    'type': 'damaged_road',
                    'description': description,
                    'latitude': zone['latitude'], # Alert location is the hazard zone
                    'longitude': zone['longitude'],
                    'entity_id': vehicle['id']
                })
    return hazard_alerts

def detect_maritime_alerts(vessels):
    maritime_alerts = []
    for vessel in vessels:
        # Rough weather simulation: low speed for a vessel in open water
        # We're simplifying "open water" by checking if it's not near the initial conceptual shore
        if vessel['speed'] < Config.ROUGH_WEATHER_THRESHOLD_SPEED_KMH and \
           calculate_distance(vessel['latitude'], vessel['longitude'], 17.80, 79.70) > 1000: # Example 'shore' point
            description = f"Vessel {vessel['id']} potentially in rough weather (low speed)."
            maritime_alerts.append({
                'type': 'rough_weather',
                'description': description,
                'latitude': vessel['latitude'],
                'longitude': vessel['longitude'],
                'entity_id': vessel['id']
            })

        # Distress call simulation: random chance
        if random.random() < Config.DISTRESS_CALL_PROBABILITY:
            description = f"Vessel {vessel['id']} sending distress call!"
            maritime_alerts.append({
                'type': 'distress_call',
                'description': description,
                'latitude': vessel['latitude'],
                'longitude': vessel['longitude'],
                'entity_id': vessel['id']
            })
    return maritime_alerts

# Flask Routes
@app.route('/')
def index():
    return render_template('index.html', update_interval=Config.UPDATE_INTERVAL_MS)

@app.route('/api/update_simulation', methods=['GET'])
def update_simulation():
    db = get_db()
    cursor = db.cursor()
    all_events = []

    # 1. Update Vehicle Movements and get current state
    cursor.execute("SELECT id, latitude, longitude, speed, heading FROM vehicles")
    vehicles = cursor.fetchall()
    updated_vehicles_data = []
    for vehicle in vehicles:
        new_lat, new_lon, new_speed, new_heading = simulate_movement(
            vehicle['latitude'], vehicle['longitude'], vehicle['speed'], vehicle['heading']
        )
        updated_vehicles_data.append((new_lat, new_lon, new_speed, new_heading, vehicle['id']))
    
    cursor.executemany("UPDATE vehicles SET latitude = ?, longitude = ?, speed = ?, heading = ?, last_updated = CURRENT_TIMESTAMP WHERE id = ?", updated_vehicles_data)
    db.commit()

    # Refresh vehicles after update for analysis
    cursor.execute("SELECT id, latitude, longitude, speed, heading FROM vehicles")
    vehicles = cursor.fetchall()

    # 2. Update Vessel Movements and get current state
    cursor.execute("SELECT id, latitude, longitude, speed, heading FROM vessels")
    vessels = cursor.fetchall()
    updated_vessels_data = []
    for vessel in vessels:
        new_lat, new_lon, new_speed, new_heading = simulate_movement(
            vessel['latitude'], vessel['longitude'], vessel['speed'], vessel['heading']
        )
        updated_vessels_data.append((new_lat, new_lon, new_speed, new_heading, vessel['id']))
    
    cursor.executemany("UPDATE vessels SET latitude = ?, longitude = ?, speed = ?, heading = ?, last_updated = CURRENT_TIMESTAMP WHERE id = ?", updated_vessels_data)
    db.commit()

    # Refresh vessels after update for analysis
    cursor.execute("SELECT id, latitude, longitude, speed, heading FROM vessels")
    vessels = cursor.fetchall()


    # 3. Get Hazard Zones
    cursor.execute("SELECT id, name, latitude, longitude, radius FROM hazard_zones")
    hazard_zones = cursor.fetchall()

    # 4. Run Algorithms and collect events
    accident_risks = detect_accident_risk(vehicles, vessels)
    congestion_events = detect_congestion(vehicles)
    damaged_road_alerts = detect_damaged_road_alerts(vehicles, hazard_zones)
    maritime_alerts = detect_maritime_alerts(vessels)

    # Combine all new events
    new_events = accident_risks + congestion_events + damaged_road_alerts + maritime_alerts

    # 5. Store new events in database
    for event in new_events:
        try:
            db.execute("INSERT INTO events (type, description, latitude, longitude, entity_id, involved_entities) VALUES (?, ?, ?, ?, ?, ?)",
                       (event['type'], event['description'], event.get('latitude'), event.get('longitude'), 
                        event.get('entity_id'), event.get('involved_entities')))
        except KeyError:
            # Handle cases where some fields might be missing for certain event types
            db.execute("INSERT INTO events (type, description, latitude, longitude, entity_id) VALUES (?, ?, ?, ?, ?)",
                       (event['type'], event['description'], event.get('latitude'), event.get('longitude'), 
                        event.get('entity_id')))
    db.commit()

    # 6. Fetch all recent events for display (e.g., last 24 hours)
    # This keeps the event log from growing indefinitely in the frontend
    one_day_ago = datetime.now() - timedelta(days=1)
    cursor.execute("SELECT * FROM events WHERE timestamp > ?", (one_day_ago,))
    current_events = cursor.fetchall()

    # 7. Prepare data for frontend
    response_data = {
        'vehicles': [dict(v) for v in vehicles],
        'vessels': [dict(v) for v in vessels],
        'events': [dict(e) for e in current_events],
        'hazard_zones': [dict(hz) for hz in hazard_zones]
    }
    return jsonify(response_data)

@app.route('/api/events_summary', methods=['GET'])
def events_summary():
    db = get_db()
    # Get counts for different event types over a recent period (e.g., last 24 hours)
    one_day_ago = datetime.now() - timedelta(days=1)
    cursor = db.cursor()
    cursor.execute("SELECT type, COUNT(*) as count FROM events WHERE timestamp > ? GROUP BY type", (one_day_ago,))
    summary = cursor.fetchall()
    return jsonify([dict(s) for s in summary])

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')