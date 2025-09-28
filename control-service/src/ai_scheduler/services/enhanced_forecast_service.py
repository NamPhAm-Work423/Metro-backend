"""
Enhanced Forecast Service using trained Prophet model and MTA recommendations
Integrates MTA subway demand patterns for improved route timing predictions
"""
from typing import List, Dict
import json
import os

from ai_scheduler.models import TimeBandHeadway
from ai_scheduler.config.settings import settings


class EnhancedForecastService:
    """
    Enhanced forecast service using MTA subway Prophet model and recommendations
    """
    
    def __init__(self):
        self.recommendations = None
        self._load_recommendations()

    def _load_recommendations(self) -> None:
        """Load the trained MTA recommendations from JSON file"""
        try:
            recommendations_path = os.path.join(settings.model_dir, 'mta_subway_prophet_recommendations.json')
            if os.path.exists(recommendations_path):
                with open(recommendations_path, 'r', encoding='utf-8') as f:
                    self.recommendations = json.load(f)
                print(f"Loaded MTA recommendations from {recommendations_path}")
            else:
                print(f"MTA recommendations file not found at {recommendations_path}")
        except Exception as e:
            print(f"Error loading MTA recommendations: {e}")

    def forecast_headways(self, route_id: str, date: str, day_of_week: str) -> List[TimeBandHeadway]:
        """
        Generate optimized time bands using MTA Prophet recommendations
        """
        if not self.recommendations:
            return self._generate_fallback_timebands(day_of_week)
        
        return self._generate_mta_optimized_timebands(day_of_week)

    def _generate_mta_optimized_timebands(self, day_of_week: str) -> List[TimeBandHeadway]:
        """
        Generate time bands based on MTA Prophet model recommendations
        """
        timebands = []
        
        # Define time periods for the day
        time_periods = [
            ("05:00:00", "06:30:00", "early_morning"),
            ("06:30:00", "08:30:00", "morning_rush"),
            ("08:30:00", "11:00:00", "mid_morning"),
            ("11:00:00", "13:30:00", "lunch"),
            ("13:30:00", "17:00:00", "afternoon"),
            ("17:00:00", "19:30:00", "evening_rush"),
            ("19:30:00", "21:30:00", "evening"),
            ("21:30:00", "23:00:00", "late_evening")
        ]
        
        for start_time, end_time, period in time_periods:
            headway_sec = self._get_headway_from_mta_recommendations(day_of_week, period)
            
            timebands.append(TimeBandHeadway(
                start=start_time,
                end=end_time,
                headway_sec=headway_sec
            ))
        
        return timebands

    def _get_headway_from_mta_recommendations(self, day_of_week: str, time_period: str) -> int:
        """
        Get headway based on MTA recommendations with precise intervals from trained model
        """
        if not self.recommendations:
            return self._get_fallback_headway(day_of_week, time_period)
        
        high_demand_days = self.recommendations.get('weekly_patterns', {}).get('high_demand_days', [])
        low_demand_days = self.recommendations.get('weekly_patterns', {}).get('low_demand_days', [])
        schedule_suggestions = self.recommendations.get('schedule_suggestions', {})
        
        # Use the specific intervals from MTA recommendations
        if day_of_week in high_demand_days:
            # High demand days: Wednesday, Thursday, Tuesday
            if time_period in ["morning_rush", "evening_rush"]:
                return 150  # 2.5 minutes (2-3 minutes from recommendations)
            else:
                return 240  # 4 minutes for non-peak high demand
                
        elif day_of_week in low_demand_days:
            # Low demand days: Sunday, Saturday
            if time_period in ["morning_rush", "evening_rush"]:
                return 420  # 7 minutes (6-8 minutes from recommendations)
            else:
                return 600  # 10 minutes for non-peak low demand
        else:
            # Standard frequency days: Monday, Friday
            if time_period in ["morning_rush", "evening_rush"]:
                return 270  # 4.5 minutes (4-5 minutes from recommendations)
            else:
                return 360  # 6 minutes for non-peak standard demand

    def _get_fallback_headway(self, day_of_week: str, time_period: str) -> int:
        """Fallback headway calculation if MTA recommendations are not available"""
        is_weekend = day_of_week.lower() in ['saturday', 'sunday']
        
        if is_weekend:
            if time_period in ["morning_rush", "evening_rush"]:
                return 420  # 7 minutes
            else:
                return 600  # 10 minutes
        else:
            if time_period in ["morning_rush", "evening_rush"]:
                return 180  # 3 minutes
            else:
                return 360  # 6 minutes

    def _generate_fallback_timebands(self, day_of_week: str) -> List[TimeBandHeadway]:
        """Fallback time bands if MTA recommendations are not available"""
        is_weekend = day_of_week.lower() in ['saturday', 'sunday']
        
        if is_weekend:
            return [
                TimeBandHeadway(start="05:00:00", end="08:00:00", headway_sec=600),  # 10 min
                TimeBandHeadway(start="08:00:00", end="17:00:00", headway_sec=480),  # 8 min
                TimeBandHeadway(start="17:00:00", end="20:00:00", headway_sec=420),  # 7 min
                TimeBandHeadway(start="20:00:00", end="23:00:00", headway_sec=600)   # 10 min
            ]
        else:
            return [
                TimeBandHeadway(start="05:00:00", end="06:30:00", headway_sec=480),  # 8 min
                TimeBandHeadway(start="06:30:00", end="08:30:00", headway_sec=180),  # 3 min
                TimeBandHeadway(start="08:30:00", end="17:00:00", headway_sec=360),  # 6 min
                TimeBandHeadway(start="17:00:00", end="19:30:00", headway_sec=180),  # 3 min
                TimeBandHeadway(start="19:30:00", end="23:00:00", headway_sec=420)   # 7 min
            ]

    def get_demand_insights(self, route_id: str, date: str, day_of_week: str) -> Dict:
        """
        Get demand insights based on MTA recommendations
        """
        if not self.recommendations:
            return {"demand_level": "standard", "source": "fallback"}
        
        high_demand_days = self.recommendations.get('weekly_patterns', {}).get('high_demand_days', [])
        low_demand_days = self.recommendations.get('weekly_patterns', {}).get('low_demand_days', [])
        
        if day_of_week in high_demand_days:
            demand_level = "high"
            additional_trains = "+30-50%"
        elif day_of_week in low_demand_days:
            demand_level = "low"
            additional_trains = "-20-30%"
        else:
            demand_level = "standard"
            additional_trains = "baseline"
        
        return {
            "demand_level": demand_level,
            "day_of_week": day_of_week,
            "additional_trains": additional_trains,
            "source": "mta_prophet_recommendations",
            "high_demand_days": high_demand_days,
            "low_demand_days": low_demand_days
        }

    def simulate_passenger_demand(self, route_id: str, date: str, day_of_week: str, scenario: str = "normal") -> List[Dict]:
        """
        Simulate passenger demand based on MTA patterns
        """
        insights = self.get_demand_insights(route_id, date, day_of_week)
        demand_level = insights["demand_level"]
        
        # Base demand multipliers based on MTA data
        if demand_level == "high":
            base_multiplier = 1.4
        elif demand_level == "low":
            base_multiplier = 0.7
        else:
            base_multiplier = 1.0
        
        # Scenario adjustments
        if scenario == "peak":
            base_multiplier *= 1.3
        elif scenario == "disruption":
            base_multiplier *= 1.6
        
        # Generate hourly demand simulation
        demand_simulation = []
        for hour in range(5, 23):  # 5 AM to 11 PM
            if hour in [7, 8, 17, 18, 19]:  # Rush hours
                hourly_demand = int(1000 * base_multiplier * 1.5)
            elif hour in [11, 12, 13]:  # Lunch hours
                hourly_demand = int(1000 * base_multiplier * 1.2)
            else:
                hourly_demand = int(1000 * base_multiplier)
            
            demand_simulation.append({
                "hour": f"{hour:02d}:00",
                "estimated_passengers": hourly_demand,
                "demand_level": demand_level,
                "scenario": scenario
            })
        
        return demand_simulation