import json
import logging
import os
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
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip, deflate, br, zstd",
    "cache-control": "no-cache",
    "pragma": "no-cache",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
}


def fetch_odds(betano_url: str) -> dict:
    slug, event_id = _extract_slug_and_id(betano_url)

    api_url = f"{_BETANO_BASE}/api/odds/{slug}/{event_id}/?bt=3&req=s,stnf,c,mb"

    session = requests.Session()
    session.headers.update(_HEADERS)
    session.headers["Referer"] = betano_url

    cookie_str = os.environ.get("BETANO_COOKIES", "")
    if cookie_str:
        for part in cookie_str.split(";"):
            part = part.strip()
            if "=" in part:
                name, _, value = part.partition("=")
                session.cookies.set(name.strip(), value.strip(), domain="www.betano.bet.br")

    try:
        resp = session.get(api_url, timeout=15)
        if resp.status_code in (301, 302, 303, 307, 308):
            raise ValueError(
                "Betano redirecionou para login. "
                "Configure a variavel BETANO_COOKIES com os cookies da sua sessao."
            )
        if not resp.ok:
            raise ValueError(
                f"API Betano retornou status {resp.status_code}. "
                "Verifique se a URL esta correta e se os cookies estao validos."
            )
        if "json" not in resp.headers.get("content-type", ""):
            raise ValueError(
                "Betano nao retornou JSON. A sessao pode ter expirado."
            )
        odds = _parse_betano_response(resp.json())
        if odds:
            return odds
        raise ValueError(
            "Resposta recebida mas nao foi possivel extrair os mercados. "
            "O jogo pode nao ter os mercados necessarios (1x2 + Resultado Correto)."
        )
    except ValueError:
        raise
    except Exception as exc:
        logger.warning("Erro ao buscar odds Betano: %s", exc)
        raise ValueError(
            "Nao foi possivel conectar a API da Betano. Tente novamente."
        )


def _extract_slug_and_id(url: str) -> tuple[str, str]:
    m = re.search(r"/odds/([^/]+)/(\d{7,})(?:/|$|\?)", url)
    if not m:
        raise ValueError("URL invalida - formato esperado: /odds/{partida}/{id}/")
    return m.group(1), m.group(2)


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
