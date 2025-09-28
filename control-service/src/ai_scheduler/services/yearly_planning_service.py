"""
Yearly Planning Service - Generate schedules for entire year using MTA Prophet model
Optimizes metro operations based on seasonal patterns and demand forecasts
"""
from typing import List, Dict, Optional
from datetime import datetime, timedelta, date
import calendar

from ai_scheduler.proto import transport_pb2, transport_pb2_grpc
from ai_scheduler.services.planning_service import PlanningService
from ai_scheduler.services.enhanced_forecast_service import EnhancedForecastService
from ai_scheduler.config.settings import settings


class YearlyPlanningService:
    """
    Service for generating yearly schedules using MTA Prophet model insights
    """
    
    def __init__(self, transport: transport_pb2_grpc.TransportServiceStub):
        self.transport = transport
        self.planning = PlanningService(transport, dwell_sec=settings.dwell_sec, turnaround_sec=settings.turnaround_sec)
        self.enhanced_forecast = EnhancedForecastService()
    
    def generate_yearly_schedule_simple(self, year: int) -> int:
        """
        Generate complete yearly schedule for all routes using MTA Prophet model
        Simple version - just returns total trips generated
        """
        print(f"Generating yearly schedule for {year} using MTA Prophet model...")
        
        # Get all active routes
        route_ids = self._get_all_active_routes()
        if not route_ids:
            print("No active routes found")
            return 0
        
        total_trips = 0
        start_date = date(year, 1, 1)
        end_date = date(year, 12, 31)
        
        print(f"Processing {len(route_ids)} routes for 365 days...")
        
        # Generate for each day of the year
        current_date = start_date
        day_count = 0
        
        while current_date <= end_date:
            date_str = current_date.strftime("%Y-%m-%d")
            day_of_week = current_date.strftime("%A")
            
            # Generate for all routes on this day
            for route_id in route_ids:
                try:
                    trips = self.planning.generate_for_route(
                        route_id=route_id,
                        date=date_str,
                        day_of_week=day_of_week,
                        service_start="05:00:00",
                        service_end="23:00:00"
                    )
                    total_trips += trips
                except Exception as e:
                    print(f"Error on {date_str} for route {route_id}: {e}")
                    continue
            
            day_count += 1
            
            # Progress update every week
            if day_count % 7 == 0:
                print(f"Day {day_count}/365: {total_trips} trips generated so far")
            
            current_date += timedelta(days=1)
        
        print(f"Yearly schedule completed!")
        print(f"Generated {total_trips} trips for {len(route_ids)} routes across 365 days")
        
        return total_trips
    
    def _generate_route_yearly_schedule(self, route_id: str, year: int, 
                                      service_start: str, service_end: str) -> Dict:
        """
        Generate yearly schedule for a specific route
        """
        route_stats = {
            "route_id": route_id,
            "trips_generated": 0,
            "days_processed": 0,
            "monthly_breakdown": {},
            "demand_distribution": {"high": 0, "low": 0, "standard": 0}
        }
        
        # Process each month
        for month in range(1, 13):
            month_name = calendar.month_name[month]
            print(f"Processing {month_name} {year}")
            
            month_stats = self._generate_monthly_schedule(
                route_id, year, month, service_start, service_end
            )
            
            route_stats["monthly_breakdown"][month_name] = month_stats
            route_stats["trips_generated"] += month_stats["trips_generated"]
            route_stats["days_processed"] += month_stats["days_processed"]
            
            # Aggregate demand distribution
            for demand_type in ["high", "low", "standard"]:
                route_stats["demand_distribution"][demand_type] += month_stats["demand_distribution"][demand_type]
        
        return route_stats
    
    def _generate_monthly_schedule(self, route_id: str, year: int, month: int,
                                 service_start: str, service_end: str) -> Dict:
        """
        Generate schedule for a specific month
        """
        month_stats = {
            "trips_generated": 0,
            "days_processed": 0,
            "demand_distribution": {"high": 0, "low": 0, "standard": 0}
        }
        
        # Get number of days in month
        days_in_month = calendar.monthrange(year, month)[1]
        
        # Process each day
        for day in range(1, days_in_month + 1):
            current_date = date(year, month, day)
            date_str = current_date.strftime("%Y-%m-%d")
            day_of_week = current_date.strftime("%A")
            
            try:
                # Generate schedule for this day
                trips_generated = self.planning.generate_for_route(
                    route_id=route_id,
                    date=date_str,
                    day_of_week=day_of_week,
                    service_start=service_start,
                    service_end=service_end
                )
                
                month_stats["trips_generated"] += trips_generated
                month_stats["days_processed"] += 1
                
                # Track demand distribution
                demand_insights = self.enhanced_forecast.get_demand_insights(route_id, date_str, day_of_week)
                demand_level = demand_insights.get("demand_level", "standard")
                month_stats["demand_distribution"][demand_level] += 1
                
                # Progress indicator for long operations
                if day % 7 == 0:  # Every week
                    print(f"Week {day//7 + 1}: {trips_generated} trips on {day_of_week}")
                    
            except Exception as e:
                print(f"Error generating schedule for {date_str}: {e}")
                continue
        
        return month_stats
    
    def _get_all_active_routes(self) -> List[str]:
        """
        Get all active routes from transport service
        """
        try:
            response = self.transport.ListRoutes(transport_pb2.ListRoutesRequest())
            return [route.routeId for route in response.routes if route.isActive]
        except Exception as e:
            print(f"Error fetching active routes: {e}")
            return []
    
    def _calculate_yearly_demand_stats(self, year: int) -> Dict:
        """
        Calculate yearly demand statistics based on MTA recommendations
        """
        if not self.enhanced_forecast.recommendations:
            return {"high_demand_days": 0, "low_demand_days": 0, "standard_demand_days": 0}
        
        high_demand_weekdays = self.enhanced_forecast.recommendations.get('weekly_patterns', {}).get('high_demand_days', [])
        low_demand_weekdays = self.enhanced_forecast.recommendations.get('weekly_patterns', {}).get('low_demand_days', [])
        
        # Count days by type for the entire year
        start_date = date(year, 1, 1)
        end_date = date(year, 12, 31)
        
        high_count = 0
        low_count = 0
        standard_count = 0
        
        current_date = start_date
        while current_date <= end_date:
            day_name = current_date.strftime("%A")
            
            if day_name in high_demand_weekdays:
                high_count += 1
            elif day_name in low_demand_weekdays:
                low_count += 1
            else:
                standard_count += 1
            
            current_date += timedelta(days=1)
        
        return {
            "high_demand_days": high_count,
            "low_demand_days": low_count, 
            "standard_demand_days": standard_count
        }
    
    def generate_quarterly_schedule(self, year: int, quarter: int, route_ids: Optional[List[str]] = None) -> Dict:
        """
        Generate schedule for a specific quarter
        
        Args:
            year: Year
            quarter: Quarter (1-4)
            route_ids: List of route IDs
            
        Returns:
            Generation statistics
        """
        if quarter not in [1, 2, 3, 4]:
            raise ValueError("Quarter must be 1, 2, 3, or 4")
        
        # Define quarter months
        quarter_months = {
            1: [1, 2, 3],    # Q1: Jan, Feb, Mar
            2: [4, 5, 6],    # Q2: Apr, May, Jun
            3: [7, 8, 9],    # Q3: Jul, Aug, Sep
            4: [10, 11, 12]  # Q4: Oct, Nov, Dec
        }
        
        print(f"Generating Q{quarter} {year} schedule")
        
        if not route_ids:
            route_ids = self._get_all_active_routes()
        
        stats = {
            "year": year,
            "quarter": quarter,
            "routes_processed": 0,
            "trips_generated": 0,
            "route_stats": {}
        }
        
        for route_id in route_ids:
            route_trips = 0
            for month in quarter_months[quarter]:
                month_stats = self._generate_monthly_schedule(
                    route_id, year, month, "05:00:00", "23:00:00"
                )
                route_trips += month_stats["trips_generated"]
            
            stats["route_stats"][route_id] = {"trips_generated": route_trips}
            stats["trips_generated"] += route_trips
            stats["routes_processed"] += 1
        
        print(f"Q{quarter} {year} generation completed: {stats['trips_generated']} trips")
        return stats
    
    def get_yearly_schedule_summary(self, year: int, route_id: Optional[str] = None) -> Dict:
        """
        Get summary of yearly schedule with MTA Prophet insights
        """
        summary = {
            "year": year,
            "mta_model_insights": {},
            "seasonal_patterns": {},
            "optimization_recommendations": []
        }
        
        if self.enhanced_forecast.recommendations:
            # Add MTA model insights
            summary["mta_model_insights"] = {
                "high_demand_days": self.enhanced_forecast.recommendations.get('weekly_patterns', {}).get('high_demand_days', []),
                "low_demand_days": self.enhanced_forecast.recommendations.get('weekly_patterns', {}).get('low_demand_days', []),
                "schedule_suggestions": self.enhanced_forecast.recommendations.get('schedule_suggestions', {})
            }
            
            # Add seasonal optimization recommendations
            summary["optimization_recommendations"] = [
                f"High frequency service on {', '.join(summary['mta_model_insights']['high_demand_days'])}: 2-3 minute intervals",
                f"Reduced service on {', '.join(summary['mta_model_insights']['low_demand_days'])}: 6-8 minute intervals",
                "Dynamic scheduling based on real-time MTA demand patterns",
                "Seasonal adjustments for holidays and special events"
            ]
        
        return summary
