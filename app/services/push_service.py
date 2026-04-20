import json
from flask import current_app
from pywebpush import webpush, WebPushException

from app.repositories.push_repository import (
    save_subscription,
    delete_subscription,
    get_subscriptions_by_user,
    get_all_subscriptions,
)


def subscribe(user_id: int, endpoint: str, p256dh: str, auth: str):
    save_subscription(user_id, endpoint, p256dh, auth)


def unsubscribe(endpoint: str):
    delete_subscription(endpoint)


def _send(subscription: dict, payload: dict) -> str | None:
    private_key = current_app.config.get("VAPID_PRIVATE_KEY") or ""
    claims_sub = current_app.config.get("VAPID_CLAIMS_SUB")

    if not private_key:
        return "VAPID_PRIVATE_KEY não configurada"

    try:
        webpush(
            subscription_info={
                "endpoint": subscription["endpoint"],
                "keys": {
                    "p256dh": subscription["p256dh"],
                    "auth": subscription["auth"],
                },
            },
            data=json.dumps(payload),
            vapid_private_key=private_key,
            vapid_claims={"sub": claims_sub},
            headers={"urgency": "high", "TTL": "86400"},
        )
        current_app.logger.info("PUSH OK endpoint=%s", subscription["endpoint"][:60])
        return None
    except WebPushException as e:
        status = e.response.status_code if e.response is not None else "no-response"
        body = e.response.text[:300] if e.response is not None else ""
        current_app.logger.error("PUSH WebPushException status=%s body=%s err=%s", status, body, e)
        if e.response is not None and e.response.status_code in (403, 404, 410):
            delete_subscription(subscription["endpoint"])
        return f"WebPushException status={status} | {body}"
    except Exception as e:
        current_app.logger.error("PUSH Exception %s: %s", type(e).__name__, e)
        return f"{type(e).__name__}: {e}"


def send_to_user(user_id: int, title: str, body: str, url: str = "/"):
    payload = {"title": title, "body": body, "url": url}
    for sub in get_subscriptions_by_user(user_id):
        _send(sub, payload)


def send_to_all(title: str, body: str, url: str = "/"):
    payload = {"title": title, "body": body, "url": url}
    for sub in get_all_subscriptions():
        _send(sub, payload)
