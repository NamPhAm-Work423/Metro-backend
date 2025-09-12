import os
from pathlib import Path
import pytest


class _DummyDB:
    def __init__(self):
        self._added = []
        self._commits = 0
        self._refreshed = []
        self._deleted = []
        # Very small in-memory store
        self._reports = []

    # SQLAlchemy-like minimal API used by service
    def add(self, obj):
        self._added.append(obj)
        # Auto-assign id-like attribute if present
        if hasattr(obj, "id") and getattr(obj, "id") is None:
            setattr(obj, "id", len(self._reports) + 1)

    def commit(self):
        self._commits += 1
        # Persist newly added reports
        for obj in list(self._added):
            if obj.__class__.__name__ == "Report":
                if obj not in self._reports:
                    self._reports.append(obj)
        self._added.clear()

    def refresh(self, obj):
        self._refreshed.append(obj)

    def rollback(self):
        pass

    def delete(self, obj):
        self._deleted.append(obj)
        if obj in self._reports:
            self._reports.remove(obj)

    # Query shim
    class _Query:
        def __init__(self, db, model):
            self._db = db
            self._model = model
            self._filters = []

        def filter(self, *args, **kwargs):
            return self

        def offset(self, *_):
            return self

        def limit(self, *_):
            return self

        def order_by(self, *_):
            return self

        def all(self):
            if self._model.__name__ == "Report":
                return list(self._db._reports)
            return []

        def first(self):
            if self._model.__name__ == "Report":
                return self._db._reports[0] if self._db._reports else None
            return None

        def scalar(self):
            return 0

    def query(self, model):
        return self._Query(self, model)


def test_generate_report_file_creates_html(tmp_path, monkeypatch):
    # Ensure database URL exists to bypass import-time parsing
    monkeypatch.setenv("DB_HOST", os.getenv("DB_HOST", "localhost"))
    monkeypatch.setenv("DB_PORT", os.getenv("DB_PORT", "5432"))
    monkeypatch.setenv("DB_NAME", os.getenv("DB_NAME", "testdb"))
    monkeypatch.setenv("DB_USER", os.getenv("DB_USER", "test"))
    monkeypatch.setenv("DB_PASSWORD", os.getenv("DB_PASSWORD", "test"))
    # Arrange minimal Report object shape
    class Report:
        def __init__(self):
            self.id = 1
            self.title = "Test Report"
            self.description = "Desc"
            self.report_type = "daily"
            self.file_path = None

    # Patch imports used inside service module
    import src.services.report_service as mod
    monkeypatch.setattr(mod, "Report", Report)
    # Stub get_report to return our in-memory object without ORM filters
    async def _get_report(self, report_id):
        return report
    monkeypatch.setattr(mod.ReportService, "get_report", _get_report)

    db = _DummyDB()
    service = mod.ReportService(db)
    service.reports_dir = tmp_path

    # Create a minimal report in store
    report = Report()
    db._reports.append(report)

    # Act
    # generate_report will internally call the private methods and write a file
    import asyncio
    asyncio.run(service.generate_report(report.id))

    # Assert
    assert report.file_path is not None
    path = Path(report.file_path)
    assert path.exists()
    content = path.read_text(encoding="utf-8")
    assert "<html>" in content
    assert "Test Report" in content


