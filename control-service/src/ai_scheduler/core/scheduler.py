from dataclasses import dataclass
from typing import List, Tuple, Dict
from ai_scheduler.utils.time import iter_departures
from ai_scheduler.models import TimeBand


@dataclass
class TripPlan:
    route_id: str
    train_id: str
    departure_time: str
    arrival_time: str
    day_of_week: str


class HeuristicScheduler:
    def __init__(self, dwell_sec: int, turnaround_sec: int) -> None:
        self.dwell_sec = dwell_sec
        self.turnaround_sec = turnaround_sec

    def build_timebands(self, service_start: str, service_end: str, peak_headway_sec: int, offpeak_headway_sec: int) -> List[TimeBand]:
        # Simple MVP: entire service window uses off-peak headway
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



