from app.extensions import get_db
from psycopg.rows import dict_row


def list_tips():
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT id, titulo, partida, campeonato, odd, stake,
                       data_partida, status, created_by, created_at, updated_at
                FROM apostas_tips
                ORDER BY created_at DESC
            """)
            return cur.fetchall()


def get_stats():
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT
                    COUNT(*) FILTER (WHERE status != 'void')   AS total,
                    COUNT(*) FILTER (WHERE status = 'green')   AS green,
                    COUNT(*) FILTER (WHERE status = 'red')     AS red,
                    COUNT(*) FILTER (WHERE status = 'pendente') AS pendente
                FROM apostas_tips
            """)
            return cur.fetchone()


def create_tip(titulo: str, partida, campeonato, odd, stake, data_partida, created_by: int):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                INSERT INTO apostas_tips
                    (titulo, partida, campeonato, odd, stake, data_partida, created_by)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (titulo, partida or None, campeonato or None, odd,
                  stake or None, data_partida or None, created_by))
            row = cur.fetchone()
            conn.commit()
            return row


def update_status(tip_id: int, status: str):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                UPDATE apostas_tips
                SET status = %s, updated_at = NOW()
                WHERE id = %s
                RETURNING *
            """, (status, tip_id))
            row = cur.fetchone()
            conn.commit()
            return row


def delete_tip(tip_id: int):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM apostas_tips WHERE id = %s", (tip_id,))
            conn.commit()
