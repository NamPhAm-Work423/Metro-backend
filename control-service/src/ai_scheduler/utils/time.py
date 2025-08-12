from datetime import datetime, timedelta


def parse_hms(hms: str) -> datetime:
    return datetime.strptime(hms, "%H:%M:%S")


def to_hms(dt: datetime) -> str:
    return dt.strftime("%H:%M:%S")


def clamp_end_exclusive(timestr: str) -> str:
    # ensure exclusive end handling if needed
    return timestr


def iter_departures(start: str, end: str, headway_sec: int):
    t = parse_hms(start)
    e = parse_hms(end)
    while t <= e:
        yield to_hms(t)
        t = t + timedelta(seconds=headway_sec)


def add_seconds(timestr: str, seconds: int) -> str:
    return to_hms(parse_hms(timestr) + timedelta(seconds=seconds))


