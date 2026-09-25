from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.api.endpoints import ingestion, analysis, laya
from app.core.scheduler import start_scheduler
from app.db.session import engine
from app.db.base_class import Base
# Import all models to ensure Base.metadata creates them
from app.models import sensor, weather, event, report

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables and start scheduler
    Base.metadata.create_all(bind=engine)
    start_scheduler()
    yield
    # Shutdown logic


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

# Include routers
app.include_router(ingestion.router, prefix="/api/ingestion", tags=["Ingestion"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["Geospatial Analysis"])
app.include_router(laya.router, prefix="/api/laya", tags=["Laya CV Engine"])

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
