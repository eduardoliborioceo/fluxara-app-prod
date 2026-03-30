from app.extensions import get_db
from psycopg.rows import dict_row


def list_projects(user_id: int) -> list:
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT
                    p.id, p.nome, p.publico_alvo, p.status, p.created_at,
                    p.quantidade_usuarios,
                    COALESCE(SUM(
                        CASE c.recorrencia
                            WHEN 'mensal' THEN c.valor / GREATEST(c.compartilhado_entre, 1)
                            WHEN 'anual'  THEN (c.valor / 12.0) / GREATEST(c.compartilhado_entre, 1)
                            ELSE 0
                        END
                    ), 0) AS despesa_mensal
                FROM dev_projects p
                LEFT JOIN dev_costs c ON c.project_id = p.id
                WHERE p.user_id = %s
                GROUP BY p.id
                ORDER BY p.created_at DESC
            """, (user_id,))
            return cur.fetchall()


def get_project(project_id: int, user_id: int):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                "SELECT * FROM dev_projects WHERE id = %s AND user_id = %s",
                (project_id, user_id)
            )
            return cur.fetchone()


def get_costs(project_id: int) -> list:
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                "SELECT * FROM dev_costs WHERE project_id = %s ORDER BY id",
                (project_id,)
            )
            return cur.fetchall()


def create_project(user_id: int, nome: str, publico_alvo: str, status: str,
                   quantidade_usuarios, data_inicio=None) -> dict:
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                INSERT INTO dev_projects (user_id, nome, publico_alvo, status, quantidade_usuarios, data_inicio)
                VALUES (%s, %s, %s, %s, %s, %s) RETURNING *
            """, (user_id, nome, publico_alvo, status, quantidade_usuarios, data_inicio))
            return cur.fetchone()


def add_cost(project_id: int, nome: str, tipo: str, valor: float,
             recorrencia: str, compartilhado_entre: int, servico_key: str = None):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO dev_costs
                    (project_id, nome, tipo, valor, recorrencia, compartilhado_entre, servico_key)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (project_id, nome, tipo, valor, recorrencia, compartilhado_entre, servico_key))


def update_project(project_id: int, user_id: int, nome: str, publico_alvo: str,
                   status: str, quantidade_usuarios, data_inicio=None):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE dev_projects
                SET nome = %s, publico_alvo = %s, status = %s, quantidade_usuarios = %s,
                    data_inicio = COALESCE(%s, data_inicio)
                WHERE id = %s AND user_id = %s
            """, (nome, publico_alvo, status, quantidade_usuarios, data_inicio, project_id, user_id))


def delete_costs(project_id: int):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM dev_costs WHERE project_id = %s", (project_id,))


def delete_project(project_id: int, user_id: int):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM dev_projects WHERE id = %s AND user_id = %s",
                (project_id, user_id)
            )


def list_cost_types(user_id: int) -> list:
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                "SELECT id, nome, tipo FROM dev_cost_types WHERE user_id = %s ORDER BY tipo, nome",
                (user_id,)
            )
            return cur.fetchall()


def add_cost_type(user_id: int, nome: str, tipo: str) -> dict:
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                "INSERT INTO dev_cost_types (user_id, nome, tipo) VALUES (%s, %s, %s) RETURNING id, nome, tipo",
                (user_id, nome, tipo)
            )
            return cur.fetchone()


def delete_cost_type(type_id: int, user_id: int):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM dev_cost_types WHERE id = %s AND user_id = %s",
                (type_id, user_id)
            )
