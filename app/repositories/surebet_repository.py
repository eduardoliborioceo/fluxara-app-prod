from app.extensions import get_db
from psycopg.rows import dict_row


def list_alavancagens(user_id: int):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT id, nome, aposta_inicial, odd, num_rodadas, rodada_atual, criado_em
                FROM surebet_alavancagem
                WHERE user_id = %s
                ORDER BY criado_em DESC
            """, (user_id,))
            return cur.fetchall()


def create_alavancagem(user_id: int, nome: str, aposta_inicial: float,
                       odd: float, num_rodadas: int):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                INSERT INTO surebet_alavancagem
                    (user_id, nome, aposta_inicial, odd, num_rodadas, rodada_atual)
                VALUES (%s, %s, %s, %s, %s, 0)
                RETURNING *
            """, (user_id, nome, aposta_inicial, odd, num_rodadas))
            row = cur.fetchone()
            conn.commit()
            return row


def update_rodada(alavancagem_id: int, user_id: int, rodada_atual: int):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                UPDATE surebet_alavancagem
                SET rodada_atual = %s, atualizado_em = NOW()
                WHERE id = %s AND user_id = %s
                RETURNING *
            """, (rodada_atual, alavancagem_id, user_id))
            row = cur.fetchone()
            conn.commit()
            return row


def delete_alavancagem(alavancagem_id: int, user_id: int):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM surebet_alavancagem WHERE id = %s AND user_id = %s",
                (alavancagem_id, user_id)
            )
            conn.commit()


# ─── Partidas monitoradas ────────────────────────────────────────────────────

def list_partidas(user_id: int):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT id, nome, odd_mandante, odd_visitante, odd_empate_gols,
                       total_apostar, criado_em, atualizado_em
                FROM surebet_partida
                WHERE user_id = %s
                ORDER BY criado_em DESC
            """, (user_id,))
            return cur.fetchall()


def create_partida(user_id: int, nome: str, odd_mandante: float,
                   odd_visitante: float, odd_empate_gols: float,
                   total_apostar: float):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                INSERT INTO surebet_partida
                    (user_id, nome, odd_mandante, odd_visitante,
                     odd_empate_gols, total_apostar)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (user_id, nome, odd_mandante, odd_visitante,
                  odd_empate_gols, total_apostar))
            row = cur.fetchone()
            conn.commit()
            return row


def update_partida(partida_id: int, user_id: int, nome: str,
                   odd_mandante: float, odd_visitante: float,
                   odd_empate_gols: float, total_apostar: float):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                UPDATE surebet_partida
                SET nome = %s, odd_mandante = %s, odd_visitante = %s,
                    odd_empate_gols = %s, total_apostar = %s,
                    atualizado_em = NOW()
                WHERE id = %s AND user_id = %s
                RETURNING *
            """, (nome, odd_mandante, odd_visitante, odd_empate_gols,
                  total_apostar, partida_id, user_id))
            row = cur.fetchone()
            conn.commit()
            return row


def delete_partida(partida_id: int, user_id: int):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM surebet_partida WHERE id = %s AND user_id = %s",
                (partida_id, user_id)
            )
            conn.commit()
