# Control Service — Service README
> Mục đích: Mô tả kiến trúc, API, dữ liệu, vận hành, và tiêu chuẩn chất lượng cho service AI-powered Metro scheduling này.

## 1. Tổng quan
- **Chức năng chính**: AI-powered Metro schedule optimization system sử dụng Prophet ML forecasting và heuristic scheduling algorithms để tạo lịch trình tàu thông minh, thích ứng với nhu cầu hành khách
- **Vai trò trong hệ MetroHCM**: Core scheduling engine - tạo và tối ưu hóa lịch trình tàu cho toàn bộ hệ thống Metro TPHCM
- **Giao tiếp**: 
  - gRPC ⟷ Transport Service (route data, train fleet, trip persistence)
  - HTTP ⟷ API Gateway (health checks, metrics)
  - Event ⟷ (Kafka integration - planned)
- **Kiến trúc & pattern**: Layered Architecture với Service Layer, Dependency Injection, Strategy Pattern cho scheduling algorithms, Factory Pattern cho ML models

**Lưu đồ chuỗi cho luồng tạo lịch trình AI-optimized:**

```mermaid
sequenceDiagram
  participant Client
  participant ControlService
  participant PlanningService
  participant ForecastService
  participant TransportService
  Note over ControlService: AI Scheduler Core
  Client->>ControlService: GenerateSchedule(routeId, date, dayOfWeek)
  ControlService->>PlanningService: generate_for_route()
  PlanningService->>TransportService: GetRoute(routeId)
  TransportService-->>PlanningService: Route data (duration, stations)
  PlanningService->>TransportService: GetRouteStations(routeId)
  TransportService-->>PlanningService: Station sequence
  PlanningService->>TransportService: ListTrains()
  TransportService-->>PlanningService: Available trains
  PlanningService->>ForecastService: forecast_headways(routeId, date, dayOfWeek)
  Note over ForecastService: Prophet ML Demand Forecasting
  ForecastService-->>PlanningService: TimeBandHeadway[] (peak/off-peak)
  PlanningService->>PlanningService: plan_departures() + train assignment
  PlanningService->>TransportService: BulkUpsertTrips()
  TransportService-->>PlanningService: Created trips
  PlanningService->>TransportService: BulkUpsertStops()
  TransportService-->>PlanningService: Created stops
  PlanningService-->>ControlService: Total trips generated
  ControlService-->>Client: GenerateScheduleResponse(trips)
```

## 2. Sơ đồ Class (Class Diagram)

```mermaid
classDiagram
    class ControlService {
        +GenerateSchedule(request)
        +GenerateDailySchedules(request)
        +Reschedule(request)
        +GetPlan(request)
    }

    class PlanningService {
        +generate_for_route(routeId, date, dayOfWeek, serviceStart, serviceEnd)
        +plan_departures(startTime, endTime, headway)
        +assign_trains_to_trips(departures, trains)
        +calculate_trip_times(route, stations, departureTime)
        +create_trip_stops(trip, stations, segmentRunTime, dwellTime)
    }

    class ForecastService {
        +forecast_headways(routeId, date, dayOfWeek)
        +simulate_passenger_demand(routeId, date, dayOfWeek, scenario)
        +_get_or_train_model(routeId)
        +_load_model_from_disk(routeId)
        +_save_model_to_disk(routeId, model)
        +_generate_intelligent_timebands(routeId, date, dayOfWeek)
        +_calculate_optimal_headway_for_demand(passengerCount)
        +_weekday_patterns()
        +_weekend_patterns()
    }

    class HeuristicScheduler {
        +generate_departure_times(startTime, endTime, headway)
        +calculate_optimal_headway(demand, capacity)
        +adjust_headway_for_events(baseHeadway, eventType)
        +validate_schedule_feasibility(departures, constraints)
    }

    class TransportGrpcClient {
        +get_route(routeId)
        +get_route_stations(routeId)
        +list_trains()
        +bulk_upsert_trips(trips)
        +bulk_upsert_stops(stops)
        +get_route_by_id(routeId)
        +calculate_station_count(routeId)
    }

    class ModelManager {
        +load_model(routeId)
        +save_model(routeId, model)
        +train_model(routeId, data)
        +predict_demand(model, features)
        +validate_model_performance(model, testData)
        +get_model_info(routeId)
    }

    class ScheduleValidator {
        +validate_schedule(schedule)
        +check_capacity_constraints(schedule, trains)
        +validate_time_windows(schedule, serviceHours)
        +check_headway_consistency(schedule)
        +validate_route_coverage(schedule, stations)
    }

    class MetricsCollector {
        +record_schedule_generation_time(duration)
        +record_trips_generated(count)
        +record_forecast_accuracy(actual, predicted)
        +record_model_performance(metrics)
        +get_metrics_summary()
    }

    class HealthChecker {
        +check_transport_service_health()
        +check_model_availability()
        +check_disk_space()
        +get_health_status()
    }

    class ConfigManager {
        +get_default_headway_peak()
        +get_default_headway_offpeak()
        +get_default_dwell_time()
        +get_default_turnaround_time()
        +get_model_directory()
        +get_transport_service_config()
    }

    class TimeBandHeadway {
        +startTime: Time
        +endTime: Time
        +headwaySec: Integer
        +passengerDemand: Integer
        +scenario: String
    }

    class TripPlan {
        +tripId: String
        +routeId: String
        +trainId: String
        +departureTime: Time
        +arrivalTime: Time
        +dayOfWeek: String
        +serviceDate: Date
        +stops: StopPlan[]
    }

    class StopPlan {
        +stopId: String
        +stationId: String
        +arrivalTime: Time
        +departureTime: Time
        +sequence: Integer
    }

    class ScheduleRequest {
        +routeId: String
        +date: Date
        +dayOfWeek: String
        +serviceStart: Time
        +serviceEnd: Time
        +direction: String
    }

    class ScheduleResponse {
        +trips: Integer
        +success: Boolean
        +message: String
        +generatedAt: Timestamp
    }

    class ProphetModel {
        +routeId: String
        +modelData: Binary
        +trainedAt: Timestamp
        +accuracy: Float
        +lastUsed: Timestamp
    }

    ControlService --> PlanningService : uses
    ControlService --> MetricsCollector : uses
    ControlService --> HealthChecker : uses

    PlanningService --> ForecastService : uses
    PlanningService --> HeuristicScheduler : uses
    PlanningService --> TransportGrpcClient : uses
    PlanningService --> ScheduleValidator : uses

    ForecastService --> ModelManager : uses
    ForecastService --> TimeBandHeadway : creates

    HeuristicScheduler --> TripPlan : creates
    HeuristicScheduler --> StopPlan : creates

    ModelManager --> ProphetModel : manages

    TransportGrpcClient --> TripPlan : creates
    TransportGrpcClient --> StopPlan : creates

    ScheduleValidator --> TripPlan : validates
    ScheduleValidator --> StopPlan : validates

    ConfigManager --> PlanningService : configures
    ConfigManager --> ForecastService : configures
    ConfigManager --> HeuristicScheduler : configures

    MetricsCollector --> ControlService : monitors
    HealthChecker --> ControlService : monitors
```

## 2.1 Sơ đồ hệ thống (Mermaid)

```mermaid
graph TB
  AG[API Gateway] -->|HTTP Health| CS[Control Service]
  CS -->|gRPC| TS[Transport Service]
  CS -->|Model Storage| PM[(Prophet Models)]
  CS -->|Metrics| PROM[Prometheus]
  CS -->|HTTP Health| HS[Health Server :8008]
  TS -->|Database| DB[(MySQL)]
  TS -->|Cache| REDIS[(Redis)]
  
  subgraph CSG["Control Service Components"]
    PS[Planning Service]
    FS[Forecast Service]
    HS2[Heuristic Scheduler]
    PS --> FS
    PS --> HS2
  end
  
  CS -.-> PS
```

## 3. API & Hợp đồng

### 3.1 gRPC endpoints

| Method | RPC | Mô tả | Request | Response | Status Codes |
| ------ | --- | ----- | ------- | -------- | ------------ |
| GenerateSchedule | control.ControlService/GenerateSchedule | Tạo lịch trình AI-optimized cho 1 route | routeId, date, dayOfWeek, serviceStart, serviceEnd, direction | trips (int32) | OK, INTERNAL |
| GenerateDailySchedules | control.ControlService/GenerateDailySchedules | Tạo lịch trình cho tất cả routes trong ngày | date, dayOfWeek, routeIds[] | trips (int32) | OK, INTERNAL |
| Reschedule | control.ControlService/Reschedule | Reschedule real-time (placeholder) | fromTime, horizonMin, affectedRoutes[], reasons[] | tripsAdjusted (int32) | OK, INTERNAL |
| GetPlan | control.ControlService/GetPlan | Lấy plan đã tạo (placeholder) | routeId, date | TripWithStopsPlan[] | OK, INTERNAL |

### 3.2 HTTP endpoints

| Method | Path | Mô tả | Auth | Request | Response | Status Codes |
| ------ | ---- | ----- | ---- | ------- | -------- | ------------ |
| GET | /health | Health check | None | None | {"status":"ok"} | 200 |
| GET | /metrics | Prometheus metrics | None | None | Prometheus format | 200, 500 |

### 3.3 Proto files

* **Vị trí file**: `proto/control.proto`, `proto/transport.proto`
* **Cách build/generate**: 
  ```bash
  python -m grpc_tools.protoc -Iproto \
    --python_out=src/ai_scheduler/proto \
    --grpc_python_out=src/ai_scheduler/proto \
    proto/control.proto proto/transport.proto
  ```
* **Versioning & Compatibility**: Proto3 syntax, backward compatible

### 3.4 Event (Kafka/Queue)

| Topic | Direction | Key | Schema | Semantics | Retry/DLQ |
| ----- | --------- | --- | ------ | --------- | --------- |
| (Không tìm thấy trong repo) | - | - | - | - | - |

## 3.5 Cách model/thuật toán hoạt động (thực tế trong code)

- Thành phần chính:
  - `PlanningService`: điều phối toàn bộ lập lịch cho một tuyến/ngày; gọi Transport-service, gọi dự báo, tạo trips & stops.
  - `HeuristicScheduler`: sinh danh sách giờ xuất phát đều nhau theo `headway` trong các time-band.
  - `ForecastService`: khung tích hợp Prophet (đào tạo/lưu `.joblib` theo `MODEL_DIR`). Hiện tại `forecast_headways()` trả về 1 time-band cố định [05:00:00 → 22:30:00] với `headway_sec = 1800` (30 phút).

- Dòng dữ liệu chi tiết
```mermaid
sequenceDiagram
  participant Client
  participant CS as Control gRPC
  participant PS as PlanningService
  participant TS as Transport gRPC
  participant FS as ForecastService

  Client->>CS: GenerateSchedule(routeId,date,dayOfWeek,serviceStart,serviceEnd)
  CS->>PS: generate_for_route(...)
  PS->>TS: GetRoute(routeId) -> duration(min)
  PS->>TS: GetRouteStations(routeId) -> [{stationId,sequence}]
  PS->>TS: ListTrains() -> active trainIds[]
  PS->>FS: forecast_headways(routeId,date,dayOfWeek)
  FS-->>PS: [ {start,end,headway_sec=1800} ]
  PS->>PS: plan_departures(start,end,headway)
  PS->>TS: BulkUpsertTrips(TripInput[])
  TS-->>PS: trips[]
  PS->>TS: BulkUpsertStops(StopInput[])
  TS-->>PS: created count
  PS-->>CS: trips count
  CS-->>Client: GenerateScheduleResponse(trips)
```

- Tính toán thời gian:
  - `num_segments = len(routeStations) - 1`
  - `segment_run_time_sec = (route.duration_min * 60) / num_segments`
  - Ga đầu: chỉ có `departureTime`. Ga cuối: chỉ `arrivalTime`.
  - Ga giữa: `arrival = prev + segment_run_time_sec`, `departure = arrival + dwell_sec`.

- Phân công tàu: vòng lặp modulo theo số tàu active (`trainId = trains[idx % len(trains)]`).

### 3.6 Tham số đầu vào/ra (mapping nhanh)
- Input từ client (gRPC): `routeId`, `date`, `dayOfWeek`, `serviceStart`, `serviceEnd`.
- Env (`settings`): `TRANSPORT_GRPC_HOST|PORT`, `DEFAULT_DWELL_SEC`, `DEFAULT_TURNAROUND_SEC`, `MODEL_DIR`.
- Từ Transport-service: `GetRoute.duration`, `GetRouteStations[]`, `ListTrains()` (lọc `status=='active'`).
- Output: `GenerateScheduleResponse.trips` (số trips đã tạo); thực thể Trips/Stops được lưu qua Transport-service.

## 4. Dữ liệu & Migrations

* **Loại CSDL**: Không có database riêng - sử dụng Transport Service MySQL
* **Dữ liệu chính**: 
  - Prophet ML models (Joblib format): `models/prophet_{routeId}.joblib`
  - Time series data: Synthetic patterns cho training
  - Trip/Stop data: Lưu trong Transport Service
* **Quan hệ & cascade**: N/A - stateless service
* **Seeds/fixtures**: Synthetic Prophet training data
* **Cách chạy migration**: N/A

## 5. Cấu hình & Secrets

### 5.1 Biến môi trường (bảng bắt buộc)

| ENV | Bắt buộc | Giá trị mẫu | Mô tả | Phạm vi |
| --- | -------- | ----------- | ----- | ------- |
| CONTROL_GRPC_HOST | No | 0.0.0.0 | gRPC server host | dev/prod |
| CONTROL_GRPC_PORT | No | 50053 | gRPC server port | dev/prod |
| PORT | No | 8008 | HTTP health server port | dev/prod |
| TRANSPORT_GRPC_HOST | Yes | transport-service | Transport service host | dev/prod |
| TRANSPORT_GRPC_PORT | Yes | 50051 | Transport service port | dev/prod |
| DEFAULT_PEAK_HEADWAY_SEC | No | 360 | Peak hour headway (6 min) | dev/prod |
| DEFAULT_OFFPEAK_HEADWAY_SEC | No | 600 | Off-peak headway (10 min) | dev/prod |
| DEFAULT_DWELL_SEC | No | 40 | Station dwell time | dev/prod |
| DEFAULT_DWELL_BIG_STATION_SEC | No | 75 | Major station dwell time | dev/prod |
| DEFAULT_TURNAROUND_SEC | No | 600 | Train turnaround time | dev/prod |
| MODEL_DIR | No | models | Prophet model storage path | dev/prod |
| INIT_SEED_ON_START | No | true | Generate initial schedules on startup | dev/prod |
| INIT_SEED_DAYS | No | 1 | Days to seed on startup | dev/prod |

### 5.2 Profiles

* **dev**: Local development với localhost transport service
* **staging**: Containerized với transport-service hostname
* **prod**: Production với full monitoring và persistence
* **Nguồn secrets**: Environment variables, Docker secrets

## 6. Bảo mật & Tuân thủ

* **AuthN/AuthZ**: Không có authentication - internal service
* **Input validation & sanitize**: gRPC proto validation, basic error handling
* **CORS & CSRF**: N/A - gRPC service
* **Rate limit / Anti-abuse**: ThreadPoolExecutor(max_workers=10)
* **Nhật ký/Audit**: Console logging, structured error messages
* **Lỗ hổng tiềm ẩn & khuyến nghị**: 
  - Cần thêm authentication cho production
  - Cần input validation cho date/time formats
  - Cần rate limiting cho gRPC calls

## 7. Độ tin cậy & Khả dụng

* **Timeouts/Retry/Backoff**: gRPC default timeouts, no retry logic
* **Circuit breaker/Bulkhead**: ThreadPoolExecutor isolation
* **Idempotency**: Daily scheduling với marker files để tránh duplicate
* **Outbox/Saga/Orchestrator**: N/A
* **Khả năng phục hồi sự cố**: 
  - Graceful degradation khi Prophet unavailable
  - Fallback synthetic patterns
  - Error recovery cho transport service failures

## 8. Observability

* **Logging**: Console logging với structured messages
  ```json
  {"level": "INFO", "message": "AI Scheduler: Generating schedule for route tuyen-metro-so-1", "routeId": "tuyen-metro-so-1", "date": "2024-01-15"}
  ```
* **Metrics**: Prometheus metrics qua `/metrics` endpoint
* **Tracing**: Không có distributed tracing
* **Healthchecks**: 
  - `/health`: Basic health check
  - gRPC health: Service availability
  - Transport service connectivity check

## 9. Build, Run, Test

### 9.1 Local

```bash
# prerequisites
python 3.11+
pip install -r requirements.txt

# generate gRPC stubs
python -m grpc_tools.protoc -Iproto \
  --python_out=src/ai_scheduler/proto \
  --grpc_python_out=src/ai_scheduler/proto \
  proto/control.proto proto/transport.proto

# run
export PYTHONPATH=src
python src/app.py
```

### 9.2 Docker/Compose

```bash
docker build -t control-service:dev .
docker run --env-file .env -p 8008:8008 control-service:dev
```

### 9.3 Kubernetes/Helm (nếu có)

* (Không tìm thấy trong repo)

### 9.4 Testing & Demo

* **Cách chạy demo**:

  **Docker Development:**
  ```bash
  # Start control-service container
  docker-compose up -d control-service transport-service
  
  # Exec into container for interactive demo
  docker exec -it control-service bash
  cd /app/src/ai_scheduler/examples
  
  # Quick test dynamic headway calculation
  python test_dynamic_demo.py
  
  # Full detailed demo (recommended for presentations)
  python detailed_demand_demo.py
  ```
  
  **Docker Production:**
  ```bash
  # Use production compose file
  docker-compose -f docker-compose.prod.yml up -d control-service
  
  # Exec into production container
  docker exec -it control-service bash
  cd /app/src/ai_scheduler/examples
  python detailed_demand_demo.py
  ```

  **Local Development (without Docker):**
  ```bash
  # Prophet model test
  python -m ai_scheduler.tests.smoke_forecast
  
  # Model pre-training
  python -m ai_scheduler.tests.pretrain
  ```

* **Demo Features**:
  - Dynamic headway adjustment (2-30 minutes) based on passenger demand
  - Real-time scenario testing (rush hour, events, weather)
  - Business impact metrics and ROI analysis
  - Interactive presentation mode cho board meetings
  
* **Coverage**: (Không tìm thấy trong repo)

## 10. CI/CD

* **Workflow path**: (Không tìm thấy trong repo)
* **Tagging/Release**: (Không tìm thấy trong repo)
* **Gates**: (Không tìm thấy trong repo)

## 11. Hiệu năng & Quy mô

* **Bottlenecks đã thấy từ code**: 
  - Prophet model training có thể chậm
  - Sequential route processing
  - No caching cho model predictions
* **Kỹ thuật**: 
  - ThreadPoolExecutor cho concurrent gRPC calls
  - Joblib model persistence
  - Synthetic fallback patterns
* **Định hướng benchmark/kịch bản tải**: 
  - 10+ concurrent gRPC calls
  - 50+ routes với 1000+ trips per day
  - Sub-second prediction cho single routes

## 12. Rủi ro & Nợ kỹ thuật

* **Danh sách vấn đề hiện tại**:
  - Reschedule và GetPlan methods chưa implement
  - Không có authentication/authorization
  - Không có comprehensive error handling
  - Không có distributed tracing
  - Không có Kafka integration
* **Ảnh hưởng & ưu tiên**:
  - High: Authentication cho production
  - Medium: Complete API implementation
  - Low: Advanced monitoring features
* **Kế hoạch cải thiện**:
  - Implement real-time rescheduling
  - Add comprehensive testing
  - Add authentication middleware
  - Add Kafka event publishing

## 13.1 Docker Demo Setup

* **Quick Start Guide**: [`DOCKER_DEMO_QUICKSTART.md`](DOCKER_DEMO_QUICKSTART.md) - Complete workflow cho Docker environment
* **Detailed Demo Guide**: [`DEMO_GUIDE.md`](DEMO_GUIDE.md) - Comprehensive demo instructions
* **Docker Setup**: [`docker-demo-setup.md`](docker-demo-setup.md) - Technical Docker configuration
* **Validation Script**: [`validate-docker-demo.sh`](validate-docker-demo.sh) - Pre-demo health check

* **5-Minute Setup**:
  ```bash
  # Start services
  docker-compose up -d control-service transport-service
  
  # Validate environment
  bash control-service/validate-docker-demo.sh
  
  # Run demo  
  docker exec -it control-service bash
  cd /app/src/ai_scheduler/examples
  python detailed_demand_demo.py
  ```

## 14. Đưa vào thực tế (checklist triển khai)

### 14.1 Tối thiểu để chạy production
- Cấu hình môi trường:
  - `TRANSPORT_GRPC_HOST`/`PORT` trỏ đúng Transport-service.
  - `DEFAULT_DWELL_SEC`, `DEFAULT_TURNAROUND_SEC` theo tiêu chuẩn vận hành.
  - `MODEL_DIR` có quyền đọc/ghi (nếu dùng Prophet).
- Nâng cao độ tin cậy:
  - Tăng `ThreadPoolExecutor` (nếu có) hoặc chạy multi-replica.
  - Health/metrics được scrape bởi Prometheus, alerting sẵn sàng.
- Bảo mật/cứng hoá:
  - Bổ sung auth/ACL cho gRPC (mTLS hoặc token-based) nếu cần.
  - Validate chặt chẽ `date`, `dayOfWeek`, `serviceStart`/`End`.

### 14.2 Nâng cấp dùng ML thật sự
- Kết nối `forecast_headways()` với Prophet:
  - Gọi `_get_or_train_model(routeId)` để lấy model.
  - Sinh forecast theo từng khoảng thời gian trong ngày → suy headway theo ngưỡng demand (ví dụ: peak <= 360s, off-peak 600–900s).
  - Trả mảng nhiều time-band (peak/off-peak) thay vì 1 band cố định.
- Quản trị model:
  - Chu kỳ retrain (hàng tuần/tháng) và lưu `.joblib` vào `MODEL_DIR`.
  - Theo dõi drift: nếu chênh lệch lớn giữa dự báo và thực tế → trigger retrain.

### 14.3 Hiệu năng & chi phí
- Cache dữ liệu ít thay đổi trong ngày: `routeStations`, `trains`.
- Batch routes khi `GenerateDailySchedules` (song song hoá per route).
- Giới hạn số departures (ví dụ không vượt 23:00) để tránh trùng.

### 14.4 Quy trình vận hành
- Trước giờ chạy: seed lịch cho ngày hôm sau (`INIT_SEED_ON_START=true`, `INIT_SEED_DAYS=1..n`).
- Khi thay đổi phương án chạy tàu: gọi `GenerateSchedule` với khung giờ mới.
- Khi có cố/điều chỉnh: triển khai `Reschedule` dựa trên nguyên nhân (`reasons[]`) và phạm vi (`affectedRoutes[]`).

## 13. Phụ lục

* **Sơ đồ ERD**: N/A - stateless service

* **Bảng mã lỗi chuẩn & cấu trúc response lỗi**:
  ```protobuf
  // gRPC Status Codes
  OK = 0
  INTERNAL = 13
  
  // Error Response Structure
  message ErrorResponse {
    int32 code = 1;
    string message = 2;
    string details = 3;
  }
  ```

* **License & 3rd-party**:
  - MIT License
  - Prophet (Facebook) - BSD License
  - gRPC - Apache 2.0
  - Pandas, NumPy - BSD License