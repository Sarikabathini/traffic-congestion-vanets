import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'your_secret_key_here'
    DATABASE = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'vanet_its.db')
    # Simulation Parameters
    SIMULATION_AREA_SIZE_KM = 5  # e.g., 5km x 5km area
    CONGESTION_THRESHOLD_DENSITY = 50  # vehicles per sq km
    ACCIDENT_RISK_PROXIMITY_M = 20  # meters
    ACCIDENT_RISK_SPEED_DIFFERENCE_KMH = 30 # km/h
    ROUGH_WEATHER_THRESHOLD_SPEED_KMH = 5 # km/h (vessel speed below this might indicate rough weather/stalled)
    DISTRESS_CALL_PROBABILITY = 0.0001 # Probability per vessel per update cycle
    UPDATE_INTERVAL_MS = 1000 # Milliseconds for frontend updates
    NUM_VEHICLES = 20
    NUM_VESSELS = 5