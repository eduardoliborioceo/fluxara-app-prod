import json

from app.extensions import get_db
from psycopg.rows import dict_row


def _columns_exist(conn) -> bool:
    with conn.cursor() as cur:
        cur.execute("""
            SELECT COUNT(*) AS cnt FROM information_schema.columns
            WHERE table_name = 'apostas_tips'
              AND column_name IN ('jogos', 'link_aposta')
        """)
        return cur.fetchone()["cnt"] == 2


def _aprovada_exists(conn) -> bool:
    with conn.cursor() as cur:
        cur.execute("""
            SELECT COUNT(*) AS cnt FROM information_schema.columns
            WHERE table_name = 'apostas_tips'
              AND column_name = 'aprovada'
        """)
        return cur.fetchone()["cnt"] == 1


def list_tips(admin: bool = False):
    with get_db() as conn:
        migrated = _columns_exist(conn)
        has_aprovada = _aprovada_exists(conn)
        with conn.cursor(row_factory=dict_row) as cur:
            if migrated and has_aprovada:
                if admin:
                    cur.execute("""
                        SELECT id, titulo, partida, campeonato, odd, stake,
                               data_partida, status, created_by, created_at, updated_at,
                               jogos, link_aposta, aprovada,
                               CASE WHEN aprovada
                                 THEN ROW_NUMBER() OVER (PARTITION BY aprovada ORDER BY created_at ASC)
                               END AS numero_publico
                        FROM apostas_tips
                        ORDER BY created_at DESC
                    """)
                else:
                    cur.execute("""
                        SELECT id, titulo, partida, campeonato, odd, stake,
                               data_partida, status, created_by, created_at, updated_at,
                               jogos, link_aposta, aprovada,
                               ROW_NUMBER() OVER (ORDER BY created_at ASC) AS numero_publico
                        FROM apostas_tips
                        WHERE aprovada = TRUE
                        ORDER BY created_at DESC
                    """)
            elif migrated:
                cur.execute("""
                    SELECT id, titulo, partida, campeonato, odd, stake,
                           data_partida, status, created_by, created_at, updated_at,
                           jogos, link_aposta
                    FROM apostas_tips
                    ORDER BY created_at DESC
                """)
            else:
                cur.execute("""
                    SELECT id, titulo, partida, campeonato, odd, stake,
                           data_partida, status, created_by, created_at, updated_at
                    FROM apostas_tips
                    ORDER BY created_at DESC
                """)
            return cur.fetchall()


def get_stats():
    with get_db() as conn:
        has_aprovada = _aprovada_exists(conn)
        with conn.cursor(row_factory=dict_row) as cur:
            if has_aprovada:
                cur.execute("""
                    SELECT
                        COUNT(*) FILTER (WHERE status != 'void')    AS total,
                        COUNT(*) FILTER (WHERE status = 'green')    AS green,
                        COUNT(*) FILTER (WHERE status = 'red')      AS red,
                        COUNT(*) FILTER (WHERE status = 'pendente') AS pendente
                    FROM apostas_tips
                    WHERE aprovada = TRUE
                """)
            else:
                cur.execute("""
                    SELECT
                        COUNT(*) FILTER (WHERE status != 'void')    AS total,
                        COUNT(*) FILTER (WHERE status = 'green')    AS green,
                        COUNT(*) FILTER (WHERE status = 'red')      AS red,
                        COUNT(*) FILTER (WHERE status = 'pendente') AS pendente
                    FROM apostas_tips
                """)
            return cur.fetchone()


def create_tip(titulo: str, partida, campeonato, odd, stake, data_partida,
               created_by: int, jogos: list, link_aposta):
    with get_db() as conn:
        migrated = _columns_exist(conn)
        with conn.cursor(row_factory=dict_row) as cur:
            if migrated:
                cur.execute("""
                    INSERT INTO apostas_tips
                        (titulo, partida, campeonato, odd, stake, data_partida,
                         created_by, jogos, link_aposta)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s)
                    RETURNING *
                """, (titulo, partida or None, campeonato or None, odd,
                      stake or None, data_partida or None, created_by,
                      json.dumps(jogos), link_aposta or None))
            else:
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


def toggle_aprovada(tip_id: int):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                UPDATE apostas_tips
                SET aprovada = NOT aprovada, updated_at = NOW()
                WHERE id = %s
                RETURNING *
            """, (tip_id,))
            row = cur.fetchone()
            conn.commit()
            return row


def update_tip(tip_id: int, titulo: str, stake, link_aposta):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                UPDATE apostas_tips
                SET titulo = %s, stake = %s, link_aposta = %s, updated_at = NOW()
                WHERE id = %s
                RETURNING *
            """, (titulo, stake or None, link_aposta or None, tip_id))
            row = cur.fetchone()
            conn.commit()
            return row


def delete_tip(tip_id: int):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM apostas_tips WHERE id = %s", (tip_id,))
            conn.commit()
