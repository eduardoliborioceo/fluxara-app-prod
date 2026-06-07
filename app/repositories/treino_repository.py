from app.extensions import get_db
from psycopg.rows import dict_row


def get_treino_hoje(user_id: int, timezone: str = 'America/Sao_Paulo'):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT id, grupo, exercicio, reps, peso_kg, duracao_seg, observacao, registrado_em
                FROM saude_treino_itens
                WHERE user_id = %s
                  AND data = DATE(NOW() AT TIME ZONE %s)
                ORDER BY exercicio ASC, id ASC
            """, (user_id, timezone))
            return cur.fetchall()


def get_treino_por_data(user_id: int, data_str: str):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT id, grupo, exercicio, reps, peso_kg, duracao_seg, observacao, registrado_em
                FROM saude_treino_itens
                WHERE user_id = %s AND data = %s::date
                ORDER BY exercicio ASC, id ASC
            """, (user_id, data_str))
            return cur.fetchall()


def get_treino_historico(user_id: int, limit: int = 30):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT
                    data,
                    COUNT(DISTINCT exercicio) AS total_exercicios,
                    COUNT(*)                  AS total_series,
                    COALESCE(SUM(
                        COALESCE(peso_kg, 0) * GREATEST(COALESCE(reps, 1), 1)
                    ), 0) AS volume_total_kg
                FROM saude_treino_itens
                WHERE user_id = %s
                GROUP BY data
                ORDER BY data DESC
                LIMIT %s
            """, (user_id, limit))
            return cur.fetchall()


def registrar_treino_item(user_id: int, data_str: str, grupo: str, exercicio: str,
                          reps, peso_kg, duracao_seg, observacao):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                INSERT INTO saude_treino_itens
                    (user_id, data, grupo, exercicio, reps, peso_kg, duracao_seg, observacao)
                VALUES (%s, %s::date, %s, %s, %s, %s, %s, %s)
                RETURNING id, grupo, exercicio, reps, peso_kg, duracao_seg, observacao, registrado_em
            """, (user_id, data_str, grupo, exercicio, reps, peso_kg, duracao_seg, observacao))
            row = cur.fetchone()
            conn.commit()
            return row


def delete_treino_item(user_id: int, item_id: int):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM saude_treino_itens WHERE id = %s AND user_id = %s",
                (item_id, user_id)
            )
            conn.commit()
