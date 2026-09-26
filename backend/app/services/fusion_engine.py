from app.db.session import SessionLocal
from app.models.event import PollutionEvent
from app.services.spatial_indexer import SpatialIndexer
from sqlalchemy.orm import Session
import logging
from transformers import pipeline

logger = logging.getLogger(__name__)

class EvidenceFusionEngine:
    _laya_model = None

    @classmethod
    def get_laya_model(cls):
        """Lazy load the Laya System-One Decision Model."""
        if cls._laya_model is None:
            try:
                logger.info("Initializing Laya Decision Model (convaiinnovations/laya) for Fusion Engine...")
                # Laya is a fast, System-One text-classification model for routing and scoring.
                cls._laya_model = pipeline("text-classification", model="convaiinnovations/laya", top_k=None)
                logger.info("Laya model loaded successfully.")
            except Exception as e:
                logger.error(f"Failed to load Laya model: {e}")
        return cls._laya_model

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
            
            # Construct a state/prompt for the Laya Decision Engine
            # Laya evaluates state and returns a probability output.
            laya_input = (
                f"Evaluate pollution event probability. "
                f"CV_Confidence: {cv_confidence}. "
                f"Nearby_Sensors_Active: {sensor_count}. "
                f"Event_Source: {event.event_type}."
            )

            laya = EvidenceFusionEngine.get_laya_model()
            
            final_score = 0.0
            
            if laya:
                # Run through the Laya System-One model
                results = laya(laya_input)
                # Parse the model's calibrated probability score 
                # (Assuming POSITIVE class dictates the confidence)
                for res in results[0]:
                    if res['label'] == 'LABEL_1' or res['label'] == 'POSITIVE' or '1' in str(res['label']):
                        final_score = res['score'] * 100
                        break
                
                # Fallback if label format differs
                if final_score == 0.0 and len(results[0]) > 0:
                    final_score = results[0][0]['score'] * 100
            else:
                # Fallback heuristic if Laya fails to load
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
