from dataclasses import dataclass


@dataclass
class TimeBandHeadway:
    start: str  # HH:MM:SS
    end: str    # HH:MM:SS
    headway_sec: int


@dataclass
class TimeBand:
    start: str  # HH:MM:SS
    end: str    # HH:MM:SS
    headway_sec: int


