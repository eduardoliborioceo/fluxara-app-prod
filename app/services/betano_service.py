import json
import logging
import re

import requests

logger = logging.getLogger(__name__)

_BETANO_BASE = "https://www.betano.bet.br"

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/147.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Referer": "https://www.betano.bet.br/",
    "sec-fetch-dest": "document",
    "sec-fetch-mode": "navigate",
    "sec-fetch-site": "same-origin",
    "upgrade-insecure-requests": "1",
}

_API_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/147.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, */*",
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8",
    "Referer": "https://www.betano.bet.br/",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
}

_API_PATTERNS = [
    "{base}/api/sport/events/{id}/",
    "{base}/api/events/{id}/",
    "{base}/api/sport/event/{id}/",
    "{base}/api/sb/v1/events/{id}/",
    "{base}/api/sb/v2/events/{id}/",
    "{base}/api/br/sport/events/{id}/",
    "{base}/api/sport/events/{id}/?withMarkets=true",
]


def fetch_odds(betano_url: str) -> dict:
    event_id = _extract_event_id(betano_url)
    session = requests.Session()

    session.headers.update(_API_HEADERS)
    for pattern in _API_PATTERNS:
        url = pattern.format(base=_BETANO_BASE, id=event_id)
        try:
            resp = session.get(url, timeout=10)
            if resp.ok and "json" in resp.headers.get("content-type", ""):
                odds = _parse_betano_response(resp.json())
                if odds:
                    return odds
        except Exception:
            continue

    session.headers.update(_HEADERS)
    try:
        resp = session.get(betano_url, timeout=15)
        if resp.ok:
            odds = _parse_html(resp.text)
            if odds:
                return odds
    except Exception as exc:
        logger.warning("Falha ao carregar pagina Betano: %s", exc)

    raise ValueError(
        "Nao foi possivel extrair as odds desta partida. "
        "Verifique se a URL esta correta e se os mercados estao disponiveis."
    )


def _extract_event_id(url: str) -> str:
    m = re.search(r"/(\d{7,})(?:/|$|\?)", url)
    if not m:
        raise ValueError("URL invalida - ID do evento nao encontrado")
    return m.group(1)


def _parse_html(html: str) -> dict | None:
    m = re.search(
        r'<script[^>]*id=["\']__NEXT_DATA__["\'][^>]*>(.*?)</script>',
        html,
        re.DOTALL,
    )
    if not m:
        return None
    try:
        data = json.loads(m.group(1))
    except Exception:
        return None
    return _search_and_extract(data, depth=0)


def _search_and_extract(obj, depth: int = 0) -> dict | None:
    if depth > 10 or obj is None:
        return None
    if isinstance(obj, dict):
        odds = _parse_betano_response(obj)
        if odds:
            return odds
        for val in obj.values():
            if isinstance(val, (dict, list)):
                result = _search_and_extract(val, depth + 1)
                if result:
                    return result
    elif isinstance(obj, list):
        for item in obj:
            if isinstance(item, (dict, list)):
                result = _search_and_extract(item, depth + 1)
                if result:
                    return result
    return None


def _parse_betano_response(data: dict) -> dict | None:
    event = _get_event(data)
    if not event:
        return None
    markets = event.get("markets")
    if not isinstance(markets, list) or not markets:
        return None
    return _extract_odds(markets)


def _get_event(data: dict) -> dict | None:
    if not isinstance(data, dict):
        return None
    inner = data.get("data")
    if isinstance(inner, dict):
        event = inner.get("event")
        if isinstance(event, dict) and "markets" in event:
            return event
    if "markets" in data and isinstance(data.get("markets"), list):
        return data
    return None


def _extract_odds(markets: list) -> dict | None:
    odd_mandante = odd_visitante = odd_empate_gols = None

    for market in markets:
        if not isinstance(market, dict):
            continue
        market_type = market.get("type", "")
        sels = market.get("selections", [])

        if market_type == "MRES" and odd_mandante is None:
            for sel in sels:
                name = sel.get("name", "")
                price = _safe_price(sel)
                if not price:
                    continue
                if name == "1":
                    odd_mandante = price
                elif name == "2":
                    odd_visitante = price

        if market_type == "CSFT":
            for sel in sels:
                hs = sel.get("hs")
                as_ = sel.get("as")
                price = _safe_price(sel)
                if price is None:
                    continue
                if hs is not None and as_ is not None and int(hs) == int(as_) and int(hs) >= 1:
                    if odd_empate_gols is None or price < odd_empate_gols:
                        odd_empate_gols = price

    if odd_mandante and odd_visitante and odd_empate_gols:
        return {
            "odd_mandante": odd_mandante,
            "odd_visitante": odd_visitante,
            "odd_empate_gols": odd_empate_gols,
        }
    return None


def _safe_price(sel: dict) -> float | None:
    v = sel.get("price")
    if v is None:
        return None
    try:
        f = float(v)
        return f if f > 1.01 else None
    except (TypeError, ValueError):
        return None
