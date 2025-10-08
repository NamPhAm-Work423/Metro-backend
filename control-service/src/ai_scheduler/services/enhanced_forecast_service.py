"""
Enhanced Forecast Service using trained LSTM model
Integrates deep learning for accurate demand predictions and route timing optimization
"""
from typing import List, Dict
import os

from ai_scheduler.models import TimeBandHeadway
from ai_scheduler.config.settings import settings
from .lstm_forecast_service import LSTMForecastService


class EnhancedForecastService:
    """
    Enhanced forecast service using LSTM deep learning model
    Provides more accurate predictions than traditional time-series models
    """
    
    def __init__(self):
        self.lstm_service = LSTMForecastService()
        print("Enhanced Forecast Service initialized with LSTM model")


    def forecast_headways(self, route_id: str, date: str, day_of_week: str) -> List[TimeBandHeadway]:
        """
        Generate optimized time bands using LSTM predictions
        """
        print(f"Generating LSTM-optimized schedule for route {route_id} on {day_of_week} ({date})")
        return self.lstm_service.forecast_headways(route_id, date, day_of_week)


    def get_demand_insights(self, route_id: str, date: str, day_of_week: str) -> Dict:
        """
        Get demand insights using LSTM predictions
        """
        return self.lstm_service.get_demand_insights(route_id, date, day_of_week)

    def simulate_passenger_demand(self, route_id: str, date: str, day_of_week: str, scenario: str = "normal") -> List[Dict]:
        """
        Simulate passenger demand using LSTM predictions
        """
        return self.lstm_service.simulate_passenger_demand(route_id, date, day_of_week, scenario)