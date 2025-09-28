from dataclasses import dataclass
from typing import List, Tuple, Dict, Optional
from ai_scheduler.utils.time import iter_departures
from ai_scheduler.models import TimeBand, TimeBandHeadway
from ai_scheduler.services.forecast_service import ForecastService


@dataclass
class TripPlan:
    route_id: str
    train_id: str
    departure_time: str
    arrival_time: str
    day_of_week: str


class HeuristicScheduler:
    def __init__(self, dwell_sec: int, turnaround_sec: int, forecast_service: Optional[ForecastService] = None) -> None:
        self.dwell_sec = dwell_sec
        self.turnaround_sec = turnaround_sec
        self.forecast_service = forecast_service or ForecastService()

    def build_timebands(self, service_start: str, service_end: str, peak_headway_sec: int, offpeak_headway_sec: int, 
                       route_id: str = "default", date: str = "2024-01-01", day_of_week: str = "Monday") -> List[TimeBand]:
        """
        Build time bands using Prophet-enhanced forecasting
        Falls back to simple MVP if forecasting fails
        """
        try:
            # Use Prophet-enhanced forecasting
            prophet_timebands = self.forecast_service.forecast_headways(route_id, date, day_of_week)
            
            # Convert TimeBandHeadway to TimeBand
            timebands = []
            for tb in prophet_timebands:
                timebands.append(TimeBand(
                    start=tb.start,
                    end=tb.end,
                    headway_sec=tb.headway_sec
                ))
            
            print(f"Using Prophet-enhanced time bands for route {route_id}")
            return timebands
            
        except Exception as e:
            print(f"Prophet forecasting failed, using fallback: {e}")
            # Fallback to simple MVP
            return [TimeBand(start=service_start, end=service_end, headway_sec=offpeak_headway_sec)]

    def plan_departures(self, service_start: str, service_end: str, headway_sec: int) -> List[str]:
        return list(iter_departures(service_start, service_end, headway_sec))

    def compute_stops(self, route_stations: List[Dict]) -> List[Dict]:
        # MVP: leave arrival/departure blank; will be filled by upstream logic
        stops = []
        for rs in route_stations:
            stops.append({
                'stationId': rs['stationId'],
                'sequence': rs['sequence'],
                'arrivalTime': '',
                'departureTime': ''
            })
        return stops
    
    def get_demand_insights(self, route_id: str, date: str, day_of_week: str) -> Dict:
        """
        Get demand insights using Prophet recommendations
        """
        return self.forecast_service.get_demand_insights(route_id, date, day_of_week)
    
    def simulate_passenger_demand(self, route_id: str, date: str, day_of_week: str, scenario: str = "normal") -> List[Dict]:
        """
        Simulate passenger demand using Prophet insights
        """
        return self.forecast_service.simulate_passenger_demand(route_id, date, day_of_week, scenario)



