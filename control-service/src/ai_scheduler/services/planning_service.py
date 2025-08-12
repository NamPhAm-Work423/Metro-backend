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
                isActive=True
            ))
            trip_departures.append(dep)

        if not trip_inputs:
            return 0

        created_trips = self.transport.BulkUpsertTrips(transport_pb2.BulkUpsertTripsRequest(trips=trip_inputs))

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
            self.transport.BulkUpsertStops(transport_pb2.BulkUpsertStopsRequest(stops=stop_inputs))

        return len(created_trips.trips)

    def generate_daily(self, date: str, day_of_week: str, route_ids: List[str]) -> int:
        # If route_ids empty -> fetch all active routes
        if not route_ids:
            routes = self.transport.ListRoutes(transport_pb2.ListRoutesRequest())
            route_ids = [r.routeId for r in routes.routes if r.isActive]

        total = 0
        for rid in route_ids:
            # TODO: integrate ML forecast to determine time-band headways per route/day
            total += self.generate_for_route(
                route_id=rid,
                date=date,
                day_of_week=day_of_week,
                service_start="05:00:00",
                service_end="23:00:00",
            )
        return total


