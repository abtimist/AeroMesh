# Import all the models, so that Base has them before being
# imported by Alembic or used in create_all()
from app.db.base_class import Base

from app.models.sensor import Sensor, Measurement
from app.models.weather import WeatherLog
from app.models.event import PollutionEvent
from app.models.jurisdiction import InspectorJurisdiction
