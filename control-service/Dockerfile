FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

ENV PYTHONPATH=/app/src

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY proto ./proto
COPY src ./src
COPY models ./models

# Generate gRPC code
RUN mkdir -p src/ai_scheduler/proto \
 && python -m grpc_tools.protoc -Iproto --python_out=src/ai_scheduler/proto --grpc_python_out=src/ai_scheduler/proto proto/control.proto proto/transport.proto
# Fix relative imports inside generated *_pb2_grpc.py so they import within the package
RUN python - <<'PY'
import io, os
targets = [
    'src/ai_scheduler/proto/control_pb2_grpc.py',
    'src/ai_scheduler/proto/transport_pb2_grpc.py',
]
for fn in targets:
    if os.path.isfile(fn):
        with open(fn, 'r+', encoding='utf-8') as f:
            s = f.read()
            s2 = s.replace('import control_pb2 as', 'from . import control_pb2 as')
            s2 = s2.replace('import transport_pb2 as', 'from . import transport_pb2 as')
            if s2 != s:
                f.seek(0)
                f.write(s2)
                f.truncate()
PY

EXPOSE 8008

CMD ["python", "src/app.py"]


