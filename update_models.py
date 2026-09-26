import os
import glob

models_dir = 'backend/app/models'
for filepath in glob.glob(os.path.join(models_dir, '*.py')):
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Remove geoalchemy2 import
    content = content.replace("from geoalchemy2 import Geometry\n", "")
    content = content.replace("from geoalchemy2.shape import to_shape\n", "")
    
    # Replace Geometry('POINT') with lat/lon floats
    if 'sensor.py' in filepath or 'weather.py' in filepath or 'report.py' in filepath:
        import re
        content = re.sub(r'location\s*=\s*Column\(Geometry\([^)]+\),\s*nullable=(True|False)\)', 'lat = Column(Float, nullable=\\1)\n    lon = Column(Float, nullable=\\1)', content)
    
    if 'event.py' in filepath:
        import re
        content = re.sub(r'centroid\s*=\s*Column\(Geometry\([^)]+\),\s*nullable=(True|False)\)', 'lat = Column(Float, nullable=\\1)\n    lon = Column(Float, nullable=\\1)', content)
        content = re.sub(r'plume_polygon\s*=\s*Column\(Geometry\([^)]+\),\s*nullable=True\)', 'plume_polygon = Column(JSON, nullable=True)', content)
        content = content.replace("from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum", "from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum, JSON")
    
    if 'jurisdiction.py' in filepath:
        import re
        content = re.sub(r'assigned_zone\s*=\s*Column\(Geometry\([^)]+\),\s*nullable=(True|False)\)', 'assigned_zone = Column(JSON, nullable=\\1)', content)
        content = content.replace("from sqlalchemy import Column, Integer, String, Boolean", "from sqlalchemy import Column, Integer, String, Boolean, JSON")

    if 'location = Column(Geometry(\'POINT\', srid=4326), nullable=False)' in content:
        content = content.replace("location = Column(Geometry('POINT', srid=4326), nullable=False)", "lat = Column(Float, nullable=False)\n    lon = Column(Float, nullable=False)")
        
    with open(filepath, 'w') as f:
        f.write(content)

print("Updated models for SQLite compatibility.")
