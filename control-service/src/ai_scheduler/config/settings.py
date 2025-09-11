import os
from dataclasses import dataclass, field
from typing import Set


@dataclass
class Settings:
    control_grpc_host: str = os.getenv('CONTROL_GRPC_HOST', '0.0.0.0')
    control_grpc_port: str = os.getenv('CONTROL_GRPC_PORT', '50053')
    http_port: str = os.getenv('PORT', '8008')
    transport_grpc_host: str = os.getenv('TRANSPORT_GRPC_HOST', 'transport-service')
    transport_grpc_port: str = os.getenv('TRANSPORT_GRPC_PORT', '50051')

    peak_headway_sec: int = int(os.getenv('DEFAULT_PEAK_HEADWAY_SEC', '360'))
    offpeak_headway_sec: int = int(os.getenv('DEFAULT_OFFPEAK_HEADWAY_SEC', '600'))
    dwell_sec: int = int(os.getenv('DEFAULT_DWELL_SEC', '40'))
    dwell_big_station_sec: int = int(os.getenv('DEFAULT_DWELL_BIG_STATION_SEC', '75'))
    turnaround_sec: int = int(os.getenv('DEFAULT_TURNAROUND_SEC', '600'))

    big_stations: Set[str] = field(default_factory=lambda: { 'Bến Thành' })

    # Model storage
    model_dir: str = os.getenv('MODEL_DIR', 'models')
    pretrain_routes_csv: str = os.getenv('PRETRAIN_ROUTES', '')

    init_seed_on_start: bool = os.getenv('INIT_SEED_ON_START', 'true').lower() in ('1','true','yes')
    init_seed_days: int = int(os.getenv('INIT_SEED_DAYS', '1'))


settings = Settings()


