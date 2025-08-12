from ai_scheduler.services.forecast_service import ForecastService


def run():
    svc = ForecastService()
    bands = svc.forecast_headways(route_id="R1", date="2024-11-01", day_of_week="Friday")
    print(f"Bands: {len(bands)}")
    for b in bands[:5]:
        print(b)


if __name__ == "__main__":
    run()


