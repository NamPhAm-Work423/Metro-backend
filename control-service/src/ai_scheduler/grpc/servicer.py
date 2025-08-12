import grpc

from ai_scheduler.proto import control_pb2, control_pb2_grpc, transport_pb2, transport_pb2_grpc

from ai_scheduler.config.settings import settings
from ai_scheduler.services.planning_service import PlanningService


def _make_transport_channel():
    return grpc.insecure_channel(f"{settings.transport_grpc_host}:{settings.transport_grpc_port}")


class ControlGrpcService(control_pb2_grpc.ControlServiceServicer):
    def __init__(self) -> None:
        self.channel = _make_transport_channel()
        self.transport = transport_pb2_grpc.TransportServiceStub(self.channel)
        self.planning = PlanningService(self.transport, dwell_sec=settings.dwell_sec, turnaround_sec=settings.turnaround_sec)

    def GenerateSchedule(self, request, context):
        try:
            total = self.planning.generate_for_route(
                route_id=request.routeId,
                date=request.date,
                day_of_week=request.dayOfWeek,
                service_start=request.serviceStart,
                service_end=request.serviceEnd,
            )
            return control_pb2.GenerateScheduleResponse(trips=total)
        except grpc.RpcError as e:
            context.set_code(e.code())
            context.set_details(e.details())
            return control_pb2.GenerateScheduleResponse(trips=0)
        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return control_pb2.GenerateScheduleResponse(trips=0)

    def Reschedule(self, request, context):
        return control_pb2.RescheduleResponse(tripsAdjusted=0)

    def GetPlan(self, request, context):
        return control_pb2.GetPlanResponse(items=[])

    def GenerateDailySchedules(self, request, context):
        try:
            count = self.planning.generate_daily(
                date=request.date,
                day_of_week=request.dayOfWeek,
                route_ids=list(request.routeIds)
            )
            return control_pb2.GenerateScheduleResponse(trips=count)
        except grpc.RpcError as e:
            context.set_code(e.code())
            context.set_details(e.details())
            return control_pb2.GenerateScheduleResponse(trips=0)
        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return control_pb2.GenerateScheduleResponse(trips=0)


