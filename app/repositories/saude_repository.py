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


def get_acordei_hoje(user_id: int, timezone: str = 'America/Sao_Paulo'):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT id, hora_acordou
                FROM saude_acordei
                WHERE user_id = %s AND DATE(hora_acordou AT TIME ZONE %s) = DATE(NOW() AT TIME ZONE %s)
                ORDER BY hora_acordou DESC
                LIMIT 1
            """, (user_id, timezone, timezone))
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


def get_refeicoes_hoje(user_id: int, timezone: str = 'America/Sao_Paulo'):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT id, tipo_refeicao, descricao, calorias,
                       proteinas_g, carboidratos_g, gorduras_g,
                       fonte, registrado_em
                FROM saude_refeicoes
                WHERE user_id = %s
                  AND DATE(registrado_em AT TIME ZONE %s) = DATE(NOW() AT TIME ZONE %s)
                ORDER BY registrado_em
            """, (user_id, timezone, timezone))
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


def get_agua_hoje_total(user_id: int, timezone: str = 'America/Sao_Paulo') -> int:
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT COALESCE(SUM(quantidade_ml), 0) AS total_ml
                FROM saude_agua
                WHERE user_id = %s
                  AND DATE(registrado_em AT TIME ZONE %s) = DATE(NOW() AT TIME ZONE %s)
            """, (user_id, timezone, timezone))
            row = cur.fetchone()
            return int(row["total_ml"]) if row else 0


def get_agua_registros_hoje(user_id: int, timezone: str = 'America/Sao_Paulo'):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT id, quantidade_ml, registrado_em
                FROM saude_agua
                WHERE user_id = %s
                  AND DATE(registrado_em AT TIME ZONE %s) = DATE(NOW() AT TIME ZONE %s)
                ORDER BY registrado_em DESC
            """, (user_id, timezone, timezone))
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


# ── Produtos ────────────────────────────────────────────────────────────────

def search_produtos(user_id: int, query: str, limit: int = 20):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT id, nome, marca, porcao_descricao, porcao_g,
                       calorias_por_porcao, proteinas_g, carboidratos_g, gorduras_totais_g
                FROM saude_produtos
                WHERE user_id = %s AND (
                    translate(lower(nome),  'áàãâäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiioooooouuuuc')
                        ILIKE translate(lower(%s), 'áàãâäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiioooooouuuuc')
                    OR translate(lower(marca), 'áàãâäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiioooooouuuuc')
                        ILIKE translate(lower(%s), 'áàãâäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiioooooouuuuc')
                )
                ORDER BY nome
                LIMIT %s
            """, (user_id, f"%{query}%", f"%{query}%", limit))
            return cur.fetchall()


def get_produtos(user_id: int, limit: int = 200):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT id, nome, marca, porcao_descricao, porcao_g,
                       calorias_por_porcao, proteinas_g, carboidratos_g,
                       gorduras_totais_g, sodio_mg, fibras_g, criado_em
                FROM saude_produtos
                WHERE user_id = %s
                ORDER BY nome
                LIMIT %s
            """, (user_id, limit))
            return cur.fetchall()


def save_produto(user_id: int, nome: str, marca: str, porcao_descricao: str,
                 porcao_g, calorias_por_porcao, proteinas_g, carboidratos_g,
                 gorduras_totais_g, sodio_mg, fibras_g):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                INSERT INTO saude_produtos
                    (user_id, nome, marca, porcao_descricao, porcao_g,
                     calorias_por_porcao, proteinas_g, carboidratos_g,
                     gorduras_totais_g, sodio_mg, fibras_g, criado_em)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                RETURNING *
            """, (user_id, nome, marca, porcao_descricao, porcao_g,
                  calorias_por_porcao, proteinas_g, carboidratos_g,
                  gorduras_totais_g, sodio_mg, fibras_g))
            row = cur.fetchone()
            conn.commit()
            return row


def delete_produto(user_id: int, produto_id: int):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM saude_produtos WHERE id = %s AND user_id = %s",
                (produto_id, user_id)
            )
            conn.commit()


# ── Catálogo de exercícios ───────────────────────────────────────────────────

def search_exercicios_catalogo(user_id: int, query: str, limit: int = 20):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT id, nome, tipo, grupo_muscular, duracao_padrao, calorias_est
                FROM saude_exercicios_catalogo
                WHERE user_id = %s AND (
                    translate(lower(nome), 'áàãâäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiioooooouuuuc')
                        ILIKE translate(lower(%s), 'áàãâäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiioooooouuuuc')
                )
                ORDER BY nome
                LIMIT %s
            """, (user_id, f"%{query}%", limit))
            return cur.fetchall()


def get_exercicios_catalogo(user_id: int, limit: int = 300):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT id, nome, tipo, grupo_muscular, duracao_padrao, calorias_est
                FROM saude_exercicios_catalogo
                WHERE user_id = %s
                ORDER BY tipo ASC, grupo_muscular ASC, nome ASC
                LIMIT %s
            """, (user_id, limit))
            return cur.fetchall()


def save_exercicio_catalogo(user_id: int, nome: str, tipo: str,
                            grupo_muscular, duracao_padrao, calorias_est):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                INSERT INTO saude_exercicios_catalogo
                    (user_id, nome, tipo, grupo_muscular, duracao_padrao, calorias_est)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (user_id, nome, tipo, grupo_muscular, duracao_padrao, calorias_est))
            row = cur.fetchone()
            conn.commit()
            return row


def delete_exercicio_catalogo(user_id: int, ex_id: int):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM saude_exercicios_catalogo WHERE id = %s AND user_id = %s",
                (ex_id, user_id)
            )
            conn.commit()


# ── Histórico ────────────────────────────────────────────────────────────────

def get_refeicoes_por_data(user_id: int, data_str: str, timezone: str = 'America/Sao_Paulo'):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT id, tipo_refeicao, descricao, calorias,
                       proteinas_g, carboidratos_g, gorduras_g,
                       fonte, registrado_em
                FROM saude_refeicoes
                WHERE user_id = %s
                  AND DATE(registrado_em AT TIME ZONE %s) = %s::date
                ORDER BY registrado_em
            """, (user_id, timezone, data_str))
            return cur.fetchall()


def get_agua_por_data(user_id: int, data_str: str, timezone: str = 'America/Sao_Paulo'):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT id, quantidade_ml, registrado_em
                FROM saude_agua
                WHERE user_id = %s
                  AND DATE(registrado_em AT TIME ZONE %s) = %s::date
                ORDER BY registrado_em DESC
            """, (user_id, timezone, data_str))
            return cur.fetchall()


# ── Exercícios ───────────────────────────────────────────────────────────────

def get_exercicios_hoje(user_id: int, timezone: str = 'America/Sao_Paulo'):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT id, tipo, nome, duracao_min, calorias_gasto, intensidade, observacao, registrado_em
                FROM saude_exercicios
                WHERE user_id = %s
                  AND DATE(registrado_em AT TIME ZONE %s) = DATE(NOW() AT TIME ZONE %s)
                ORDER BY registrado_em
            """, (user_id, timezone, timezone))
            return cur.fetchall()


def registrar_exercicio(user_id: int, tipo: str, nome: str,
                        duracao_min, calorias_gasto, intensidade, observacao):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                INSERT INTO saude_exercicios
                    (user_id, tipo, nome, duracao_min, calorias_gasto, intensidade, observacao)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (user_id, tipo, nome, duracao_min, calorias_gasto, intensidade, observacao))
            row = cur.fetchone()
            conn.commit()
            return row


def delete_exercicio(user_id: int, exercicio_id: int):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM saude_exercicios WHERE id = %s AND user_id = %s",
                (exercicio_id, user_id)
            )
            conn.commit()


def get_resumo_mes(user_id: int, timezone: str, ano: int, mes: int):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                WITH ref AS (
                    SELECT
                        DATE(registrado_em AT TIME ZONE %s) AS dia,
                        COALESCE(SUM(calorias), 0)          AS calorias_total,
                        COUNT(*)                            AS refeicoes_count
                    FROM saude_refeicoes
                    WHERE user_id = %s
                      AND EXTRACT(YEAR  FROM registrado_em AT TIME ZONE %s) = %s
                      AND EXTRACT(MONTH FROM registrado_em AT TIME ZONE %s) = %s
                    GROUP BY 1
                ),
                agua AS (
                    SELECT
                        DATE(registrado_em AT TIME ZONE %s) AS dia,
                        COALESCE(SUM(quantidade_ml), 0)     AS total_ml
                    FROM saude_agua
                    WHERE user_id = %s
                      AND EXTRACT(YEAR  FROM registrado_em AT TIME ZONE %s) = %s
                      AND EXTRACT(MONTH FROM registrado_em AT TIME ZONE %s) = %s
                    GROUP BY 1
                )
                SELECT
                    COALESCE(r.dia, a.dia)        AS dia,
                    COALESCE(r.calorias_total, 0) AS calorias_total,
                    COALESCE(r.refeicoes_count, 0)AS refeicoes_count,
                    COALESCE(a.total_ml, 0)        AS agua_total_ml
                FROM ref r
                FULL OUTER JOIN agua a ON r.dia = a.dia
                ORDER BY dia
            """, (
                timezone, user_id, timezone, ano, timezone, mes,
                timezone, user_id, timezone, ano, timezone, mes,
            ))
            return cur.fetchall()
