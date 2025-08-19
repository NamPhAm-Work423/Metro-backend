## Control Service (AI Scheduler)

### Overview
AI-powered Metro schedule optimization service for TPHCM Metro system using Prophet ML forecasting.

- **gRPC port**: 8008 (configurable via `CONTROL_GRPC_PORT`)
- **HTTP health**: `/health` endpoint on `PORT` (default 8008)
- **Dependencies**: `transport-service` gRPC for routes/trains data
- **Auto scheduling**: Daily job at 03:00 generates optimized schedules

### 🧠 AI Features
**Prophet ML Forecasting:**
- Historical demand pattern analysis
- Seasonal trend recognition (daily/weekly)
- Peak hour detection (6-9 AM, 5-8 PM)
- Holiday and weekend optimization

**Dynamic Headway Optimization:**
- Rush hour: 6-minute headway (high demand)
- Normal hours: 10-minute headway 
- Off-peak: 15-minute headway (low demand)
- Real-time demand-responsive adjustments

**Smart Trip Planning:**
- Optimal departure time distribution
- Train-route assignment optimization
- Station dwell time calculation
- Multi-route system coordination

### Core Components
- `ForecastService`: Prophet-based demand prediction
- `PlanningService`: AI schedule generation logic  
- `HeuristicScheduler`: Trip timing optimization
- `ControlGrpcService`: gRPC API interface

### 🚀 Quick Start

#### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

#### 2. Generate gRPC Stubs
```bash
python -m grpc_tools.protoc -I proto \
  --python_out=src/ai_scheduler/proto \
  --grpc_python_out=src/ai_scheduler/proto \
  proto/control.proto proto/transport.proto
```

#### 3. Start AI Scheduler
```bash
export PYTHONPATH=src
export CONTROL_GRPC_HOST=0.0.0.0
export CONTROL_GRPC_PORT=8008
export PORT=8008
python src/app.py
```

#### 4. Run Demo
```bash
# Make sure transport-service is running first!
export PYTHONPATH=src
python src/ai_scheduler/examples/ai_scheduler_demo.py
```

### Run via Docker
```bash
docker build -t control-service:dev ./control-service
docker run --rm -e CONTROL_GRPC_PORT=8008 -p 8008:8008 control-service:dev
```

### Docker Compose
Service is already added in root `docker-compose.yml` as `control-service` with `CONTROL_GRPC_PORT=8008` and dependency on `transport-service`.

### 🧪 Testing & Development

#### Test Prophet Model
```bash
export PYTHONPATH=src
python -m ai_scheduler.tests.smoke_forecast
```

#### Pre-train Models (Optional)
```bash
export PYTHONPATH=src
# Specify routes: export PRETRAIN_ROUTES="tuyen-metro-so-1,tuyen-metro-so-2"
python -m ai_scheduler.tests.pretrain
```

#### API Testing
```bash
# Test individual route scheduling
grpcurl -plaintext localhost:8008 control.ControlService/GenerateSchedule

# Test daily system-wide scheduling  
grpcurl -plaintext localhost:8008 control.ControlService/GenerateDailySchedules
```

### Configuration
See `env.example` for defaults:
- `CONTROL_GRPC_HOST` (default 0.0.0.0), `CONTROL_GRPC_PORT` (default 8008)
- `PORT` for HTTP health (default 8008)
- `TRANSPORT_GRPC_HOST`, `TRANSPORT_GRPC_PORT`
- `MODEL_DIR` (default `models`), `PRETRAIN_ROUTES` (CSV)
- Default dwell/turnaround/headway settings


