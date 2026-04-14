import json
import logging
import os

import requests

from app.repositories import betano_session_repository as repo

logger = logging.getLogger(__name__)

_BETANO_BASE = "https://www.betano.bet.br"

_LOGIN_ENDPOINTS = [
    "/api/account/login/",
    "/api/auth/login/",
    "/api/account/loginbyusername/",
]

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/147.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip, deflate, br, zstd",
    "Content-Type": "application/json",
    "Origin": "https://www.betano.bet.br",
    "Referer": "https://www.betano.bet.br/login/",
    "sec-ch-ua": '"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
}


def login() -> bool:
    username = os.environ.get("BETANO_EMAIL", "")
    password = os.environ.get("BETANO_PASSWORD", "")

    if not username or not password:
        _save_failed("BETANO_EMAIL ou BETANO_PASSWORD nao configurados.")
        return False

    session = requests.Session()
    session.headers.update(_HEADERS)

    payload = {"username": username, "password": password}

    for endpoint in _LOGIN_ENDPOINTS:
        url = _BETANO_BASE + endpoint
        try:
            resp = session.post(url, json=payload, timeout=15, allow_redirects=False)

            if resp.status_code in (403, 503):
                logger.warning("Betano login bloqueado em %s: status %s", endpoint, resp.status_code)
                continue

            if resp.status_code in (200, 201):
                cookies = dict(resp.cookies)
                if not cookies:
                    cookies = dict(session.cookies)

                if _is_authenticated(resp, cookies):
                    cookies_json = json.dumps(cookies)
                    repo.upsert_session(cookies_json, "active")
                    logger.info("Betano login OK via %s", endpoint)
                    return True

            logger.warning("Betano login falhou em %s: status %s body=%s",
                           endpoint, resp.status_code, resp.text[:200])

        except requests.RequestException as exc:
            logger.warning("Betano login erro em %s: %s", endpoint, exc)
            continue

    _save_failed(
        "Nenhum endpoint de login funcionou. "
        "Provavel bloqueio por Cloudflare/DataDome."
    )
    return False


def get_valid_cookies() -> dict | None:
    session = repo.get_session()
    if not session:
        return None
    if session["status"] != "active":
        return None
    try:
        return json.loads(session["cookies_json"])
    except Exception:
        return None


def refresh_if_needed() -> bool:
    session = repo.get_session()
    if not session or session["status"] != "active":
        return login()
    return True


def _is_authenticated(resp, cookies: dict) -> bool:
    if "pocaauth" in cookies:
        return True
    try:
        data = resp.json()
        if isinstance(data, dict):
            return data.get("success") is True or "token" in data or "sessionId" in data
    except Exception:
        pass
    return False


def _save_failed(message: str):
    try:
        repo.upsert_session("{}", "failed", message)
    except Exception:
        logger.error("Nao foi possivel salvar status de falha: %s", message)


def init_scheduler(app):
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
    except ImportError:
        return

    scheduler = BackgroundScheduler(timezone="UTC")

    def _refresh():
        with app.app_context():
            login()

    scheduler.add_job(_refresh, "interval", hours=4, id="betano_session_refresh")
    if not scheduler.running:
        scheduler.start()

    with app.app_context():
        login()
