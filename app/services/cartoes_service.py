from app.repositories import cartoes_repository as repo

_BANDEIRAS_VALIDAS = {"visa", "mastercard", "elo", "amex", "hipercard", "outro"}


def list_cartoes(user_id: int, mes: int = 0, ano: int = 0) -> list:
    rows = repo.list_cartoes(user_id, mes, ano)
    return [dict(r) for r in rows]


def add_cartao(user_id: int, nome: str, limite, bandeira: str, conta_id, dia_fechamento: int, dia_vencimento: int) -> dict:
    nome = nome.strip()[:100]
    if not nome:
        raise ValueError("Nome obrigatório")
    bandeira = bandeira.strip().lower() if bandeira else "outro"
    if bandeira not in _BANDEIRAS_VALIDAS:
        bandeira = "outro"
    lim = _parse_money(limite)
    cid = int(conta_id) if conta_id else None
    dia_f = _parse_dia(dia_fechamento)
    dia_v = _parse_dia(dia_vencimento)
    row = repo.create_cartao(user_id, nome, lim, bandeira, cid, dia_f, dia_v)
    return dict(row)


def edit_cartao(cartao_id: int, user_id: int, nome: str, limite, bandeira: str, conta_id, dia_fechamento: int, dia_vencimento: int):
    nome = nome.strip()[:100]
    if not nome:
        raise ValueError("Nome obrigatório")
    bandeira = bandeira.strip().lower() if bandeira else "outro"
    if bandeira not in _BANDEIRAS_VALIDAS:
        bandeira = "outro"
    lim = _parse_money(limite)
    cid = int(conta_id) if conta_id else None
    dia_f = _parse_dia(dia_fechamento)
    dia_v = _parse_dia(dia_vencimento)
    repo.update_cartao(cartao_id, user_id, nome, lim, bandeira, cid, dia_f, dia_v)


def remove_cartao(cartao_id: int, user_id: int):
    repo.delete_cartao(cartao_id, user_id)


def _parse_money(value) -> float:
    if value is None:
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    s = str(value).strip().replace("R$", "").replace(" ", "")
    s = s.replace(".", "").replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return 0.0


def _parse_dia(value) -> int:
    try:
        d = int(value)
        return max(1, min(31, d))
    except (TypeError, ValueError):
        return 1
