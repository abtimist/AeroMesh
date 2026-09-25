from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import Dict, Any
from app.services.vision_model import vision_engine

router = APIRouter()

@router.post("/analyze-image")
async def analyze_image(file: UploadFile = File(...)) -> Dict[str, Any]:
    """
    Accepts an image upload from the citizen portal and runs the MobileNetV3 
    vision model to detect smoke/fire.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File provided is not an image.")
        
    try:
        contents = await file.read()
        
        # Run inference via the Laya Engine PyTorch model
        result = vision_engine.analyze_image(contents)
        
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
            
        return {
            "status": "success",
            "filename": file.filename,
            "analysis": result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image processing failed: {str(e)}")
