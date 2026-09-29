from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager

from app.api.endpoints import ingestion, analysis, data, forecast, evidence, dispersion, operations
from app.core.scheduler import start_scheduler, scheduler
from app.db.session import engine
from app.db.base_class import Base
# Import all models to ensure Base.metadata creates them
from app.models import sensor, weather, event, report
from app.models import forecast as forecast_models
from app.models import operations as operations_models
from app.services.forecast_service import forecast_service
from app.services.hysplit import hysplit_worker
from app.services.transport import transport_worker
import asyncio

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables and start scheduler
    await asyncio.to_thread(Base.metadata.create_all, bind=engine)
    # create_all does not add indexes to tables copied from the bundled database.
    for index in sensor.Measurement.__table__.indexes | event.PollutionEvent.__table__.indexes:
        await asyncio.to_thread(index.create, engine, checkfirst=True)
    await forecast_service.start()
    await hysplit_worker.start()
    await asyncio.to_thread(transport_worker.recover)
    await operations.report_worker.start()
    start_scheduler()
    try:
        yield
    finally:
        if scheduler.running:
            scheduler.shutdown(wait=False)
        await forecast_service.close()
        await hysplit_worker.close()
        await operations.report_worker.close()


app = FastAPI(
    title="AeroMesh BRICS API",
    description="Federated Air Pollution Plume Detection & Transboundary Alert Engine",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Include routers
app.include_router(ingestion.router, prefix="/api/ingestion", tags=["Ingestion"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["Geospatial Analysis"])

app.include_router(data.router, prefix="/api/data", tags=["Map Data"])
app.include_router(forecast.router, prefix="/api/forecast", tags=["Forecasts"])
app.include_router(evidence.router, prefix="/api/evidence", tags=["Evidence"])
app.include_router(dispersion.router, prefix="/api/dispersion", tags=["Dispersion"])
app.include_router(operations.router, prefix="/api/citizen", tags=["Citizen reports and dispatch"])

@app.get("/")
def read_root():
    return {
        "system": "AeroMesh BRICS Node Engine",
        "status": "online",
        "version": "1.0.0"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}
