from app.db.session import SessionLocal
from app.models.event import PollutionEvent
from app.services.spatial_indexer import SpatialIndexer
from sqlalchemy.orm import Session

class EvidenceFusionEngine:
    @staticmethod
    def calculate_confidence(event_id: int) -> float:
        """
        Multi-Source Evidence Fusion matrix.
        Calculates a confidence score (0-100) based on corroborating data.
        """
        db: Session = SessionLocal()
        score = 0.0
        try:
            event = db.query(PollutionEvent).filter(PollutionEvent.id == event_id).first()
            if not event:
                return 0.0

            # Base score from the initial detection
            # If the event came from NASA FIRMS, it already has a base confidence
            score += (event.confidence_score * 0.4) # Max 40 points from source

            # Evidence 1: Are there active ground sensors detecting anomalies nearby?
            # We query the spatial indexer.
            nearby_sensors = SpatialIndexer.get_sensors_near_hotspot(event_id, radius_meters=50000)
            if len(nearby_sensors) > 0:
                # In a real app, we'd check if these sensors are spiking above normal PM2.5
                score += 30.0 # Flat 30 points if we have sensor coverage nearby for now

            # Evidence 2: Has a citizen reported this with a verified photo?
            # We would query the CitizenReport table (Task 3.4)
            # For now, we assume this is handled when the Laya Engine fires.
            # Example logic: if citizen report exists and laya_score > 80: score += 30.0
            
            # Cap at 100%
            final_score = min(score, 100.0)
            
            # Auto-escalate severity if score is extremely high
            if final_score >= 85.0 and event.severity != 'CRITICAL':
                event.severity = 'CRITICAL'
                db.commit()
                
            return final_score
            
        except Exception as e:
            db.rollback()
            return 0.0
        finally:
            db.close()
