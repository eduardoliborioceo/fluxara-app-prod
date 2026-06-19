from app.extensions import get_db
from psycopg.rows import dict_row


def list_contas(user_id: int) -> list:
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT cb.*, c.nome AS tipo_nome, c.icone AS tipo_icone,
                    cb.saldo_inicial
                    + COALESCE((
                        SELECT SUM(l.valor) FROM lancamentos l
                        WHERE l.conta_id = cb.id AND l.tipo = 'receita'
                          AND l.efetivado = true AND l.ativo = true
                    ), 0)
                    - COALESCE((
                        SELECT SUM(l.valor) FROM lancamentos l
                        WHERE l.conta_id = cb.id AND l.tipo = 'despesa'
                          AND l.efetivado = true AND l.ativo = true
                    ), 0)
                    - COALESCE((
                        SELECT SUM(l.valor) FROM lancamentos l
                        WHERE l.conta_id = cb.id AND l.tipo = 'pagamento_fatura'
                          AND l.efetivado = true AND l.ativo = true
                    ), 0)
                    + COALESCE((
                        SELECT SUM(t.valor) FROM transferencias t
                        WHERE t.conta_destino_id = cb.id
                          AND t.efetivado = true AND t.ativo = true
                    ), 0)
                    - COALESCE((
                        SELECT SUM(t.valor) FROM transferencias t
                        WHERE t.conta_origem_id = cb.id
                          AND t.efetivado = true AND t.ativo = true
                    ), 0)
                    AS saldo_atual,
                    cb.saldo_inicial
                    + COALESCE((
                        SELECT SUM(l.valor) FROM lancamentos l
                        WHERE l.conta_id = cb.id AND l.tipo = 'receita' AND l.ativo = true
                          AND l.data_vencimento <= (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::date
                    ), 0)
                    - COALESCE((
                        SELECT SUM(l.valor) FROM lancamentos l
                        WHERE l.conta_id = cb.id AND l.tipo = 'despesa' AND l.ativo = true
                          AND l.data_vencimento <= (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::date
                    ), 0)
                    - COALESCE((
                        SELECT SUM(l.valor) FROM lancamentos l
                        WHERE l.conta_id = cb.id AND l.tipo = 'pagamento_fatura' AND l.ativo = true
                          AND l.data_vencimento <= (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::date
                    ), 0)
                    + COALESCE((
                        SELECT SUM(t.valor) FROM transferencias t
                        WHERE t.conta_destino_id = cb.id AND t.ativo = true
                          AND t.data_vencimento <= (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::date
                    ), 0)
                    - COALESCE((
                        SELECT SUM(t.valor) FROM transferencias t
                        WHERE t.conta_origem_id = cb.id AND t.ativo = true
                          AND t.data_vencimento <= (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::date
                    ), 0)
                    AS saldo_previsto
                FROM contas_bancarias cb
                LEFT JOIN categorias c ON c.id = cb.categoria_id
                WHERE cb.user_id = %s AND cb.ativo = TRUE
                ORDER BY COALESCE(cb.posicao, 0), cb.criado_em
            """, (user_id,))
            return cur.fetchall()


def create_conta(user_id: int, nome: str, instituicao: str, categoria_id: int | None,
                 saldo_inicial: float, finalidade: str | None = None):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                INSERT INTO contas_bancarias (user_id, nome, instituicao, categoria_id, saldo_inicial, finalidade)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (user_id, nome, instituicao, categoria_id, saldo_inicial, finalidade))
            row = cur.fetchone()
            conn.commit()
            return row


def update_conta(conta_id: int, user_id: int, nome: str, instituicao: str, categoria_id: int | None,
                 saldo_inicial: float, finalidade: str | None = None):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE contas_bancarias
                SET nome = %s, instituicao = %s, categoria_id = %s, saldo_inicial = %s, finalidade = %s
                WHERE id = %s AND user_id = %s AND ativo = TRUE
            """, (nome, instituicao, categoria_id, saldo_inicial, finalidade, conta_id, user_id))
        conn.commit()


def delete_conta(conta_id: int, user_id: int):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE contas_bancarias SET ativo = FALSE
                WHERE id = %s AND user_id = %s
            """, (conta_id, user_id))
        conn.commit()


def list_contas_projetadas(user_id: int, mes: int, ano: int) -> list:
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT cb.*, c.nome AS tipo_nome, c.icone AS tipo_icone,
                    cb.saldo_inicial
                    + COALESCE((
                        SELECT SUM(l.valor) FROM lancamentos l
                        WHERE l.conta_id = cb.id AND l.tipo = 'receita' AND l.ativo = true
                          AND l.data_vencimento <= (DATE_TRUNC('month', MAKE_DATE(%s, %s, 1)) + INTERVAL '1 month - 1 day')::date
                    ), 0)
                    - COALESCE((
                        SELECT SUM(l.valor) FROM lancamentos l
                        WHERE l.conta_id = cb.id AND l.tipo = 'despesa' AND l.ativo = true
                          AND l.data_vencimento <= (DATE_TRUNC('month', MAKE_DATE(%s, %s, 1)) + INTERVAL '1 month - 1 day')::date
                    ), 0)
                    - COALESCE((
                        SELECT SUM(l.valor) FROM lancamentos l
                        WHERE l.conta_id = cb.id AND l.tipo = 'pagamento_fatura' AND l.ativo = true
                          AND l.data_vencimento <= (DATE_TRUNC('month', MAKE_DATE(%s, %s, 1)) + INTERVAL '1 month - 1 day')::date
                    ), 0)
                    + COALESCE((
                        SELECT SUM(t.valor) FROM transferencias t
                        WHERE t.conta_destino_id = cb.id AND t.ativo = true
                          AND t.data_vencimento <= (DATE_TRUNC('month', MAKE_DATE(%s, %s, 1)) + INTERVAL '1 month - 1 day')::date
                    ), 0)
                    - COALESCE((
                        SELECT SUM(t.valor) FROM transferencias t
                        WHERE t.conta_origem_id = cb.id AND t.ativo = true
                          AND t.data_vencimento <= (DATE_TRUNC('month', MAKE_DATE(%s, %s, 1)) + INTERVAL '1 month - 1 day')::date
                    ), 0)
                    AS saldo_atual,
                    cb.saldo_inicial
                    + COALESCE((
                        SELECT SUM(l.valor) FROM lancamentos l
                        WHERE l.conta_id = cb.id AND l.tipo = 'receita' AND l.ativo = true
                          AND l.data_vencimento <= (DATE_TRUNC('month', MAKE_DATE(%s, %s, 1)) + INTERVAL '1 month - 1 day')::date
                    ), 0)
                    - COALESCE((
                        SELECT SUM(l.valor) FROM lancamentos l
                        WHERE l.conta_id = cb.id AND l.tipo = 'despesa' AND l.ativo = true
                          AND l.data_vencimento <= (DATE_TRUNC('month', MAKE_DATE(%s, %s, 1)) + INTERVAL '1 month - 1 day')::date
                    ), 0)
                    - COALESCE((
                        SELECT SUM(l.valor) FROM lancamentos l
                        WHERE l.conta_id = cb.id AND l.tipo = 'pagamento_fatura' AND l.ativo = true
                          AND l.data_vencimento <= (DATE_TRUNC('month', MAKE_DATE(%s, %s, 1)) + INTERVAL '1 month - 1 day')::date
                    ), 0)
                    + COALESCE((
                        SELECT SUM(t.valor) FROM transferencias t
                        WHERE t.conta_destino_id = cb.id AND t.ativo = true
                          AND t.data_vencimento <= (DATE_TRUNC('month', MAKE_DATE(%s, %s, 1)) + INTERVAL '1 month - 1 day')::date
                    ), 0)
                    - COALESCE((
                        SELECT SUM(t.valor) FROM transferencias t
                        WHERE t.conta_origem_id = cb.id AND t.ativo = true
                          AND t.data_vencimento <= (DATE_TRUNC('month', MAKE_DATE(%s, %s, 1)) + INTERVAL '1 month - 1 day')::date
                    ), 0)
                    AS saldo_previsto
                FROM contas_bancarias cb
                LEFT JOIN categorias c ON c.id = cb.categoria_id
                WHERE cb.user_id = %s AND cb.ativo = TRUE
                ORDER BY COALESCE(cb.posicao, 0), cb.criado_em
            """, (ano, mes, ano, mes, ano, mes, ano, mes, ano, mes, ano, mes, ano, mes, ano, mes, ano, mes, ano, mes, user_id))
            return cur.fetchall()


def reorder_contas(user_id: int, ordered_ids: list[int]) -> None:
    with get_db() as conn:
        with conn.cursor() as cur:
            for pos, conta_id in enumerate(ordered_ids):
                cur.execute(
                    "UPDATE contas_bancarias SET posicao = %s WHERE id = %s AND user_id = %s AND ativo = TRUE",
                    (pos, conta_id, user_id)
                )
        conn.commit()


def get_total_saldo(user_id: int) -> float:
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT COALESCE(SUM(saldo_inicial), 0) AS total
                FROM contas_bancarias
                WHERE user_id = %s AND ativo = TRUE
            """, (user_id,))
            row = cur.fetchone()
            return float(row["total"]) if row else 0.0
