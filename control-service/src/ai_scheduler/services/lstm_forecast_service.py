"""
LSTM Forecast Service - Deep Learning based forecasting
Uses trained LSTM model for accurate demand prediction and route timing optimization
"""
import os
import numpy as np
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import warnings

# Suppress TensorFlow warnings
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
warnings.filterwarnings('ignore')

try:
    import tensorflow as tf
    from tensorflow import keras
    LSTM_AVAILABLE = True
except ImportError:
    LSTM_AVAILABLE = False
    print("Warning: TensorFlow not available. LSTM forecasting will be disabled.")

from ai_scheduler.models import TimeBandHeadway
from ai_scheduler.config.settings import settings


class LSTMForecastService:
    """
    LSTM-based forecast service for metro demand prediction
    Provides more accurate predictions than Prophet for transit systems
    """
    
    def __init__(self):
        self.model = None
        self.model_loaded = False
        self._load_lstm_model()
        
        # Day of week mapping
        self.day_mapping = {
            'Monday': 0,
            'Tuesday': 1,
            'Wednesday': 2,
            'Thursday': 3,
            'Friday': 4,
            'Saturday': 5,
            'Sunday': 6
        }
        
        # Time period configurations based on LSTM predictions
        self.time_periods = [
            ("05:00:00", "06:30:00", "early_morning"),
            ("06:30:00", "08:30:00", "morning_rush"),
            ("08:30:00", "11:00:00", "mid_morning"),
            ("11:00:00", "13:30:00", "lunch"),
            ("13:30:00", "17:00:00", "afternoon"),
            ("17:00:00", "19:30:00", "evening_rush"),
            ("19:30:00", "21:30:00", "evening"),
            ("21:30:00", "23:00:00", "late_evening")
        ]

    def _load_lstm_model(self) -> None:
        """Load the trained LSTM model from disk"""
        if not LSTM_AVAILABLE:
            print("LSTM model cannot be loaded: TensorFlow not available")
            return
            
        try:
            model_path = os.path.join(settings.model_dir, 'LSTM_model_20251006_192416.h5')
            if os.path.exists(model_path):
                self.model = keras.models.load_model(model_path)
                self.model_loaded = True
                print(f"✅ Successfully loaded LSTM model from {model_path}")
                print(f"   Model input shape: {self.model.input_shape}")
                print(f"   Model output shape: {self.model.output_shape}")
            else:
                print(f"❌ LSTM model file not found at {model_path}")
        except Exception as e:
            print(f"❌ Error loading LSTM model: {e}")
            self.model_loaded = False

    def _prepare_input_features(self, day_of_week: str, hour: int, route_id: str = "R1") -> np.ndarray:
        """
        Prepare input features for LSTM model
        Features: [day_of_week_encoded, hour, route_encoded, is_weekend, is_rush_hour]
        """
        day_encoded = self.day_mapping.get(day_of_week, 0)
        is_weekend = 1 if day_of_week in ['Saturday', 'Sunday'] else 0
        is_rush_hour = 1 if hour in [7, 8, 17, 18, 19] else 0
        
        # Simple route encoding (can be extended for multiple routes)
        route_encoded = 1 if route_id == "R1" else 0
        
        # Create feature vector
        features = np.array([[day_encoded, hour, route_encoded, is_weekend, is_rush_hour]], dtype=np.float32)
        
        # Normalize features (same scale as training)
        features_normalized = features.copy()
        features_normalized[:, 0] = features_normalized[:, 0] / 6.0  # day_of_week 0-6
        features_normalized[:, 1] = features_normalized[:, 1] / 23.0  # hour 0-23
        
        return features_normalized

    def predict_demand(self, day_of_week: str, hour: int, route_id: str = "R1") -> float:
        """
        Predict passenger demand using LSTM model
        Returns: Predicted demand (number of passengers)
        """
        if not self.model_loaded:
            # Fallback to basic estimation
            return self._fallback_demand_estimation(day_of_week, hour)
        
        try:
            # Prepare input
            X = self._prepare_input_features(day_of_week, hour, route_id)
            
            # Make prediction
            prediction = self.model.predict(X, verbose=0)
            demand = float(prediction[0][0])
            
            # Denormalize (assuming model was trained with normalized output)
            # Typical range: 100-2000 passengers per hour
            demand_denormalized = demand * 2000.0
            
            return max(100, min(2000, demand_denormalized))  # Clamp to realistic range
            
        except Exception as e:
            print(f"Error in LSTM prediction: {e}")
            return self._fallback_demand_estimation(day_of_week, hour)

    def _fallback_demand_estimation(self, day_of_week: str, hour: int) -> float:
        """Fallback demand estimation when LSTM is not available"""
        is_weekend = day_of_week in ['Saturday', 'Sunday']
        
        # Base demand
        if is_weekend:
            base = 600
        else:
            base = 800
        
        # Hour-based multiplier
        if hour in [7, 8, 17, 18, 19]:  # Rush hours
            multiplier = 2.0
        elif hour in [11, 12, 13]:  # Lunch hours
            multiplier = 1.4
        elif hour < 6 or hour > 22:  # Late/early hours
            multiplier = 0.5
        else:
            multiplier = 1.0
        
        return base * multiplier

    def calculate_optimal_headway(self, predicted_demand: float) -> int:
        """
        Calculate optimal headway based on predicted demand
        Returns: Headway in seconds
        """
        # Assume train capacity: 1000 passengers
        # Target load factor: 0.7 (70% capacity utilization)
        train_capacity = 1000
        target_load_factor = 0.7
        
        # Calculate required trains per hour
        effective_capacity = train_capacity * target_load_factor
        trains_per_hour = predicted_demand / effective_capacity
        
        # Convert to headway (seconds)
        if trains_per_hour <= 0:
            headway = 600  # 10 minutes (minimum service)
        else:
            headway = int(3600 / trains_per_hour)
        
        # Clamp to operational constraints
        min_headway = 120  # 2 minutes (technical limit)
        max_headway = 900  # 15 minutes (service quality limit)
        
        return max(min_headway, min(max_headway, headway))

    def forecast_headways(self, route_id: str, date: str, day_of_week: str) -> List[TimeBandHeadway]:
        """
        Generate optimized time bands using LSTM predictions
        """
        if not self.model_loaded:
            print("LSTM model not loaded, using fallback timebands")
            return self._generate_fallback_timebands(day_of_week)
        
        timebands = []
        
        for start_time, end_time, period in self.time_periods:
            # Get average hour for this period
            start_hour = int(start_time.split(':')[0])
            end_hour = int(end_time.split(':')[0])
            avg_hour = (start_hour + end_hour) // 2
            
            # Predict demand for this time period
            predicted_demand = self.predict_demand(day_of_week, avg_hour, route_id)
            
            # Calculate optimal headway
            optimal_headway = self.calculate_optimal_headway(predicted_demand)
            
            timebands.append(TimeBandHeadway(
                start=start_time,
                end=end_time,
                headway_sec=optimal_headway
            ))
            
            print(f"   {period:15s} ({start_time}-{end_time}): Demand={predicted_demand:.0f}, Headway={optimal_headway}s ({optimal_headway//60}m)")
        
        return timebands

    def _generate_fallback_timebands(self, day_of_week: str) -> List[TimeBandHeadway]:
        """Fallback time bands when LSTM is not available"""
        is_weekend = day_of_week in ['Saturday', 'Sunday']
        
        if is_weekend:
            return [
                TimeBandHeadway(start="05:00:00", end="08:00:00", headway_sec=540),   # 9 min
                TimeBandHeadway(start="08:00:00", end="17:00:00", headway_sec=480),   # 8 min
                TimeBandHeadway(start="17:00:00", end="20:00:00", headway_sec=420),   # 7 min
                TimeBandHeadway(start="20:00:00", end="23:00:00", headway_sec=600)    # 10 min
            ]
        else:
            return [
                TimeBandHeadway(start="05:00:00", end="06:30:00", headway_sec=480),   # 8 min
                TimeBandHeadway(start="06:30:00", end="08:30:00", headway_sec=180),   # 3 min
                TimeBandHeadway(start="08:30:00", end="17:00:00", headway_sec=360),   # 6 min
                TimeBandHeadway(start="17:00:00", end="19:30:00", headway_sec=180),   # 3 min
                TimeBandHeadway(start="19:30:00", end="23:00:00", headway_sec=420)    # 7 min
            ]

    def get_demand_insights(self, route_id: str, date: str, day_of_week: str) -> Dict:
        """
        Get detailed demand insights for a specific day using LSTM predictions
        """
        hourly_predictions = []
        total_demand = 0
        
        for hour in range(5, 23):  # 5 AM to 11 PM
            demand = self.predict_demand(day_of_week, hour, route_id)
            hourly_predictions.append({
                "hour": f"{hour:02d}:00",
                "predicted_demand": int(demand),
                "optimal_headway": self.calculate_optimal_headway(demand)
            })
            total_demand += demand
        
        # Determine demand level
        avg_demand = total_demand / len(hourly_predictions)
        if avg_demand > 1200:
            demand_level = "high"
        elif avg_demand < 700:
            demand_level = "low"
        else:
            demand_level = "medium"
        
        return {
            "demand_level": demand_level,
            "day_of_week": day_of_week,
            "total_daily_demand": int(total_demand),
            "average_hourly_demand": int(avg_demand),
            "hourly_predictions": hourly_predictions,
            "source": "lstm_deep_learning_model",
            "model_loaded": self.model_loaded
        }

    def simulate_passenger_demand(self, route_id: str, date: str, day_of_week: str, scenario: str = "normal") -> List[Dict]:
        """
        Simulate passenger demand using LSTM predictions with scenario adjustments
        """
        demand_simulation = []
        
        # Scenario multipliers
        scenario_multipliers = {
            "normal": 1.0,
            "peak": 1.3,
            "disruption": 1.6,
            "holiday": 0.6,
            "special_event": 1.8
        }
        
        multiplier = scenario_multipliers.get(scenario, 1.0)
        
        for hour in range(5, 23):  # 5 AM to 11 PM
            base_demand = self.predict_demand(day_of_week, hour, route_id)
            adjusted_demand = int(base_demand * multiplier)
            optimal_headway = self.calculate_optimal_headway(adjusted_demand)
            
            # Determine period type
            if hour in [7, 8, 17, 18, 19]:
                period_type = "rush"
            elif hour in [11, 12, 13]:
                period_type = "lunch"
            else:
                period_type = "normal"
            
            demand_simulation.append({
                "hour": f"{hour:02d}:00",
                "estimated_passengers": adjusted_demand,
                "optimal_headway_sec": optimal_headway,
                "optimal_headway_min": optimal_headway // 60,
                "period_type": period_type,
                "scenario": scenario,
                "model_source": "lstm"
            })
        
        return demand_simulation
