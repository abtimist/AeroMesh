from fastapi import APIRouter, BackgroundTasks, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session
from app.services.openaq_client import OpenAQClient
from app.services.meteo_client import OpenMeteoClient
from app.services.firms_client import NASA_FIRMSClient
from app.db.session import SessionLocal
from app.models.report import CitizenReport
from app.services.laya_cv import laya_cv
import asyncio
import shutil
import os
import uuid

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/openaq")
async def trigger_openaq_sync(background_tasks: BackgroundTasks):
    """
    Manually trigger the OpenAQ location and measurement sync in the background.
    """
    async def sync_task():
        client = OpenAQClient()
        await client.fetch_locations_in_bbox("73.0,20.0,89.0,31.0", limit=50)
        await client.sync_latest_measurements()
        
    background_tasks.add_task(sync_task)
    return {"status": "success", "message": "OpenAQ sync triggered in background"}

@router.post("/meteo")
async def trigger_meteo_sync(background_tasks: BackgroundTasks, lat: float = 28.6139, lon: float = 77.2090):
    """
    Manually trigger the Open-Meteo vector sync for a specific coordinate.
    """
    async def sync_task():
        client = OpenMeteoClient()
        await client.fetch_weather_vectors(lat=lat, lon=lon)
        
    background_tasks.add_task(sync_task)
    return {"status": "success", "message": f"Open-Meteo sync triggered for {lat}, {lon}"}

@router.post("/firms")
async def trigger_firms_sync(background_tasks: BackgroundTasks, bbox: str = "70,8,90,35", days: int = 1):
    """
    Manually trigger the NASA FIRMS active fire sync for a specific bounding box.
    """
    async def sync_task():
        client = NASA_FIRMSClient()
        await client.fetch_active_fires(bbox=bbox, days=days)
        
    background_tasks.add_task(sync_task)
    return {"status": "success", "message": f"NASA FIRMS sync triggered for bbox {bbox}"}

@router.post("/report")
async def submit_citizen_report(
    lat: float = Form(...),
    lon: float = Form(...),
    device_id: str = Form("anonymous"),
    photo: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Accepts a citizen photo report with GPS coordinates.
    Saves the image and creates a CitizenReport in PostGIS.
    """
    try:
        # Save photo locally (simulating S3 upload)
        upload_dir = "uploads/reports"
        os.makedirs(upload_dir, exist_ok=True)
        ext = photo.filename.split(".")[-1] if "." in photo.filename else "jpg"
        filename = f"{uuid.uuid4()}.{ext}"
        filepath = os.path.join(upload_dir, filename)
        
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(photo.file, buffer)
            
        # 2. Run Local PyTorch CV Verification (Laya Engine)
        cv_result = laya_cv.analyze_image(filepath)
        
        # 3. Create PostGIS geometry point: POINT(lon lat)
        point = f"SRID=4326;POINT({lon} {lat})"
        
        # 4. Save to DB
        report = CitizenReport(
            device_id=device_id,
            location=point,
            image_url=filepath,
            laya_confidence_score=cv_result.get("confidence", 0.0)
        )
        db.add(report)
        db.commit()
        db.refresh(report)
        
        return {
            "status": "success", 
            "message": "Report submitted successfully",
            "report_id": report.id,
            "laya_analysis": cv_result
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

