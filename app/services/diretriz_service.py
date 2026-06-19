from app.repositories import diretriz_repository as repo

_VALID_ACOES = {"investido", "transferido"}


def _serialize(row: dict) -> dict:
    result = dict(row)
    if result.get("data_vencimento"):
        result["data_vencimento"] = str(result["data_vencimento"])
    if result.get("valor") is not None:
        result["valor"] = float(result["valor"])
    return result


def get_pendentes(user_id: int) -> list[dict]:
    rows = repo.get_pending_receitas(user_id)
    result = []
    for r in rows:
        item = _serialize(r)
        valor = item.get("valor") or 0.0
        item["valor_dez_pct"] = round(valor * 0.10, 2)
        result.append(item)
    return result


def registrar(user_id: int, lancamento_id: int, acao: str,
              conta_destino_id=None, valor_dez_pct: float = 0.0) -> dict:
    if acao not in _VALID_ACOES:
        raise ValueError(f"Ação inválida: {acao}")
    if acao == "transferido" and not conta_destino_id:
        raise ValueError("Conta destino é obrigatória para transferência")
    if valor_dez_pct <= 0:
        raise ValueError("Valor inválido")

    row = repo.registrar_acao(user_id, lancamento_id, acao, conta_destino_id, valor_dez_pct)
    if not row:
        raise ValueError("Lançamento não encontrado")
    return dict(row)
