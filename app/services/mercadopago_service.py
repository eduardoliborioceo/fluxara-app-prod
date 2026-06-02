import logging
import os

import requests

logger = logging.getLogger(__name__)

_MP_API = "https://api.mercadopago.com"
_TIMEOUT = 15


def _access_token() -> str:
    return os.environ.get("MERCADOPAGO_ACCESS_TOKEN", "")


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {_access_token()}",
        "Content-Type": "application/json",
    }


def _is_sandbox() -> bool:
    return _access_token().upper().startswith("TEST-")


def criar_preferencia(assinatura_id: int, valor_brl: float, plano_nome: str,
                      payer_email: str, base_url: str) -> str:
    if not _access_token():
        raise RuntimeError("MERCADOPAGO_ACCESS_TOKEN não configurado")

    payload = {
        "items": [{
            "title": f"Fluxara · {plano_nome}",
            "quantity": 1,
            "unit_price": round(float(valor_brl), 2),
            "currency_id": "BRL",
        }],
        "payer": {"email": payer_email},
        "back_urls": {
            "success": f"{base_url}/assinaturas?pagamento=aprovado",
            "failure": f"{base_url}/assinaturas?pagamento=falhou",
            "pending": f"{base_url}/assinaturas?pagamento=pendente",
        },
        "auto_return": "approved",
        "external_reference": str(assinatura_id),
        "notification_url": f"{base_url}/api/webhooks/mercadopago",
        "statement_descriptor": "FLUXARA",
    }

    resp = requests.post(
        f"{_MP_API}/checkout/preferences",
        json=payload,
        headers=_headers(),
        timeout=_TIMEOUT,
    )
    resp.raise_for_status()
    data = resp.json()

    key = "sandbox_init_point" if _is_sandbox() else "init_point"
    url = data.get(key) or data.get("init_point", "")
    if not url:
        raise RuntimeError("Mercado Pago não retornou URL de checkout")
    return url


def buscar_pagamento(payment_id: str) -> dict:
    resp = requests.get(
        f"{_MP_API}/v1/payments/{payment_id}",
        headers=_headers(),
        timeout=_TIMEOUT,
    )
    resp.raise_for_status()
    return resp.json()
