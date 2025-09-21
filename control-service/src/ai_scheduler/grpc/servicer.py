import grpc
from datetime import datetime

from ai_scheduler.proto import control_pb2, control_pb2_grpc, transport_pb2, transport_pb2_grpc

from ai_scheduler.config.settings import settings
from ai_scheduler.services.planning_service import PlanningService
from ai_scheduler.services.yearly_planning_service import YearlyPlanningService


def _make_transport_channel():
    return grpc.insecure_channel(f"{settings.transport_grpc_host}:{settings.transport_grpc_port}")


class ControlGrpcService(control_pb2_grpc.ControlServiceServicer):
    def __init__(self) -> None:
        self.channel = _make_transport_channel()
        self.transport = transport_pb2_grpc.TransportServiceStub(self.channel)
        self.planning = PlanningService(self.transport, dwell_sec=settings.dwell_sec, turnaround_sec=settings.turnaround_sec)
        self.yearly_planning = YearlyPlanningService(self.transport)

    def GenerateSchedule(self, request, context):
        """Generate AI-optimized schedule for a specific route"""
        try:
            print(f"AI Scheduler: Generating schedule for route {request.routeId}")
            print(f"Date: {request.date} ({request.dayOfWeek})")
            print(f"Service: {request.serviceStart} - {request.serviceEnd}")
            
            total = self.planning.generate_for_route(
                route_id=request.routeId,
                date=request.date,
                day_of_week=request.dayOfWeek,
                service_start=request.serviceStart,
                service_end=request.serviceEnd,
            )
            
            print(f"Generated {total} trips for route {request.routeId}")
            return control_pb2.GenerateScheduleResponse(trips=total)
            
        except grpc.RpcError as e:
            print(f"gRPC Error: {e.code()} - {e.details()}")
            context.set_code(e.code())
            context.set_details(e.details())
            return control_pb2.GenerateScheduleResponse(trips=0)
        except Exception as e:
            print(f"Error generating schedule: {str(e)}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return control_pb2.GenerateScheduleResponse(trips=0)

    def Reschedule(self, request, context):
        """Basic rescheduling - placeholder for future implementation"""
        try:
            # TODO: Implement smart rescheduling based on reasons and affected routes
            # For now, return success with 0 trips adjusted
            return control_pb2.RescheduleResponse(tripsAdjusted=0)
        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return control_pb2.RescheduleResponse(tripsAdjusted=0)

    def GetPlan(self, request, context):
        """Get generated plan for a route and date - with demo analytics"""
        try:
            # For demo purposes, return schedule summary
            summary = self.planning.get_schedule_summary(
                date=request.date,
                day_of_week=request.dayOfWeek if hasattr(request, 'dayOfWeek') else 'Monday',
                route_ids=[request.routeId] if request.routeId else None
            )
            
            # Convert to demo-friendly response (placeholder structure)
            print(f"Schedule Summary for {request.routeId} on {request.date}:")
            print(f"AI Optimizations: {len(summary.get('ai_optimizations', []))}")
            print(f"Time bands configured: {len(summary.get('time_bands', {}))}")
            
            return control_pb2.GetPlanResponse(items=[])
        except Exception as e:
            print(f"Error getting plan: {str(e)}")
            context.set_code(grpc.StatusCode.INTERNAL)  
            context.set_details(str(e))
            return control_pb2.GetPlanResponse(items=[])

    def GenerateDailySchedules(self, request, context):
        """Generate schedules for all routes on a given day"""
        try:
            print(f"AI Scheduler: Generating daily schedules for {request.date} ({request.dayOfWeek})")
            
            count = self.planning.generate_daily(
                date=request.date,
                day_of_week=request.dayOfWeek,
                route_ids=list(request.routeIds)
            )
            
            print(f"Generated {count} trips successfully")
            return control_pb2.GenerateScheduleResponse(trips=count)
            
        except grpc.RpcError as e:
            print(f"gRPC Error: {e.code()} - {e.details()}")
            context.set_code(e.code())
            context.set_details(e.details())
            return control_pb2.GenerateScheduleResponse(trips=0)
        except Exception as e:
            print(f"Error generating daily schedules: {str(e)}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return control_pb2.GenerateScheduleResponse(trips=0)

    def GenerateYearlySchedules(self, request, context):
        """Generate AI-optimized schedules for entire year using MTA Prophet model"""
        try:
            print(f"🚀 AI Scheduler: Generating yearly schedules for {request.year}")
            print(f"Routes: {list(request.routeIds) if request.routeIds else 'All active routes'}")
            print(f"Service hours: {request.serviceStart or '05:00:00'} - {request.serviceEnd or '23:00:00'}")
            
            # Generate yearly schedule
            stats = self.yearly_planning.generate_yearly_schedule(
                year=request.year,
                route_ids=list(request.routeIds) if request.routeIds else None,
                service_start=request.serviceStart or "05:00:00",
                service_end=request.serviceEnd or "23:00:00"
            )
            
            # Check for errors
            if "error" in stats:
                context.set_code(grpc.StatusCode.INTERNAL)
                context.set_details(stats["error"])
                return control_pb2.GenerateYearlyResponse(
                    year=request.year,
                    quarter=0,
                    success=False,
                    message=stats["error"]
                )
            
            print(f"✅ Generated {stats['trips_generated']} trips for {stats['routes_processed']} routes")
            
            # Return simplified response for now (protobuf needs to be regenerated)
            return control_pb2.GenerateScheduleResponse(trips=stats.get("trips_generated", 0))
            
        except Exception as e:
            print(f"❌ Error generating yearly schedules: {str(e)}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return control_pb2.GenerateScheduleResponse(trips=0)

    def GenerateQuarterlySchedules(self, request, context):
        """Generate AI-optimized schedules for a quarter using MTA Prophet model"""
        try:
            print(f"🗓️ AI Scheduler: Generating Q{request.quarter} {request.year} schedules")
            
            stats = self.yearly_planning.generate_quarterly_schedule(
                year=request.year,
                quarter=request.quarter,
                route_ids=list(request.routeIds) if request.routeIds else None
            )
            
            print(f"✅ Generated {stats['trips_generated']} trips for Q{request.quarter}")
            
            # Return simplified response for now
            return control_pb2.GenerateScheduleResponse(trips=stats.get("trips_generated", 0))
            
        except Exception as e:
            print(f"❌ Error generating quarterly schedules: {str(e)}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return control_pb2.GenerateScheduleResponse(trips=0)

    def GetYearlyScheduleSummary(self, request, context):
        """Get yearly schedule summary with MTA Prophet insights"""
        try:
            print(f"📊 Getting yearly schedule summary for {request.year}")
            
            summary = self.yearly_planning.get_yearly_schedule_summary(
                year=request.year,
                route_id=request.routeId if request.routeId else None
            )
            
            # Return simplified response for now
            return control_pb2.GetPlanResponse(items=[])
            
        except Exception as e:
            print(f"❌ Error getting yearly summary: {str(e)}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return control_pb2.GetPlanResponse(items=[])


