import datetime
import logging
import os
import time

import requests

logger = logging.getLogger(__name__)

_TIMEOUT = 15
_DAILY_SOFT_LIMIT = 85

_budget: dict = {"date": None, "count": 0}


def budget_available() -> bool:
    _reset_if_new_day()
    if _budget["count"] >= _DAILY_SOFT_LIMIT:
        logger.warning(
            "api-sports budget at %s/%s — using cache only",
            _budget["count"],
            _DAILY_SOFT_LIMIT,
        )
        return False
    _budget["count"] += 1
    logger.debug("api-sports request #%s today", _budget["count"])
    return True


def get_daily_usage() -> dict:
    _reset_if_new_day()
    return {
        "used": _budget["count"],
        "soft_limit": _DAILY_SOFT_LIMIT,
        "hard_limit": 100,
    }


def _reset_if_new_day() -> None:
    today = datetime.date.today().isoformat()
    if _budget["date"] != today:
        _budget["date"] = today
        _budget["count"] = 0


def api_get(base_url: str, path: str, params: dict) -> dict | None:
    api_key = os.environ.get("API_SPORTS_KEY") or os.environ.get("API_FOOTBALL_KEY", "")
    if not api_key:
        logger.warning("API_SPORTS_KEY not set — skipping %s%s", base_url, path)
        return None
    headers = {"x-apisports-key": api_key, "Accept": "application/json"}
    try:
        resp = requests.get(
            f"{base_url}{path}",
            headers=headers,
            params=params,
            timeout=_TIMEOUT,
        )
        if resp.status_code != 200:
            logger.warning("api-sports HTTP %s for %s%s params=%s", resp.status_code, base_url, path, params)
            return None
        return resp.json()
    except Exception as exc:
        logger.warning("api-sports request failed %s%s: %s", base_url, path, exc)
        return None


def to_brt(iso_str: str) -> str:
    if not iso_str:
        return ""
    try:
        dt = datetime.datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
        brt = dt - datetime.timedelta(hours=3)
        return brt.strftime("%Y-%m-%dT%H:%M")
    except Exception:
        return iso_str[:16]


def current_season(season_type: str = "calendar") -> int:
    now = datetime.date.today()
    if season_type == "euro":
        return now.year if now.month >= 7 else now.year - 1
    return now.year


def make_date_range(days: int) -> tuple[str, str]:
    today = datetime.date.today()
    end = today + datetime.timedelta(days=days)
    return today.isoformat(), end.isoformat()
