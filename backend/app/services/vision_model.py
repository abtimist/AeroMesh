import torch
from torchvision import models, transforms
from PIL import Image
import io
import logging

logger = logging.getLogger(__name__)

class LayaVisionModel:
    def __init__(self):
        # Load a highly efficient pre-trained MobileNetV3 for edge deployment
        try:
            # Setting weights=models.MobileNet_V3_Small_Weights.DEFAULT 
            # downloads the weights on the first run automatically
            self.model = models.mobilenet_v3_small(weights=models.MobileNet_V3_Small_Weights.DEFAULT)
            self.model.eval() # Set to inference mode
            
            # Standard ImageNet preprocessing
            self.preprocess = transforms.Compose([
                transforms.Resize(256),
                transforms.CenterCrop(224),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
            ])
            logger.info("Laya Engine Vision Model (MobileNetV3) loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load vision model: {e}")
            self.model = None

    def analyze_image(self, image_bytes: bytes) -> dict:
        """
        Takes raw image bytes, runs it through MobileNetV3, and maps the output 
        to a generic 'smoke/fire' confidence score for hackathon purposes.
        """
        if not self.model:
            return {"error": "Model not loaded"}

        try:
            img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            input_tensor = self.preprocess(img)
            input_batch = input_tensor.unsqueeze(0) # Create a mini-batch of size 1
            
            with torch.no_grad():
                output = self.model(input_batch)
            
            # The output has unnormalized scores. To get probabilities, run a softmax
            probabilities = torch.nn.functional.softmax(output[0], dim=0)
            
            # Get the top prediction
            top_prob, top_catid = torch.topk(probabilities, 1)
            score = top_prob.item() * 100
            
            # In a real fine-tuned model, we'd have a specific "Smoke" and "Fire" class.
            # For the mock/hackathon, we will just return a high confidence if it's over 10%.
            # We'll mock a generic response indicating whether it looks like a pollution event.
            is_fire_or_smoke = score > 10.0 # Extremely generous threshold for testing
            
            return {
                "detected": is_fire_or_smoke,
                "confidence_score": round(score, 2),
                "class_id_matched": top_catid.item()
            }
            
        except Exception as e:
            logger.error(f"Error during image analysis: {e}")
            return {"error": str(e)}

# Singleton instance
vision_engine = LayaVisionModel()
