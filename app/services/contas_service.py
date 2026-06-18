from app.repositories import contas_repository as repo


def list_contas(user_id: int, mes: int = 0, ano: int = 0) -> list:
    if mes and ano:
        rows = repo.list_contas_projetadas(user_id, mes, ano)
    else:
        rows = repo.list_contas(user_id)
    return [dict(r) for r in rows]


def add_conta(user_id: int, nome: str, instituicao: str, categoria_id, saldo_inicial) -> dict:
    nome = nome.strip()[:100]
    if not nome:
        raise ValueError("Nome obrigatório")
    instituicao = (instituicao or "outro").strip()[:80]
    cat_id = int(categoria_id) if categoria_id else None
    saldo = _parse_money(saldo_inicial)
    row = repo.create_conta(user_id, nome, instituicao, cat_id, saldo)
    return dict(row)


def edit_conta(conta_id: int, user_id: int, nome: str, instituicao: str, categoria_id, saldo_inicial):
    nome = nome.strip()[:100]
    if not nome:
        raise ValueError("Nome obrigatório")
    instituicao = (instituicao or "outro").strip()[:80]
    cat_id = int(categoria_id) if categoria_id else None
    saldo = _parse_money(saldo_inicial)
    repo.update_conta(conta_id, user_id, nome, instituicao, cat_id, saldo)


def remove_conta(conta_id: int, user_id: int):
    repo.delete_conta(conta_id, user_id)


def reorder_contas(user_id: int, ordered_ids: list[int]) -> None:
    if not isinstance(ordered_ids, list):
        raise ValueError("ordered_ids deve ser uma lista")
    repo.reorder_contas(user_id, ordered_ids)


def get_total_saldo(user_id: int) -> float:
    return repo.get_total_saldo(user_id)


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
