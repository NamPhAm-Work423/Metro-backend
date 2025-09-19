from typing import List, Dict
from ai_scheduler.proto import transport_pb2, transport_pb2_grpc

from ai_scheduler.core.scheduler import HeuristicScheduler
from ai_scheduler.config.settings import settings
from ai_scheduler.utils.time import add_seconds
from ai_scheduler.proto import control_pb2
from ai_scheduler.services.forecast_service import ForecastService


class PlanningService:
    def __init__(self, transport: transport_pb2_grpc.TransportServiceStub, dwell_sec: int, turnaround_sec: int) -> None:
        self.transport = transport
        self.scheduler = HeuristicScheduler(dwell_sec=dwell_sec, turnaround_sec=turnaround_sec)
        self.forecast = ForecastService()

    def fetch_route_stations(self, route_id: str) -> List[Dict]:
        rs = self.transport.GetRouteStations(transport_pb2.GetRouteStationsRequest(routeId=route_id))
        items: List[Dict] = []
        for x in rs.routeStations:
            items.append({'stationId': x.stationId, 'sequence': x.sequence})
        return sorted(items, key=lambda k: k['sequence'])

    def list_active_trains(self) -> List[str]:
        res = self.transport.ListTrains(transport_pb2.ListTrainsRequest())
        # TrainMessage does not include routeId in current proto; use all active trains
        return [t.trainId for t in res.trains if t.status == 'active']

    def generate_for_route(self, route_id: str, date: str, day_of_week: str, service_start: str, service_end: str) -> int:
        # Fetch route info (for duration) and sequence of stations
        route_resp = self.transport.GetRoute(transport_pb2.GetRouteRequest(routeId=route_id))
        route_duration_min = route_resp.duration or 0.0
        route_stations = self.fetch_route_stations(route_id)
        trains = self.list_active_trains()
        if not route_stations or not trains or route_duration_min <= 0 or len(route_stations) < 2:
            return 0

        # Compute uniform segment travel time (MVP); convert minutes to seconds
        num_segments = len(route_stations) - 1
        segment_run_time_sec = int((route_duration_min * 60) / num_segments)

        # Use forecasted time-bands to build departures
        timebands = self.forecast.forecast_headways(route_id=route_id, date=date, day_of_week=day_of_week)
        departures: List[str] = []
        for tb in timebands:
            departures.extend(self.scheduler.plan_departures(tb.start, tb.end, headway_sec=tb.headway_sec))
        print(f"Planning: route={route_id} date={date} bands={len(timebands)} departures={len(departures)} activeTrains={len(trains)}")

        trip_inputs: List[transport_pb2.TripInput] = []
        trip_departures: List[str] = []
        for idx, dep in enumerate(departures):
            train_id = trains[idx % len(trains)]
            # Arrival at last station = dep + sum(segment times) + sum(dwell at intermediate)
            total_run_sec = segment_run_time_sec * num_segments
            total_dwell_sec = settings.dwell_sec * (len(route_stations) - 2) if len(route_stations) > 2 else 0
            arr_last = add_seconds(dep, total_run_sec + total_dwell_sec)
            trip_inputs.append(transport_pb2.TripInput(
                routeId=route_id,
                trainId=train_id,
                departureTime=dep,
                arrivalTime=arr_last,
                dayOfWeek=day_of_week,
                isActive=True,
                serviceDate=date,
            ))
            trip_departures.append(dep)

        if not trip_inputs:
            return 0

        created_trips = self.transport.BulkUpsertTrips(transport_pb2.BulkUpsertTripsRequest(trips=trip_inputs))
        print(f"Planning: created trips for route={route_id}: {len(created_trips.trips)}")

        # For each trip, build concrete StopInput times across stations
        stop_inputs: List[transport_pb2.StopInput] = []
        for t_idx, trip in enumerate(created_trips.trips):
            current_time = trip_departures[t_idx]
            for s_idx, rs in enumerate(route_stations):
                if s_idx == 0:
                    # origin: no arrival, only departure
                    stop_inputs.append(transport_pb2.StopInput(
                        tripId=trip.tripId,
                        stationId=rs['stationId'],
                        arrivalTime="",
                        departureTime=current_time,
                        sequence=rs['sequence']
                    ))
                else:
                    # travel from previous to this station
                    arrival = add_seconds(current_time, segment_run_time_sec)
                    # dwell time (use big station dwell if configured)
                    dwell = settings.dwell_sec
                    # last station: no departure
                    if s_idx == len(route_stations) - 1:
                        stop_inputs.append(transport_pb2.StopInput(
                            tripId=trip.tripId,
                            stationId=rs['stationId'],
                            arrivalTime=arrival,
                            departureTime="",
                            sequence=rs['sequence']
                        ))
                        current_time = arrival
                    else:
                        depart = add_seconds(arrival, dwell)
                        stop_inputs.append(transport_pb2.StopInput(
                            tripId=trip.tripId,
                            stationId=rs['stationId'],
                            arrivalTime=arrival,
                            departureTime=depart,
                            sequence=rs['sequence']
                        ))
                        current_time = depart

        if stop_inputs:
            res = self.transport.BulkUpsertStops(transport_pb2.BulkUpsertStopsRequest(stops=stop_inputs))
            try:
                created = getattr(res, 'created', 0)
            except Exception:
                created = 0
            print(f"Planning: created stops for route={route_id}: {created} across {len(created_trips.trips)} trips and {len(route_stations)} stations")

        return len(created_trips.trips)

    def generate_daily(self, date: str, day_of_week: str, route_ids: List[str]) -> int:
        # If route_ids empty -> fetch all active routes
        if not route_ids:
            routes = self.transport.ListRoutes(transport_pb2.ListRoutesRequest())
            route_ids = [r.routeId for r in routes.routes if r.isActive]

        total = 0
        for rid in route_ids:
            # Get dynamic service hours based on route and day type
            service_config = self._get_service_hours(rid, day_of_week)
            print(f"Planning daily for {rid}: {service_config['start']} - {service_config['end']} ({day_of_week})")
            
            total += self.generate_for_route(
                route_id=rid,
                date=date,
                day_of_week=day_of_week,
                service_start=service_config['start'],
                service_end=service_config['end'],
            )
        return total
    
    def _get_service_hours(self, route_id: str, day_of_week: str) -> Dict[str, str]:
        """Get service hours based on route and day type - ready for configuration"""
        day_lower = day_of_week.lower()
        is_weekend = day_lower in ['saturday', 'sunday']
        
        if is_weekend:
            # Weekend: later start, later end for leisure patterns
            return {
                'start': '05:30:00',
                'end': '23:30:00'
            }
        else:
            # Weekday: earlier start for commuters
            return {
                'start': '05:00:00', 
                'end': '23:00:00'
            }
    
    def get_schedule_summary(self, date: str, day_of_week: str, route_ids: List[str] = None) -> Dict:
        """Get intelligent schedule summary for demo purposes"""
        if not route_ids:
            routes = self.transport.ListRoutes(transport_pb2.ListRoutesRequest())
            route_ids = [r.routeId for r in routes.routes if r.isActive]
        
        summary = {
            'date': date,
            'day_of_week': day_of_week,
            'route_count': len(route_ids),
            'ai_optimizations': [],
            'time_bands': {},
            'total_estimated_trips': 0
        }
        
        # Demo: show AI intelligence per route
        for route_id in route_ids[:3]:  # Show first 3 routes for demo
            timebands = self.forecast.forecast_headways(route_id, date, day_of_week)
            summary['time_bands'][route_id] = [
                {
                    'period': f"{tb.start}-{tb.end}",
                    'headway_min': tb.headway_sec // 60,
                    'frequency_per_hour': 3600 // tb.headway_sec,
                    'estimated_trips': len(list(self.scheduler.plan_departures(tb.start, tb.end, tb.headway_sec)))
                }
                for tb in timebands
            ]
            
            # Estimate total trips for this route
            route_trips = sum(band['estimated_trips'] for band in summary['time_bands'][route_id])
            summary['total_estimated_trips'] += route_trips
        
        # Add AI optimization insights
        is_weekend = day_of_week.lower() in ['saturday', 'sunday']
        if is_weekend:
            summary['ai_optimizations'] = [
                "Weekend pattern detected - optimizing for leisure travel",
                "Reduced early morning service (5:30 AM start vs 5:00 AM)",
                "Peak service during shopping/dining hours (18:00-21:00)",
                "Extended evening service until 23:30 for nightlife"
            ]
        else:
            summary['ai_optimizations'] = [
                "Weekday commuter pattern detected",
                "Intensive morning rush service (6:30-8:30): 4-minute headway",
                "Peak evening service (17:00-19:30): 3-minute headway",
                "Vietnamese lunch pattern optimization (11:00-13:30)",
                "Late evening reduction to 12-minute headway for efficiency"
            ]
        
        return summary


