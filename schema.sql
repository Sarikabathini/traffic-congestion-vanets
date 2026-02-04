DROP TABLE IF EXISTS vehicles;
DROP TABLE IF EXISTS vessels;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS hazard_zones;

CREATE TABLE vehicles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    speed REAL NOT NULL, -- km/h
    heading REAL NOT NULL, -- degrees
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vessels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    speed REAL NOT NULL, -- km/h
    heading REAL NOT NULL, -- degrees
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL, -- e.g., 'congestion', 'accident_risk', 'damaged_road', 'rough_weather', 'distress_call'
    description TEXT,
    latitude REAL,
    longitude REAL,
    entity_id INTEGER, -- Vehicle or vessel ID
    involved_entities TEXT, -- Comma-separated IDs for multi-entity events
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE hazard_zones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    radius REAL NOT NULL -- in meters
);

INSERT INTO hazard_zones (name, latitude, longitude, radius) VALUES
('Pothole Area 1', 17.9689, 79.5940, 50), -- Example Hanamkonda location
('Roadwork Ahead', 17.9750, 79.5850, 100),
('Flood Prone Zone', 17.9800, 79.5900, 75);