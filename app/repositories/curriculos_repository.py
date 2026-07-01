import json
from app.extensions import get_db
from psycopg.rows import dict_row


def list_curriculos(user_id: int) -> list:
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT id, titulo, criado_em, atualizado_em
                FROM curriculos
                WHERE user_id = %s
                ORDER BY atualizado_em DESC
            """, (user_id,))
            return cur.fetchall()


def get_curriculo(curriculo_id: int, user_id: int):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT * FROM curriculos
                WHERE id = %s AND user_id = %s
            """, (curriculo_id, user_id))
            return cur.fetchone()


def create_curriculo(user_id: int, titulo: str, dados: dict):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                INSERT INTO curriculos (user_id, titulo, dados)
                VALUES (%s, %s, %s)
                RETURNING *
            """, (user_id, titulo, json.dumps(dados, ensure_ascii=False)))
            row = cur.fetchone()
            conn.commit()
            return row


def update_curriculo(curriculo_id: int, user_id: int, titulo: str, dados: dict):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE curriculos
                SET titulo = %s, dados = %s, atualizado_em = NOW()
                WHERE id = %s AND user_id = %s
            """, (titulo, json.dumps(dados, ensure_ascii=False), curriculo_id, user_id))
        conn.commit()


def delete_curriculo(curriculo_id: int, user_id: int):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM curriculos WHERE id = %s AND user_id = %s",
                (curriculo_id, user_id)
            )
        conn.commit()
