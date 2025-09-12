import os
import sys
import types
import asyncio
import pytest
from fastapi.testclient import TestClient


def _setup_test_client(monkeypatch):
    # Ensure database URL is well-formed to avoid import-time parsing errors
    monkeypatch.setenv("DB_HOST", os.getenv("DB_HOST", "localhost"))
    monkeypatch.setenv("DB_PORT", os.getenv("DB_PORT", "5432"))
    monkeypatch.setenv("DB_NAME", os.getenv("DB_NAME", "testdb"))
    monkeypatch.setenv("DB_USER", os.getenv("DB_USER", "test"))
    monkeypatch.setenv("DB_PASSWORD", os.getenv("DB_PASSWORD", "test"))
    # Stub async init/close to avoid real DB
    async def _async_noop():
        return None

    class _FakeConsumer:
        async def start(self):
            return None

        async def stop(self):
            return None

    # Stub kafka module tree before importing app to avoid importing real kafka
    fake_kafka = types.ModuleType("kafka")
    class _FakeKafkaConsumer:
        def __init__(self, *args, **kwargs):
            pass
        def close(self):
            pass
    fake_kafka.KafkaConsumer = _FakeKafkaConsumer
    fake_kafka.vendor = types.SimpleNamespace(six=types.SimpleNamespace(moves=None))
    sys.modules["kafka"] = fake_kafka

    # Stub kafka.admin
    fake_admin = types.ModuleType("kafka.admin")
    class _FakeKafkaAdminClient:
        def __init__(self, *args, **kwargs):
            pass
        def list_topics(self):
            return []
        def create_topics(self, new_topics=None, validate_only=False):
            return None
        def close(self):
            pass
    class _FakeNewTopic:
        def __init__(self, name, num_partitions, replication_factor):
            self.name = name
            self.num_partitions = num_partitions
            self.replication_factor = replication_factor
    fake_admin.KafkaAdminClient = _FakeKafkaAdminClient
    fake_admin.NewTopic = _FakeNewTopic
    sys.modules["kafka.admin"] = fake_admin

    # Stub kafka.errors
    fake_errors = types.ModuleType("kafka.errors")
    class _FakeKafkaError(Exception):
        pass
    fake_errors.KafkaError = _FakeKafkaError
    sys.modules["kafka.errors"] = fake_errors
    # Patch startup/shutdown side-effects
    import src.app as app_module
    monkeypatch.setattr(app_module, "init_db", _async_noop)
    monkeypatch.setattr(app_module, "close_db", _async_noop)
    monkeypatch.setattr(app_module, "ReportEventConsumer", _FakeConsumer)

    from src.app import app
    return TestClient(app)


def test_health_get(monkeypatch):
    client = _setup_test_client(monkeypatch)
    res = client.get("/health")
    assert res.status_code == 200
    body = res.json()
    assert body.get("status") == "OK"
    assert body.get("service") == "report-service"


def test_health_head(monkeypatch):
    client = _setup_test_client(monkeypatch)
    res = client.head("/health")
    assert res.status_code == 200


def test_metrics_ok(monkeypatch):
    client = _setup_test_client(monkeypatch)
    res = client.get("/metrics")
    assert res.status_code == 200
    assert "text/plain" in res.headers.get("content-type", "")


def test_direct_access_blocked_by_network_middleware(monkeypatch):
    client = _setup_test_client(monkeypatch)
    # Hitting a protected route without allowed headers should be blocked before deps run
    res = client.get("/v1/reports/get-reports")
    assert res.status_code == 403
    body = res.json()
    assert body.get("error") == "DIRECT_ACCESS_FORBIDDEN"


def test_404_handler(monkeypatch):
    client = _setup_test_client(monkeypatch)
    res = client.get("/no-such-path", headers={"x-service-auth": "test"})
    assert res.status_code == 404
    body = res.json()
    assert body.get("error") == "ROUTE_NOT_FOUND"


