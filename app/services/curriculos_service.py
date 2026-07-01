import json
from app.repositories import curriculos_repository as repo


def _parse_dados(row: dict) -> dict:
    dados = row.get('dados')
    if isinstance(dados, str):
        row['dados'] = json.loads(dados)
    return row


def list_curriculos(user_id: int) -> list:
    return [dict(r) for r in repo.list_curriculos(user_id)]


def get_curriculo(curriculo_id: int, user_id: int) -> dict | None:
    row = repo.get_curriculo(curriculo_id, user_id)
    if not row:
        return None
    return _parse_dados(dict(row))


def save_curriculo(user_id: int, curriculo_id: int | None, titulo: str, dados: dict) -> dict:
    titulo = (titulo or 'Meu Currículo').strip()[:200]
    if not titulo:
        titulo = 'Meu Currículo'
    if curriculo_id:
        repo.update_curriculo(curriculo_id, user_id, titulo, dados)
        row = repo.get_curriculo(curriculo_id, user_id)
    else:
        row = repo.create_curriculo(user_id, titulo, dados)
    return _parse_dados(dict(row))


def delete_curriculo(curriculo_id: int, user_id: int) -> None:
    repo.delete_curriculo(curriculo_id, user_id)
