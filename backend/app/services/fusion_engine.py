from app.db.session import SessionLocal
from app.models.event import PollutionEvent
from app.services.spatial_indexer import SpatialIndexer
from sqlalchemy.orm import Session
import logging
import logging

logger = logging.getLogger(__name__)

class EvidenceFusionEngine:

    @staticmethod
    def calculate_confidence(event_id: int) -> float:
        """
        Multi-Source Evidence Fusion matrix powered by Laya.
        Calculates a confidence score (0-100) based on corroborating data.
        """
        db: Session = SessionLocal()
        try:
            event = db.query(PollutionEvent).filter(PollutionEvent.id == event_id).first()
            if not event:
                return 0.0

            # Gather Evidence Context
            cv_confidence = event.confidence_score
            nearby_sensors = SpatialIndexer.get_sensors_near_hotspot(event_id, radius_meters=50000)
            sensor_count = len(nearby_sensors)
            
            # Fallback heuristic (Lightweight scoring)
            final_score = (cv_confidence * 0.4)
            if sensor_count > 0:
                final_score += 30.0

            # Cap at 100%
            final_score = min(final_score, 100.0)
            
            # Auto-escalate severity if score is extremely high
            if final_score >= 85.0 and event.severity != 'CRITICAL':
                event.severity = 'CRITICAL'
                db.commit()
                
            return final_score
            
        except Exception as e:
            logger.error(f"Error in Laya Fusion Engine: {e}")
            db.rollback()
            return 0.0
        finally:
            db.close()
