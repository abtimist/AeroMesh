import os
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error
import joblib
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Mock Historical Data Fetcher
def fetch_historical_weather_and_aqi(start_date="2020-01-01", end_date="2023-12-31"):
    """
    Simulates fetching 3 years of historical OpenAQ and Open-Meteo data 
    for BRICS command center nodes.
    """
    logger.info(f"📡 Fetching historical data from {start_date} to {end_date}...")
    # In a real scenario, this would query the OpenAQ /history endpoints and Open-Meteo archive API
    # Generating synthetic historical correlation data for demonstration
    
    np.random.seed(42)
    n_samples = 10000
    
    wind_speed = np.random.uniform(0, 15, n_samples)
    wind_dir = np.random.uniform(0, 360, n_samples)
    pblh = np.random.uniform(200, 2500, n_samples) # Planetary Boundary Layer Height
    humidity = np.random.uniform(20, 100, n_samples)
    temp_c = np.random.uniform(-10, 45, n_samples)
    
    # Plume spread (target variable) is physically dependent on wind and PBLH, 
    # but we add real-world noise that ML can capture better than raw Pasquill-Gifford
    true_lateral_dispersion = (100 / (wind_speed + 1)) * (pblh / 1000)
    noise = np.random.normal(0, 5, n_samples)
    actual_spread = true_lateral_dispersion + noise
    actual_spread = np.clip(actual_spread, 1, 200) # km spread
    
    df = pd.DataFrame({
        "wind_speed_ms": wind_speed,
        "wind_dir_deg": wind_dir,
        "pblh_m": pblh,
        "humidity_pct": humidity,
        "temp_c": temp_c,
        "lateral_dispersion_km": actual_spread
    })
    
    logger.info(f"✅ Fetched {n_samples} historical records.")
    return df

def train_dispersion_model():
    """
    Trains a Random Forest model on historical data to predict plume dispersion
    more accurately than static Pasquill-Gifford physics equations.
    """
    logger.info("🧠 Initializing ML Training Pipeline for Plume Dispersion...")
    
    df = fetch_historical_weather_and_aqi()
    
    X = df[["wind_speed_ms", "wind_dir_deg", "pblh_m", "humidity_pct", "temp_c"]]
    y = df["lateral_dispersion_km"]
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    logger.info("⚙️ Training RandomForestRegressor on historical physics data...")
    model = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)
    model.fit(X_train, y_train)
    
    preds = model.predict(X_test)
    mse = mean_squared_error(y_test, preds)
    rmse = np.sqrt(mse)
    
    logger.info(f"📊 Model Evaluation - RMSE: {rmse:.2f} km")
    
    # Save the model
    os.makedirs("models", exist_ok=True)
    model_path = "models/plume_dispersion_rf.pkl"
    joblib.dump(model, model_path)
    logger.info(f"💾 Model saved to {model_path}")
    
    return model

if __name__ == "__main__":
    train_dispersion_model()
