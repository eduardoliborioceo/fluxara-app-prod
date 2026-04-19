from app.extensions import get_db
from psycopg.rows import dict_row


def get_tags_by_user(user_id: int) -> list:
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                "SELECT id, nome, cor FROM tags WHERE user_id = %s ORDER BY nome",
                (user_id,),
            )
            return cur.fetchall()


def get_tag(tag_id: int, user_id: int):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                "SELECT id, nome, cor FROM tags WHERE id = %s AND user_id = %s",
                (tag_id, user_id),
            )
            return cur.fetchone()


def create_tag(user_id: int, nome: str, cor: str):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                INSERT INTO tags (user_id, nome, cor)
                VALUES (%s, %s, %s)
                ON CONFLICT (user_id, nome) DO NOTHING
                RETURNING id, nome, cor
                """,
                (user_id, nome.strip(), cor),
            )
            row = cur.fetchone()
            conn.commit()
            return row


def delete_tag(tag_id: int, user_id: int) -> bool:
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM tags WHERE id = %s AND user_id = %s",
                (tag_id, user_id),
            )
            affected = cur.rowcount
            conn.commit()
            return affected > 0


def get_tags_by_lancamento(lancamento_id: int) -> list:
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT t.id, t.nome, t.cor
                FROM tags t
                JOIN lancamento_tags lt ON lt.tag_id = t.id
                WHERE lt.lancamento_id = %s
                ORDER BY t.nome
                """,
                (lancamento_id,),
            )
            return cur.fetchall()


def set_lancamento_tags(lancamento_id: int, tag_ids: list):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM lancamento_tags WHERE lancamento_id = %s",
                (lancamento_id,),
            )
            if tag_ids:
                cur.executemany(
                    "INSERT INTO lancamento_tags (lancamento_id, tag_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                    [(lancamento_id, tid) for tid in tag_ids],
                )
            conn.commit()


def get_lancamentos_by_tag(tag_id: int, user_id: int) -> list:
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT l.id
                FROM lancamentos l
                JOIN lancamento_tags lt ON lt.lancamento_id = l.id
                WHERE lt.tag_id = %s AND l.user_id = %s AND l.ativo = TRUE
                """,
                (tag_id, user_id),
            )
            return [row["id"] for row in cur.fetchall()]
