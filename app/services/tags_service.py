from app.repositories import tags_repository

_ALLOWED_COLORS = {
    "#6366f1", "#0d6efd", "#198754", "#dc3545", "#fd7e14",
    "#f59e0b", "#0891b2", "#7c3aed", "#db2777", "#64748b",
}
_DEFAULT_COLOR = "#6366f1"


def get_tags(user_id: int) -> list:
    rows = tags_repository.get_tags_by_user(user_id)
    return [dict(r) for r in rows]


def create_tag(user_id: int, nome: str, cor: str) -> dict:
    nome = (nome or "").strip()
    if not nome:
        raise ValueError("Nome da tag é obrigatório")
    if len(nome) > 30:
        raise ValueError("Nome da tag deve ter no máximo 30 caracteres")
    cor = cor if cor in _ALLOWED_COLORS else _DEFAULT_COLOR
    row = tags_repository.create_tag(user_id, nome, cor)
    if not row:
        raise ValueError("Tag com esse nome já existe")
    return dict(row)


def delete_tag(tag_id: int, user_id: int) -> None:
    tags_repository.delete_tag(tag_id, user_id)


def get_lancamento_tags(lancamento_id: int) -> list:
    rows = tags_repository.get_tags_by_lancamento(lancamento_id)
    return [dict(r) for r in rows]


def set_lancamento_tags(lancamento_id: int, user_id: int, tag_ids: list) -> None:
    if not isinstance(tag_ids, list):
        raise ValueError("tag_ids deve ser uma lista")
    tags_repository.set_lancamento_tags(lancamento_id, tag_ids)
