from app.extensions import get_db
from psycopg.rows import dict_row


def get_preferences(user_id: int):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                "SELECT * FROM user_preferences WHERE user_id = %s",
                (user_id,)
            )
            return cur.fetchone()


def upsert_preferences(user_id: int, tema: str):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO user_preferences (user_id, tema, updated_at)
                VALUES (%s, %s, NOW())
                ON CONFLICT (user_id) DO UPDATE
                SET tema = EXCLUDED.tema, updated_at = NOW()
            """, (user_id, tema))
        conn.commit()


def count_categorias(user_id: int) -> int:
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                "SELECT COUNT(*) AS total FROM categorias WHERE user_id = %s AND ativo = TRUE",
                (user_id,)
            )
            row = cur.fetchone()
            return row["total"] if row else 0


def get_categorias(user_id: int, tipo: str) -> list:
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT c.*,
                    COALESCE(
                        json_agg(
                            json_build_object(
                                'id', s.id,
                                'nome', s.nome,
                                'ordem', s.ordem
                            ) ORDER BY s.ordem, s.nome
                        ) FILTER (WHERE s.id IS NOT NULL),
                        '[]'::json
                    ) AS subcategorias
                FROM categorias c
                LEFT JOIN subcategorias s
                    ON s.categoria_id = c.id AND s.ativo = TRUE
                WHERE c.tipo = %s AND c.ativo = TRUE AND c.user_id = %s
                GROUP BY c.id
                ORDER BY c.ordem, c.nome
            """, (tipo, user_id))
            return cur.fetchall()


def create_categoria(user_id: int, tipo: str, nome: str, icone: str, ordem: int = 0, cor_fundo: str | None = None):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                INSERT INTO categorias (user_id, tipo, nome, icone, ordem, cor_fundo)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (user_id, tipo, nome, icone, ordem, cor_fundo))
            row = cur.fetchone()
            conn.commit()
            return row


def update_categoria(categoria_id: int, user_id: int, nome: str, icone: str, cor_fundo: str | None = None):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE categorias SET nome = %s, icone = %s, cor_fundo = %s
                WHERE id = %s AND user_id = %s
            """, (nome, icone, cor_fundo, categoria_id, user_id))
        conn.commit()


def delete_categoria(categoria_id: int, user_id: int):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE categorias SET ativo = FALSE WHERE id = %s AND user_id = %s",
                (categoria_id, user_id)
            )
        conn.commit()


def create_subcategoria(categoria_id: int, user_id: int, nome: str, ordem: int = 0):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                INSERT INTO subcategorias (categoria_id, nome, ordem)
                SELECT %s, %s, %s
                WHERE EXISTS (
                    SELECT 1 FROM categorias WHERE id = %s AND user_id = %s AND ativo = TRUE
                )
                RETURNING *
            """, (categoria_id, nome, ordem, categoria_id, user_id))
            row = cur.fetchone()
            conn.commit()
            return row


def update_subcategoria(sub_id: int, user_id: int, nome: str):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE subcategorias s SET nome = %s
                FROM categorias c
                WHERE s.id = %s AND s.categoria_id = c.id AND c.user_id = %s
            """, (nome, sub_id, user_id))
        conn.commit()


def delete_subcategoria(sub_id: int, user_id: int):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE subcategorias s SET ativo = FALSE
                FROM categorias c
                WHERE s.id = %s AND s.categoria_id = c.id AND c.user_id = %s
            """, (sub_id, user_id))
        conn.commit()


def reset_dados_financeiros(user_id: int, opcoes: dict) -> dict:
    result: dict = {}
    with get_db() as conn:
        with conn.cursor() as cur:
            if opcoes.get("financeiro"):
                cur.execute("DELETE FROM lancamento_tags WHERE lancamento_id IN (SELECT id FROM lancamentos WHERE user_id = %s)", (user_id,))
                cur.execute("UPDATE lancamentos SET ativo = FALSE WHERE user_id = %s AND ativo = TRUE", (user_id,))
                result["lancamentos"] = cur.rowcount
                cur.execute("UPDATE cartoes_credito SET ativo = FALSE WHERE user_id = %s AND ativo = TRUE", (user_id,))
                result["cartoes"] = cur.rowcount
                cur.execute("UPDATE contas_bancarias SET ativo = FALSE WHERE user_id = %s AND ativo = TRUE", (user_id,))
                result["contas"] = cur.rowcount
                cur.execute("DELETE FROM orcamentos WHERE user_id = %s", (user_id,))
                result["orcamentos"] = cur.rowcount

            if opcoes.get("tags"):
                cur.execute("DELETE FROM lancamento_tags WHERE lancamento_id IN (SELECT id FROM lancamentos WHERE user_id = %s)", (user_id,))
                cur.execute("DELETE FROM tags WHERE user_id = %s", (user_id,))
                result["tags"] = cur.rowcount

            if opcoes.get("saude"):
                for table in ("saude_peso_historico", "saude_acordei", "saude_refeicoes",
                              "saude_agua", "saude_exercicios", "saude_produtos",
                              "saude_exercicios_catalogo"):
                    cur.execute(f"DELETE FROM {table} WHERE user_id = %s", (user_id,))  # noqa: S608
                cur.execute("DELETE FROM saude_perfil WHERE user_id = %s", (user_id,))
                result["saude"] = 1

            if opcoes.get("surebet"):
                cur.execute("DELETE FROM surebet_alavancagem WHERE user_id = %s", (user_id,))
                result["surebet"] = cur.rowcount

            if opcoes.get("desenvolvedor"):
                cur.execute("DELETE FROM dev_costs WHERE project_id IN (SELECT id FROM dev_projects WHERE user_id = %s)", (user_id,))
                cur.execute("DELETE FROM dev_projects WHERE user_id = %s", (user_id,))
                result["desenvolvedor"] = cur.rowcount

        conn.commit()
    return result
