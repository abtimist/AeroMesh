import os
import sys

# Setup Python path to include the backend directory
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.base_class import Base
from app.db.session import engine
from app.models.sensor import Sensor, Measurement
from app.models.weather import WeatherLog
from app.models.event import PollutionEvent
from app.models.jurisdiction import InspectorJurisdiction
from app.models.report import CitizenReport

def test_models():
    print("Initializing Database Schemas...")
    try:
        # This will create all tables based on imported models
        # Uses standard SQLAlchemy logic
        Base.metadata.create_all(bind=engine)
        print("✅ Database schemas created successfully.")
        
        # Verify the tables exist in the registry
        tables = Base.metadata.tables.keys()
        expected_tables = [
            'sensors', 'measurements', 'weather_logs', 
            'pollution_event', 'inspector_jurisdictions', 'citizen_reports'
        ]
        
        missing = []
        for t in expected_tables:
            if t not in tables:
                missing.append(t)
                
        if missing:
            print(f"❌ Missing tables in metadata: {missing}")
            print(f"Current tables: {list(tables)}")
        else:
            print("✅ All expected tables found in SQLAlchemy metadata.")
            
    except Exception as e:
        print(f"❌ Database error: {e}")

if __name__ == "__main__":
    test_models()
