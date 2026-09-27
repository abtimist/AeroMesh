from fastapi import APIRouter, Response
from app.api.endpoints.data import Node
from app.services.forecast_service import forecast_service

router = APIRouter()

@router.get("")
async def get_forecast(response: Response, node: Node = "india"):
    result = await forecast_service.get(node)
    if result["status"] == "loading":
        response.status_code = 202
        response.headers["Retry-After"] = "3"
    response.headers["Cache-Control"] = "no-store"
    return result
