from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.api.endpoints import ingestion
from app.core.scheduler import start_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: start background scheduler
    start_scheduler()
    yield
    # Shutdown logic (if any) can go here

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
