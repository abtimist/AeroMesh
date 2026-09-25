# 🧠 Step 3: Laya Local Engine & Computer Vision Model

> **Goal**: Build a local AI microservice capable of verifying citizen-uploaded photos using a pre-trained computer vision model, and fuse it with satellite/sensor data for a final confidence score.

---

## 1. The Laya Engine (Task 3.1 & 3.2)

We deployed a specialized Python API module (`backend/app/api/endpoints/laya.py`) to act as the Laya Engine.
- **Model**: Instead of training a heavy model from scratch, we integrated **PyTorch's MobileNetV3**, which is designed specifically for fast, low-power edge environments.
- **Inference**: When a user uploads a photo via the mobile app, the image is passed directly into `vision_model.py`. The model resizes it, normalizes it, and runs inference.
- **Result**: It returns a confidence score indicating the probability that the image contains smoke or fire (for the hackathon demo, we used a mocked threshold over ImageNet categories).

## 2. Multi-Source Evidence Fusion (Task 3.3)

Detecting a fire from a single photo can be error-prone (e.g., someone uploads a picture of a barbecue). True confidence comes from fusing data sources.
- **Implementation**: We built `fusion_engine.py`.
- **Logic**: 
  - NASA FIRMS satellite hotspot detection provides base points.
  - Nearby ground sensor coverage provides additional points.
  - A verified high-confidence photo from the Laya Engine provides the final points.
- If the aggregated `confidence_score` crosses 85%, the system automatically escalates the `PollutionEvent` to **CRITICAL** status, triggering immediate downstream alerts.

## 3. Schema Updates (Task 3.4)

We created a new SQLAlchemy model, `CitizenReport` (in `report.py`), to store the citizen's location, the uploaded image URL, and the Laya confidence score, linking it back to the core `PollutionEvent`.

*Day 3 is complete. The system can now intelligently fuse ground, satellite, and citizen data! We are ready for Day 4.*
