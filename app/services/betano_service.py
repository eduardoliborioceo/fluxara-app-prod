import json
import logging
import os
import re

import requests

logger = logging.getLogger(__name__)

_BETANO_BASE = "https://www.betano.bet.br"
_FLARESOLVERR_URL = os.environ.get(
    "FLARESOLVERR_URL", "http://flaresolverr.railway.internal:8080"
)


def fetch_odds(betano_url: str) -> dict:
    slug, event_id = _extract_slug_and_id(betano_url)
    api_url = f"{_BETANO_BASE}/api/odds/{slug}/{event_id}/?bt=3&req=s,stnf,c,mb"

    cookies = _build_cookies()
    if not cookies:
        raise ValueError(
            "Cookies da Betano nao configurados. "
            "Adicione BETANO_DATADOME e BETANO_POCAAUTH no Railway."
        )

    try:
        solution = _flaresolverr_get(api_url, referer=betano_url, cookies=cookies)
    except ValueError as exc:
        raise ValueError(str(exc))
    except Exception as exc:
        logger.warning("Flaresolverr erro: %s", exc)
        raise ValueError(
            "Nao foi possivel conectar ao Flaresolverr. "
            "Verifique se o servico esta ativo no Railway."
        )

    response_text = solution.get("response", "")
    if not response_text:
        raise ValueError("Flaresolverr retornou resposta vazia.")

    logger.info("Betano response preview: %s", response_text[:300])

    if response_text.strip().startswith("<"):
        raise ValueError(
            "Betano retornou HTML em vez de JSON. "
            "Os cookies (BETANO_DATADOME / BETANO_POCAAUTH) podem ter expirado — atualize-os no Railway."
        )

    try:
        data = json.loads(response_text)
    except json.JSONDecodeError:
        raise ValueError(
            f"Betano nao retornou JSON valido. "
            f"Inicio da resposta: {response_text[:200]}"
        )

    odds = _parse_betano_response(data)
    if odds:
        return odds

    raise ValueError(
        "Resposta recebida mas sem mercados necessarios. "
        "O jogo pode nao ter 1x2 e Resultado Correto disponiveis."
    )


def _build_cookies() -> list[dict]:
    domain = ".betano.bet.br"
    cookies = []

    datadome = os.environ.get("BETANO_DATADOME", "").strip()
    pocaauth = os.environ.get("BETANO_POCAAUTH", "").strip()

    if datadome:
        cookies.append({"name": "datadome", "value": datadome, "domain": domain})
    if pocaauth:
        cookies.append({"name": "pocaauth", "value": pocaauth, "domain": domain})

    return cookies


def _flaresolverr_get(url: str, referer: str = None, cookies: list = None) -> dict:
    payload: dict = {
        "cmd": "request.get",
        "url": url,
        "maxTimeout": 45000,
    }
    if referer:
        payload["headers"] = {"Referer": referer}
    if cookies:
        payload["cookies"] = cookies

    resp = requests.post(
        f"{_FLARESOLVERR_URL}/v1",
        json=payload,
        timeout=60,
    )
    resp.raise_for_status()
    data = resp.json()

    if data.get("status") != "ok":
        raise ValueError(
            f"Flaresolverr retornou erro: {data.get('message', 'desconhecido')}"
        )

    solution = data["solution"]
    logger.info("Flaresolverr url=%s status=%s", solution.get("url"), solution.get("status"))
    return solution


def _extract_slug_and_id(url: str) -> tuple[str, str]:
    m = re.search(r"/odds/([^/?]+)/(\d{7,})(?:/|$|\?)", url)
    if not m:
        raise ValueError(
            "URL invalida — formato esperado: betano.bet.br/odds/{partida}/{id}/"
        )
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
