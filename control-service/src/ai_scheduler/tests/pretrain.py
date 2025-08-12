from ai_scheduler.services.forecast_service import ForecastService
from ai_scheduler.config.settings import settings


def run():
    routes = []
    if settings.pretrain_routes_csv:
        # Expect comma-separated route ids, e.g. "R1,R2,R3"
        routes = [r.strip() for r in settings.pretrain_routes_csv.split(',') if r.strip()]
    if not routes:
        routes = ["R1"]
    svc = ForecastService()
    for rid in routes:
        # Trigger model creation and save
        svc._get_or_train_model(rid)
        print(f"Pretrained model for route {rid} saved to {settings.model_dir}")


if __name__ == "__main__":
    run()


