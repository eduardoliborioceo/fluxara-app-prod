import logging
import time

from app.services.sports_base import budget_available, api_get

logger = logging.getLogger(__name__)

_BASE_URL = "https://v3.football.api-sports.io"
_ODDS_TTL = 7200

_BET_MATCH_WINNER = 1
_BET_GOALS        = 5
_BET_BTTS         = 8

_odds_cache: dict = {}


def get_odds(fixture_id: str) -> dict | None:
    cache_key = str(fixture_id)
    now = time.monotonic()
    cached = _odds_cache.get(cache_key)
    if cached and cached["expires"] > now:
        return cached["data"]

    if not budget_available():
        return (_odds_cache.get(cache_key) or {}).get("data")

    data = _fetch_odds(fixture_id)
    _odds_cache[cache_key] = {"data": data, "expires": now + _ODDS_TTL}
    return data


def _fetch_odds(fixture_id: str) -> dict | None:
    resp = api_get(_BASE_URL, "/odds", {"fixture": fixture_id})
    if not resp:
        return None

    bookmakers: list[dict] = []
    for entry in (resp.get("response") or []):
        for bk in (entry.get("bookmakers") or []):
            bookmakers.append(bk)

    if not bookmakers:
        return None

    result: dict = {}

    for bk in bookmakers:
        for bet in (bk.get("bets") or []):
            bid = bet.get("id")
            vals = {v["value"]: v["odd"] for v in (bet.get("values") or [])}

            if bid == _BET_MATCH_WINNER and "home_win" not in result:
                probs = _normalize([
                    _to_prob(vals.get("Home")),
                    _to_prob(vals.get("Draw")),
                    _to_prob(vals.get("Away")),
                ])
                if any(p > 0 for p in probs):
                    result["home_win"] = round(probs[0] * 100, 1)
                    result["draw"]     = round(probs[1] * 100, 1)
                    result["away_win"] = round(probs[2] * 100, 1)

            elif bid == _BET_GOALS:
                for label, key in [("Over 1.5", "over_15"), ("Over 2.5", "over_25"), ("Over 3.5", "over_35")]:
                    under = label.replace("Over", "Under")
                    if key not in result and label in vals and under in vals:
                        probs = _normalize([_to_prob(vals[label]), _to_prob(vals[under])])
                        result[key] = round(probs[0] * 100, 1)

            elif bid == _BET_BTTS and "btts_yes" not in result:
                if "Yes" in vals and "No" in vals:
                    probs = _normalize([_to_prob(vals["Yes"]), _to_prob(vals["No"])])
                    result["btts_yes"] = round(probs[0] * 100, 1)

    return result if result else None


def _to_prob(odd) -> float:
    try:
        v = float(odd)
        return 1 / v if v > 0 else 0.0
    except (TypeError, ValueError, ZeroDivisionError):
        return 0.0


def _normalize(probs: list[float]) -> list[float]:
    total = sum(probs)
    if total <= 0:
        return [0.0] * len(probs)
    return [p / total for p in probs]
