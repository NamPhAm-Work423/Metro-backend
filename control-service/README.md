## Control Service (AI Scheduler)

### Overview
This service exposes a gRPC API to generate train schedules using a simple AI-driven headway forecast.

- gRPC port: 8008 (configurable via `CONTROL_GRPC_PORT`)
- HTTP health: `/: 404`, `/health: 200` on `PORT` (default 8008)
- Depends on `transport-service` gRPC for routes/trains CRUD
- Daily auto job at 03:00 calls `GenerateDailySchedules`

### Model
The `ForecastService` estimates demand over the service day and maps it to dynamic headways:

1) Train a per-route demand model (Prophet if available; otherwise a synthetic fallback)
2) Predict demand at 15-minute intervals
3) Map demand quantiles → headways:
   - <= 25%: 900s (15m)
   - <= 50%: 600s (10m)
   - <= 75%: 480s (8m)
   - >  75%: 360s (6m)

The resulting time-bands feed into the heuristic scheduler to generate trip departures and stop times.

Key files:
- `src/ai_scheduler/services/forecast_service.py`
- `src/ai_scheduler/core/scheduler.py`
- `src/ai_scheduler/grpc/servicer.py`
- `src/ai_scheduler/models.py`

### Run locally (virtualenv)
```bash
# 1) Install deps (optional: Prophet may require extra system libs; fallback works without it)
pip install -r requirements.txt

# 2) Generate gRPC stubs
python -m grpc_tools.protoc -I proto \
  --python_out=src/ai_scheduler/proto \
  --grpc_python_out=src/ai_scheduler/proto \
  proto/control.proto proto/transport.proto

# 3) Start server (default port 8008)
export PYTHONPATH=src
export CONTROL_GRPC_HOST=0.0.0.0
export CONTROL_GRPC_PORT=50053
export PORT=8008
python src/app.py
```

### Run via Docker
```bash
docker build -t control-service:dev ./control-service
docker run --rm -e CONTROL_GRPC_PORT=8008 -p 8008:8008 control-service:dev
```

### Docker Compose
Service is already added in root `docker-compose.yml` as `control-service` with `CONTROL_GRPC_PORT=8008` and dependency on `transport-service`.

### Smoke test the model
```bash
export PYTHONPATH=src
python -m ai_scheduler.tests.smoke_forecast
```
You should see several `TimeBandHeadway(...)` lines printed.

### Pre-train models
```bash
export PYTHONPATH=src
# Optionally specify routes: export PRETRAIN_ROUTES="R1,R2"
python -m ai_scheduler.tests.pretrain
```
Models will be stored in `models/` directory (configurable via `MODEL_DIR`).

### Configuration
See `env.example` for defaults:
- `CONTROL_GRPC_HOST` (default 0.0.0.0), `CONTROL_GRPC_PORT` (default 8008)
- `PORT` for HTTP health (default 8008)
- `TRANSPORT_GRPC_HOST`, `TRANSPORT_GRPC_PORT`
- `MODEL_DIR` (default `models`), `PRETRAIN_ROUTES` (CSV)
- Default dwell/turnaround/headway settings


