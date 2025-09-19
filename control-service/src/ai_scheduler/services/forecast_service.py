from typing import List, Optional, Dict
import pandas as pd
import numpy as np
try:
    from prophet import Prophet  # type: ignore
except Exception:  # Prophet may be unavailable in some environments
    Prophet = None  # type: ignore
from ai_scheduler.models import TimeBandHeadway
import os
import joblib
from ai_scheduler.config.settings import settings


class ForecastService:
    def __init__(self):
        self.models = {}
        os.makedirs(settings.model_dir, exist_ok=True)

    def _load_model_from_disk(self, route_id: str) -> Optional[object]:
        path = os.path.join(settings.model_dir, f"prophet_{route_id}.joblib")
        if os.path.isfile(path):
            try:
                return joblib.load(path)
            except Exception:
                return None
        return None

    def _save_model_to_disk(self, route_id: str, model: object) -> None:
        path = os.path.join(settings.model_dir, f"prophet_{route_id}.joblib")
        try:
            joblib.dump(model, path)
        except Exception:
            pass

    def _get_or_train_model(self, route_id: str):
        if route_id in self.models:
            return self.models[route_id]
        disk_model = self._load_model_from_disk(route_id)
        if disk_model is not None:
            self.models[route_id] = disk_model
            return disk_model
        if Prophet is None:
            # Mark as None to indicate fallback path without Prophet
            self.models[route_id] = None
            return None
        # Placeholder training with synthetic seasonal patterns
        rng = pd.date_range(start="2024-01-01", end="2025-01-01", freq="h")
        hours = rng.hour
        dows = rng.dayofweek
        peak_mask = ((dows >= 0) & (dows <= 4) & ((hours >= 6) & (hours <= 9) | (hours >= 16) & (hours <= 19)))
        base = 100 + 40*np.sin(2*np.pi*hours/24) + 60*(peak_mask.astype(int))
        df = pd.DataFrame({"ds": rng, "y": base + np.random.normal(0,5,size=len(rng))})
        m = Prophet(daily_seasonality=True, weekly_seasonality=True, yearly_seasonality=False)
        m.fit(df)
        self.models[route_id] = m
        self._save_model_to_disk(route_id, m)
        return m

    def forecast_headways(self, route_id: str, date: str, day_of_week: str) -> List[TimeBandHeadway]:
        """
        Smart synthetic patterns for Metro TPHCM based on:
        - TPHCM traffic patterns research
        - International metro best practices
        - Vietnamese work/school schedule
        """
        return self._generate_intelligent_timebands(route_id, date, day_of_week)

    def _generate_intelligent_timebands(self, route_id: str, date: str, day_of_week: str) -> List[TimeBandHeadway]:
        """
        Generate realistic time bands for TPHCM Metro based on:
        - Vietnamese work patterns: 8:00-17:00 typical office hours
        - Student patterns: 7:00-8:00, 11:30-13:00, 17:00-18:00
        - Shopping patterns: 18:00-21:00 evening rush
        - Weekend leisure patterns
        """
        day_lower = day_of_week.lower()
        is_weekend = day_lower in ['saturday', 'sunday']
        
        if is_weekend:
            return self._weekend_patterns()
        else:
            return self._weekday_patterns()
    
    def simulate_passenger_demand(self, route_id: str, date: str, day_of_week: str, scenario: str = "normal") -> List[Dict]:
        """
        Simulate passenger demand for demo purposes
        Returns list of hourly passenger counts with headway adjustments
        """
        base_patterns = self._generate_intelligent_timebands(route_id, date, day_of_week)
        demand_data = []
        
        # Scenario multipliers
        multipliers = {
            "normal": 1.0,
            "high_demand": 1.4,  # 40% increase
            "event": 1.8,        # 80% increase for special events  
            "weather": 1.3,      # 30% increase for bad weather
            "holiday": 1.6       # 60% increase for holidays
        }
        
        multiplier = multipliers.get(scenario, 1.0)
        
        for band in base_patterns:
            # Estimate passenger demand based on headway (inverse relationship)
            base_passengers = int(3600 / band.headway_sec * 800)  # 800 passengers per train capacity
            adjusted_passengers = int(base_passengers * multiplier)
            
            # Calculate optimal headway for this demand
            optimal_headway = self._calculate_optimal_headway_for_demand(adjusted_passengers)
            
            demand_data.append({
                'time_period': f"{band.start}-{band.end}",
                'passenger_count': adjusted_passengers,
                'original_headway_sec': band.headway_sec,
                'optimal_headway_sec': optimal_headway,
                'trains_per_hour_original': 3600 // band.headway_sec,
                'trains_per_hour_optimal': 3600 // optimal_headway,
                'capacity_utilization': min(adjusted_passengers / 1200, 1.0),  # 1200 = train capacity
                'scenario': scenario
            })
        
        return demand_data
    
    def _calculate_optimal_headway_for_demand(self, passenger_count: int) -> int:
        """Calculate optimal headway based on passenger demand"""
        train_capacity = 1200
        comfort_threshold = 0.7  # 70% for comfort
        
        # Calculate trains needed per hour
        trains_needed = max(1, int(passenger_count / (train_capacity * comfort_threshold)))
        
        # Convert to headway (seconds)
        optimal_headway = 3600 // trains_needed
        
        # Apply constraints
        min_headway = 120   # 2 minutes minimum
        max_headway = 1800  # 30 minutes maximum
        
        return max(min_headway, min(optimal_headway, max_headway))
    
    def _weekday_patterns(self) -> List[TimeBandHeadway]:
        """TPHCM weekday patterns with Vietnamese characteristics"""
        return [
            # Early morning (5:00-6:30): Low demand - 15min headway
            TimeBandHeadway(start="05:00:00", end="06:30:00", headway_sec=900),
            
            # Morning rush (6:30-8:30): High demand - 4min headway
            # Office workers + students going to work/school
            TimeBandHeadway(start="06:30:00", end="08:30:00", headway_sec=240),
            
            # Mid-morning (8:30-11:00): Medium-low demand - 8min headway  
            TimeBandHeadway(start="08:30:00", end="11:00:00", headway_sec=480),
            
            # Lunch time (11:00-13:30): Medium demand - 6min headway
            # Vietnamese lunch break patterns
            TimeBandHeadway(start="11:00:00", end="13:30:00", headway_sec=360),
            
            # Afternoon (13:30-17:00): Medium demand - 8min headway
            TimeBandHeadway(start="13:30:00", end="17:00:00", headway_sec=480),
            
            # Evening rush (17:00-19:30): Peak demand - 3min headway
            # Office + shopping + dinner rush
            TimeBandHeadway(start="17:00:00", end="19:30:00", headway_sec=180),
            
            # Evening (19:30-21:30): Medium demand - 6min headway
            # Leisure, shopping, dining
            TimeBandHeadway(start="19:30:00", end="21:30:00", headway_sec=360),
            
            # Late evening (21:30-23:00): Low demand - 12min headway
            TimeBandHeadway(start="21:30:00", end="23:00:00", headway_sec=720)
        ]
    
    def _weekend_patterns(self) -> List[TimeBandHeadway]:
        """TPHCM weekend patterns - leisure focused"""
        return [
            # Early morning (5:00-8:00): Very low demand - 20min headway
            TimeBandHeadway(start="05:00:00", end="08:00:00", headway_sec=1200),
            
            # Morning (8:00-10:00): Low demand - 12min headway
            TimeBandHeadway(start="08:00:00", end="10:00:00", headway_sec=720),
            
            # Late morning (10:00-12:00): Medium demand - 8min headway
            # Shopping, sightseeing starts
            TimeBandHeadway(start="10:00:00", end="12:00:00", headway_sec=480),
            
            # Afternoon (12:00-15:00): Medium demand - 6min headway
            # Lunch, shopping peak
            TimeBandHeadway(start="12:00:00", end="15:00:00", headway_sec=360),
            
            # Late afternoon (15:00-18:00): Medium-high demand - 5min headway
            # Tourism, shopping continues
            TimeBandHeadway(start="15:00:00", end="18:00:00", headway_sec=300),
            
            # Evening (18:00-21:00): High demand - 4min headway  
            # Dinner, entertainment, night markets
            TimeBandHeadway(start="18:00:00", end="21:00:00", headway_sec=240),
            
            # Late evening (21:00-23:00): Medium demand - 8min headway
            TimeBandHeadway(start="21:00:00", end="23:00:00", headway_sec=480)
        ]


