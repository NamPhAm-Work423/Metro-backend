from typing import List, Optional
import pandas as pd
import numpy as np
try:
    from prophet import Prophet  # type: ignore
except Exception:  # Prophet may be unavailable in some environments
    Prophet = None  # type: ignore
from ai_scheduler.models import TimeBandHeadway
import os
import joblib
from ai_scheduler.config.settings import settings


class ForecastService:
    def __init__(self):
        self.models = {}
        os.makedirs(settings.model_dir, exist_ok=True)

    def _load_model_from_disk(self, route_id: str) -> Optional[object]:
        path = os.path.join(settings.model_dir, f"prophet_{route_id}.joblib")
        if os.path.isfile(path):
            try:
                return joblib.load(path)
            except Exception:
                return None
        return None

    def _save_model_to_disk(self, route_id: str, model: object) -> None:
        path = os.path.join(settings.model_dir, f"prophet_{route_id}.joblib")
        try:
            joblib.dump(model, path)
        except Exception:
            pass

    def _get_or_train_model(self, route_id: str):
        if route_id in self.models:
            return self.models[route_id]
        disk_model = self._load_model_from_disk(route_id)
        if disk_model is not None:
            self.models[route_id] = disk_model
            return disk_model
        if Prophet is None:
            # Mark as None to indicate fallback path without Prophet
            self.models[route_id] = None
            return None
        # Placeholder training with synthetic seasonal patterns
        rng = pd.date_range(start="2024-01-01", end="2025-01-01", freq="h")
        hours = rng.hour
        dows = rng.dayofweek
        peak_mask = ((dows >= 0) & (dows <= 4) & ((hours >= 6) & (hours <= 9) | (hours >= 16) & (hours <= 19)))
        base = 100 + 40*np.sin(2*np.pi*hours/24) + 60*(peak_mask.astype(int))
        df = pd.DataFrame({"ds": rng, "y": base + np.random.normal(0,5,size=len(rng))})
        m = Prophet(daily_seasonality=True, weekly_seasonality=True, yearly_seasonality=False)
        m.fit(df)
        self.models[route_id] = m
        self._save_model_to_disk(route_id, m)
        return m

    def forecast_headways(self, route_id: str, date: str, day_of_week: str) -> List[TimeBandHeadway]:
        m = self._get_or_train_model(route_id)
        start = pd.to_datetime(f"{date} 05:00:00")
        end = pd.to_datetime(f"{date} 22:30:00")
        future = pd.date_range(start=start, end=end, freq="15min")
        df_future = pd.DataFrame({"ds": future})
        if m is None:
            # Fallback: synthesize demand curve without Prophet
            hours = df_future['ds'].dt.hour
            dows = df_future['ds'].dt.dayofweek
            peak_mask = ((dows >= 0) & (dows <= 4) & ((hours >= 6) & (hours <= 9) | (hours >= 16) & (hours <= 19)))
            base = 100 + 40*np.sin(2*np.pi*hours/24) + 60*(peak_mask.astype(int))
            yhat = base + np.random.normal(0,5,size=len(df_future))
            fcst = pd.DataFrame({"ds": df_future['ds'], "yhat": yhat})
        else:
            fcst = m.predict(df_future)
        # Map predicted demand to headway buckets (lower headway for higher demand)
        quantiles = fcst['yhat'].quantile([0.25,0.5,0.75]).values
        bands: List[TimeBandHeadway] = []
        cur_start = None
        cur_hw = None
        def demand_to_hw(v):
            if v <= quantiles[0]:
                return 900  # 15m
            if v <= quantiles[1]:
                return 600  # 10m
            if v <= quantiles[2]:
                return 480  # 8m
            return 360       # 6m
        for _, row in fcst.iterrows():
            hw = demand_to_hw(row['yhat'])
            t = row['ds']
            t_str = t.strftime('%H:%M:%S')
            if cur_start is None:
                cur_start = t_str
                cur_hw = hw
            elif hw != cur_hw:
                bands.append(TimeBandHeadway(cur_start, t_str, cur_hw))
                cur_start = t_str
                cur_hw = hw
        if cur_start is not None:
            bands.append(TimeBandHeadway(cur_start, end.strftime('%H:%M:%S'), cur_hw))
        return bands


