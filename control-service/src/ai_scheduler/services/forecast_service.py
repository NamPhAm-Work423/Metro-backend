"""
Forecast Service - Main interface for LSTM-based forecasting
Uses deep learning model trained on metro demand patterns for improved route timing predictions
"""
from typing import List, Dict
from ai_scheduler.models import TimeBandHeadway
from ai_scheduler.config.settings import settings
from .enhanced_forecast_service import EnhancedForecastService


class ForecastService:
    """
    Main forecast service that uses LSTM deep learning model for accurate predictions
    """
    
    def __init__(self):
        self.enhanced_service = EnhancedForecastService()
        print("✅ Forecast Service initialized with LSTM model")

    def forecast_headways(self, route_id: str, date: str, day_of_week: str) -> List[TimeBandHeadway]:
        """
        Enhanced forecasting using trained LSTM deep learning model
        """
        try:
            timebands = self.enhanced_service.forecast_headways(route_id, date, day_of_week)
            print(f"✅ Using LSTM-enhanced forecasting for route {route_id} on {day_of_week}")
            return timebands
        except Exception as e:
            print(f"⚠️ LSTM forecasting failed, using fallback: {e}")
            return self._generate_basic_timebands(day_of_week)

    def _generate_basic_timebands(self, day_of_week: str) -> List[TimeBandHeadway]:
        """Basic fallback time bands if enhanced service fails"""
        is_weekend = day_of_week.lower() in ['saturday', 'sunday']
        
        if is_weekend:
            return [
                TimeBandHeadway(start="05:00:00", end="08:00:00", headway_sec=720),   # 12 min
                TimeBandHeadway(start="08:00:00", end="17:00:00", headway_sec=600),   # 10 min
                TimeBandHeadway(start="17:00:00", end="20:00:00", headway_sec=480),   # 8 min
                TimeBandHeadway(start="20:00:00", end="23:00:00", headway_sec=720)    # 12 min
            ]
        else:
            return [
                TimeBandHeadway(start="05:00:00", end="06:30:00", headway_sec=600),   # 10 min
                TimeBandHeadway(start="06:30:00", end="08:30:00", headway_sec=240),   # 4 min
                TimeBandHeadway(start="08:30:00", end="17:00:00", headway_sec=480),   # 8 min
                TimeBandHeadway(start="17:00:00", end="19:30:00", headway_sec=240),   # 4 min
                TimeBandHeadway(start="19:30:00", end="23:00:00", headway_sec=600)    # 10 min
            ]

    def get_demand_insights(self, route_id: str, date: str, day_of_week: str) -> Dict:
        """
        Get demand insights using LSTM predictions
        """
        return self.enhanced_service.get_demand_insights(route_id, date, day_of_week)

    def simulate_passenger_demand(self, route_id: str, date: str, day_of_week: str, scenario: str = "normal") -> List[Dict]:
        """
        Simulate passenger demand using LSTM deep learning predictions
        """
        return self.enhanced_service.simulate_passenger_demand(route_id, date, day_of_week, scenario)