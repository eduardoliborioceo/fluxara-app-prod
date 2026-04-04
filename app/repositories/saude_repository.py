from app.extensions import get_db
from psycopg.rows import dict_row


def get_perfil(user_id: int):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                "SELECT * FROM saude_perfil WHERE user_id = %s",
                (user_id,)
            )
            return cur.fetchone()


def upsert_perfil(user_id: int, altura_cm, peso_atual_kg, peso_meta_kg):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                INSERT INTO saude_perfil (user_id, altura_cm, peso_atual_kg, peso_meta_kg, atualizado_em)
                VALUES (%s, %s, %s, %s, NOW())
                ON CONFLICT (user_id) DO UPDATE
                SET altura_cm      = EXCLUDED.altura_cm,
                    peso_atual_kg  = EXCLUDED.peso_atual_kg,
                    peso_meta_kg   = EXCLUDED.peso_meta_kg,
                    atualizado_em  = NOW()
                RETURNING *
            """, (user_id, altura_cm, peso_atual_kg, peso_meta_kg))
            row = cur.fetchone()
            conn.commit()
            return row


def get_peso_historico(user_id: int, limit: int = 30):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT id, peso_kg, registrado_em
                FROM saude_peso_historico
                WHERE user_id = %s
                ORDER BY registrado_em DESC
                LIMIT %s
            """, (user_id, limit))
            return cur.fetchall()


def registrar_peso(user_id: int, peso_kg: float):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                INSERT INTO saude_peso_historico (user_id, peso_kg, registrado_em)
                VALUES (%s, %s, NOW())
                RETURNING *
            """, (user_id, peso_kg))
            row = cur.fetchone()
            conn.commit()
            return row


def get_acordei_hoje(user_id: int):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT id, hora_acordou
                FROM saude_acordei
                WHERE user_id = %s AND DATE(hora_acordou AT TIME ZONE 'America/Sao_Paulo') = CURRENT_DATE
                ORDER BY hora_acordou DESC
                LIMIT 1
            """, (user_id,))
            return cur.fetchone()


def registrar_acordei(user_id: int):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                INSERT INTO saude_acordei (user_id, hora_acordou)
                VALUES (%s, NOW())
                RETURNING *
            """, (user_id,))
            row = cur.fetchone()
            conn.commit()
            return row


def get_refeicoes_hoje(user_id: int):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT id, tipo_refeicao, descricao, calorias,
                       proteinas_g, carboidratos_g, gorduras_g,
                       fonte, registrado_em
                FROM saude_refeicoes
                WHERE user_id = %s
                  AND DATE(registrado_em AT TIME ZONE 'America/Sao_Paulo') = CURRENT_DATE
                ORDER BY registrado_em
            """, (user_id,))
            return cur.fetchall()


def registrar_refeicao(user_id: int, tipo_refeicao: str, descricao: str,
                       calorias: int, proteinas_g, carboidratos_g, gorduras_g, fonte: str):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                INSERT INTO saude_refeicoes
                    (user_id, tipo_refeicao, descricao, calorias,
                     proteinas_g, carboidratos_g, gorduras_g, fonte, registrado_em)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
                RETURNING *
            """, (user_id, tipo_refeicao, descricao, calorias,
                  proteinas_g, carboidratos_g, gorduras_g, fonte))
            row = cur.fetchone()
            conn.commit()
            return row


def delete_refeicao(user_id: int, refeicao_id: int):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM saude_refeicoes WHERE id = %s AND user_id = %s",
                (refeicao_id, user_id)
            )
            conn.commit()


def get_agua_hoje_total(user_id: int) -> int:
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT COALESCE(SUM(quantidade_ml), 0) AS total_ml
                FROM saude_agua
                WHERE user_id = %s
                  AND DATE(registrado_em AT TIME ZONE 'America/Sao_Paulo') = CURRENT_DATE
            """, (user_id,))
            row = cur.fetchone()
            return int(row["total_ml"]) if row else 0


def get_agua_registros_hoje(user_id: int):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT id, quantidade_ml, registrado_em
                FROM saude_agua
                WHERE user_id = %s
                  AND DATE(registrado_em AT TIME ZONE 'America/Sao_Paulo') = CURRENT_DATE
                ORDER BY registrado_em DESC
            """, (user_id,))
            return cur.fetchall()


def registrar_agua(user_id: int, quantidade_ml: int):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                INSERT INTO saude_agua (user_id, quantidade_ml, registrado_em)
                VALUES (%s, %s, NOW())
                RETURNING *
            """, (user_id, quantidade_ml))
            row = cur.fetchone()
            conn.commit()
            return row


def delete_agua(user_id: int, registro_id: int):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM saude_agua WHERE id = %s AND user_id = %s",
                (registro_id, user_id)
            )
            conn.commit()
