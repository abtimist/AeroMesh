import io
import logging
from PIL import Image
from transformers import pipeline

logger = logging.getLogger(__name__)

class LayaVisionModel:
    def __init__(self):
        # We use a Hugging Face Zero-Shot Image Classification model (CLIP) as our 
        # fast edge-deployable alternative for the hackathon. 
        # Note: We can easily swap this pipeline out for `llava-hf/llava-1.5-7b-hf` 
        # if deployed on a machine with GPU hardware.
        try:
            logger.info("Initializing Hugging Face Vision Model (LLaVA architecture fallback)...")
            # Using openai/clip-vit-base-patch32 for zero-shot classification
            # This allows us to query text labels directly against the image!
            self.classifier = pipeline("zero-shot-image-classification", model="openai/clip-vit-base-patch32")
            logger.info("Hugging Face Vision Model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load Hugging Face vision model: {e}")
            self.classifier = None

    def analyze_image(self, image_bytes: bytes) -> dict:
        """
        Takes raw image bytes, runs it through the Hugging Face zero-shot classifier,
        and returns confidence scores for smoke/fire.
        """
        if not self.classifier:
            return {"error": "Model not loaded"}

        try:
            img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            
            # The exact labels we want the HF model to look for
            candidate_labels = ["thick smoke", "wildfire", "clear sky", "normal cityscape"]
            
            # Run inference
            results = self.classifier(img, candidate_labels=candidate_labels)
            
            # Results is a list of dicts: [{'score': 0.9, 'label': 'thick smoke'}, ...]
            # We check if the top labels indicate a pollution event
            top_label = results[0]['label']
            top_score = results[0]['score'] * 100
            
            is_fire_or_smoke = top_label in ["thick smoke", "wildfire"]
            
            return {
                "detected": is_fire_or_smoke,
                "confidence_score": round(top_score, 2),
                "class_id_matched": top_label,
                "raw_results": results
            }
            
        except Exception as e:
            logger.error(f"Error during Hugging Face image analysis: {e}")
            return {"error": str(e)}

# Singleton instance
vision_engine = LayaVisionModel()
