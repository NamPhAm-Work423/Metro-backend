import os
import grpc
from ai_scheduler.proto import transport_pb2_grpc


def create_transport_stub() -> transport_pb2_grpc.TransportServiceStub:
    host = os.getenv('TRANSPORT_GRPC_HOST', 'localhost')
    port = os.getenv('TRANSPORT_GRPC_PORT', '50051')
    channel = grpc.insecure_channel(f"{host}:{port}")
    return transport_pb2_grpc.TransportServiceStub(channel)


