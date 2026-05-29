from app.extensions import get_db
from psycopg.rows import dict_row


def create_lancamento(user_id, tipo, descricao, valor, data_vencimento, efetivado,
                      recorrente, recorrencia_tipo, categoria_id, subcategoria_id,
                      conta_id, cartao_id, fatura_mes, fatura_ano,
                      grupo_recorrencia_id=None):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                INSERT INTO lancamentos (user_id, tipo, descricao, valor, data_vencimento,
                    efetivado, recorrente, recorrencia_tipo, categoria_id, subcategoria_id,
                    conta_id, cartao_id, fatura_mes, fatura_ano, grupo_recorrencia_id)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                RETURNING *
            """, (user_id, tipo, descricao, valor, data_vencimento, efetivado,
                  recorrente, recorrencia_tipo, categoria_id, subcategoria_id,
                  conta_id, cartao_id, fatura_mes, fatura_ano, grupo_recorrencia_id))
            row = cur.fetchone()
            conn.commit()
            return row


def get_lancamentos_by_user(user_id):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT l.*,
                    c.nome AS categoria_nome,
                    s.nome AS subcategoria_nome,
                    cb.nome AS conta_nome,
                    cc.nome AS cartao_nome
                FROM lancamentos l
                LEFT JOIN categorias c ON c.id = l.categoria_id
                LEFT JOIN subcategorias s ON s.id = l.subcategoria_id
                LEFT JOIN contas_bancarias cb ON cb.id = l.conta_id
                LEFT JOIN cartoes_credito cc ON cc.id = l.cartao_id
                WHERE l.user_id = %s AND l.ativo = TRUE
                ORDER BY l.criado_em DESC
            """, (user_id,))
            return cur.fetchall()


def get_by_conta(conta_id: int, user_id: int, mes: int = 0, ano: int = 0) -> list:
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT
                    l.id,
                    l.tipo,
                    l.descricao,
                    l.valor,
                    l.data_vencimento,
                    l.efetivado,
                    l.criado_em,
                    l.categoria_id,
                    l.subcategoria_id,
                    l.conta_id,
                    l.cartao_id,
                    l.recorrente,
                    l.recorrencia_tipo,
                    c.nome AS categoria_nome,
                    s.nome AS subcategoria_nome,
                    NULL::text AS conta_parceira_nome
                FROM lancamentos l
                LEFT JOIN categorias c ON c.id = l.categoria_id
                LEFT JOIN subcategorias s ON s.id = l.subcategoria_id
                WHERE l.conta_id = %s AND l.user_id = %s AND l.ativo = TRUE
                  AND (%s = 0 OR l.data_vencimento IS NULL OR EXTRACT(MONTH FROM l.data_vencimento) = %s)
                  AND (%s = 0 OR l.data_vencimento IS NULL OR EXTRACT(YEAR  FROM l.data_vencimento) = %s)

                UNION ALL

                SELECT
                    t.id,
                    'transferencia_saida'::text AS tipo,
                    t.descricao,
                    t.valor,
                    t.data_vencimento,
                    t.efetivado,
                    t.criado_em,
                    NULL::int AS categoria_id,
                    NULL::int AS subcategoria_id,
                    t.conta_origem_id AS conta_id,
                    NULL::int AS cartao_id,
                    t.recorrente,
                    t.recorrencia_tipo,
                    NULL::text AS categoria_nome,
                    NULL::text AS subcategoria_nome,
                    cd.nome AS conta_parceira_nome
                FROM transferencias t
                LEFT JOIN contas_bancarias cd ON cd.id = t.conta_destino_id
                WHERE t.conta_origem_id = %s AND t.user_id = %s AND t.ativo = TRUE
                  AND (%s = 0 OR t.data_vencimento IS NULL OR EXTRACT(MONTH FROM t.data_vencimento) = %s)
                  AND (%s = 0 OR t.data_vencimento IS NULL OR EXTRACT(YEAR  FROM t.data_vencimento) = %s)

                UNION ALL

                SELECT
                    t.id,
                    'transferencia_entrada'::text AS tipo,
                    t.descricao,
                    t.valor,
                    t.data_vencimento,
                    t.efetivado,
                    t.criado_em,
                    NULL::int AS categoria_id,
                    NULL::int AS subcategoria_id,
                    t.conta_destino_id AS conta_id,
                    NULL::int AS cartao_id,
                    t.recorrente,
                    t.recorrencia_tipo,
                    NULL::text AS categoria_nome,
                    NULL::text AS subcategoria_nome,
                    co.nome AS conta_parceira_nome
                FROM transferencias t
                LEFT JOIN contas_bancarias co ON co.id = t.conta_origem_id
                WHERE t.conta_destino_id = %s AND t.user_id = %s AND t.ativo = TRUE
                  AND (%s = 0 OR t.data_vencimento IS NULL OR EXTRACT(MONTH FROM t.data_vencimento) = %s)
                  AND (%s = 0 OR t.data_vencimento IS NULL OR EXTRACT(YEAR  FROM t.data_vencimento) = %s)

                ORDER BY data_vencimento DESC NULLS LAST, criado_em DESC
            """, (conta_id, user_id, mes, mes, ano, ano,
                  conta_id, user_id, mes, mes, ano, ano,
                  conta_id, user_id, mes, mes, ano, ano))
            return cur.fetchall()


def get_by_cartao(cartao_id: int, user_id: int, fatura_mes: int, fatura_ano: int) -> list:
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT l.id, l.tipo, l.descricao, l.valor,
                    l.data_vencimento, l.efetivado, l.criado_em,
                    l.categoria_id, l.subcategoria_id,
                    l.cartao_id, l.fatura_mes, l.fatura_ano,
                    l.recorrente, l.recorrencia_tipo,
                    c.nome AS categoria_nome, s.nome AS subcategoria_nome
                FROM lancamentos l
                LEFT JOIN categorias c ON c.id = l.categoria_id
                LEFT JOIN subcategorias s ON s.id = l.subcategoria_id
                WHERE l.cartao_id = %s AND l.user_id = %s AND l.ativo = TRUE
                  AND l.tipo IN ('despesa_cartao', 'pagamento_fatura')
                  AND l.fatura_mes = %s AND l.fatura_ano = %s
                ORDER BY l.criado_em DESC
            """, (cartao_id, user_id, fatura_mes, fatura_ano))
            return cur.fetchall()


def get_by_id(lancamento_id: int, user_id: int):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT l.*, c.nome AS categoria_nome, s.nome AS subcategoria_nome
                FROM lancamentos l
                LEFT JOIN categorias c ON c.id = l.categoria_id
                LEFT JOIN subcategorias s ON s.id = l.subcategoria_id
                WHERE l.id = %s AND l.user_id = %s AND l.ativo = TRUE
            """, (lancamento_id, user_id))
            return cur.fetchone()


def update_lancamento(lancamento_id: int, user_id: int, descricao, valor,
                      data_vencimento, efetivado, categoria_id, subcategoria_id):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                UPDATE lancamentos
                SET descricao = %s, valor = %s, data_vencimento = %s,
                    efetivado = %s, categoria_id = %s, subcategoria_id = %s
                WHERE id = %s AND user_id = %s AND ativo = TRUE
                RETURNING *
            """, (descricao, valor, data_vencimento, efetivado,
                  categoria_id, subcategoria_id, lancamento_id, user_id))
            row = cur.fetchone()
            conn.commit()
            return row


def delete_lancamento(lancamento_id: int, user_id: int):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE lancamentos SET ativo = FALSE
                WHERE id = %s AND user_id = %s
            """, (lancamento_id, user_id))
        conn.commit()


def delete_by_grupo_futuros(grupo_id: str, user_id: int, data_ref) -> None:
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE lancamentos SET ativo = FALSE
                WHERE grupo_recorrencia_id = %s AND user_id = %s
                  AND (data_vencimento >= %s OR data_vencimento IS NULL)
            """, (grupo_id, user_id, data_ref))
        conn.commit()


def delete_by_grupo_todos(grupo_id: str, user_id: int) -> None:
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE lancamentos SET ativo = FALSE
                WHERE grupo_recorrencia_id = %s AND user_id = %s
            """, (grupo_id, user_id))
        conn.commit()


def update_by_grupo_futuros(grupo_id: str, user_id: int, data_ref,
                             descricao, valor, efetivado, categoria_id, subcategoria_id) -> None:
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE lancamentos
                SET descricao = %s, valor = %s, efetivado = %s,
                    categoria_id = %s, subcategoria_id = %s
                WHERE grupo_recorrencia_id = %s AND user_id = %s AND ativo = TRUE
                  AND (data_vencimento >= %s OR data_vencimento IS NULL)
            """, (descricao, valor, efetivado, categoria_id, subcategoria_id,
                  grupo_id, user_id, data_ref))
        conn.commit()


def update_by_grupo_todos(grupo_id: str, user_id: int,
                           descricao, valor, efetivado, categoria_id, subcategoria_id) -> None:
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE lancamentos
                SET descricao = %s, valor = %s, efetivado = %s,
                    categoria_id = %s, subcategoria_id = %s
                WHERE grupo_recorrencia_id = %s AND user_id = %s AND ativo = TRUE
            """, (descricao, valor, efetivado, categoria_id, subcategoria_id,
                  grupo_id, user_id))
        conn.commit()


def get_future_events(user_id: int, dias: int = 90) -> list:
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT
                    l.data_vencimento::date AS data,
                    l.descricao,
                    l.valor,
                    l.tipo,
                    cb.nome AS conta_nome
                FROM lancamentos l
                JOIN contas_bancarias cb ON cb.id = l.conta_id
                WHERE cb.user_id = %s
                  AND l.ativo = TRUE
                  AND l.tipo IN ('receita', 'despesa')
                  AND l.efetivado = FALSE
                  AND l.data_vencimento >= CURRENT_DATE
                  AND l.data_vencimento <= CURRENT_DATE + (%s * INTERVAL '1 day')
                ORDER BY l.data_vencimento ASC, l.criado_em ASC
            """, (user_id, dias))
            return cur.fetchall()


def get_pending_pagamento_faturas(user_id: int, dias: int) -> list:
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT
                    l.data_vencimento::date      AS data,
                    l.descricao,
                    l.valor,
                    'despesa'                    AS tipo,
                    COALESCE(cb.nome, '')        AS conta_nome
                FROM lancamentos l
                LEFT JOIN contas_bancarias cb ON cb.id = l.conta_id
                WHERE l.user_id = %s
                  AND l.ativo = TRUE
                  AND l.tipo = 'pagamento_fatura'
                  AND l.efetivado = FALSE
                  AND l.data_vencimento >= CURRENT_DATE
                  AND l.data_vencimento <= CURRENT_DATE + (%s * INTERVAL '1 day')
                ORDER BY l.data_vencimento ASC
            """, (user_id, dias))
            return cur.fetchall()


def get_debitos_vencidos(user_id: int) -> list:
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT
                    l.id,
                    l.data_vencimento::date AS data_vencimento,
                    l.descricao,
                    l.valor,
                    l.tipo,
                    COALESCE(cb.nome, '') AS conta_nome,
                    (CURRENT_DATE - l.data_vencimento::date) AS dias_atraso
                FROM lancamentos l
                LEFT JOIN contas_bancarias cb ON cb.id = l.conta_id
                WHERE l.user_id = %s
                  AND l.ativo = TRUE
                  AND l.tipo IN ('despesa', 'pagamento_fatura')
                  AND l.efetivado = FALSE
                  AND l.data_vencimento < CURRENT_DATE
                ORDER BY l.data_vencimento ASC
            """, (user_id,))
            return cur.fetchall()


def get_resumo_mes(user_id: int, mes: int, ano: int) -> dict:
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT
                    COALESCE((
                        SELECT SUM(valor) FROM lancamentos
                        WHERE user_id = %s AND tipo = 'receita' AND efetivado = true AND ativo = true
                          AND EXTRACT(MONTH FROM data_vencimento) = %s
                          AND EXTRACT(YEAR FROM data_vencimento) = %s
                    ), 0) AS receitas,
                    COALESCE((
                        SELECT SUM(valor) FROM lancamentos
                        WHERE user_id = %s AND tipo = 'despesa' AND efetivado = true AND ativo = true
                          AND EXTRACT(MONTH FROM data_vencimento) = %s
                          AND EXTRACT(YEAR FROM data_vencimento) = %s
                    ), 0) AS despesas_conta,
                    COALESCE((
                        SELECT SUM(valor) FROM lancamentos
                        WHERE user_id = %s AND tipo = 'despesa_cartao' AND ativo = true
                          AND fatura_mes = %s AND fatura_ano = %s
                    ), 0) AS despesas_cartao
            """, (user_id, mes, ano, user_id, mes, ano, user_id, mes, ano))
            return cur.fetchone()


def get_despesas_por_conta(user_id: int, mes: int, ano: int) -> list:
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT c.id AS conta_id, c.nome, c.instituicao,
                       COALESCE(SUM(l.valor), 0) AS total_despesas
                FROM contas_bancarias c
                LEFT JOIN lancamentos l ON l.conta_id = c.id
                  AND l.user_id = %s AND l.tipo = 'despesa' AND l.ativo = TRUE
                  AND EXTRACT(MONTH FROM l.data_vencimento) = %s
                  AND EXTRACT(YEAR  FROM l.data_vencimento) = %s
                WHERE c.user_id = %s AND c.ativo = TRUE
                GROUP BY c.id, c.nome, c.instituicao
                HAVING COALESCE(SUM(l.valor), 0) > 0
                ORDER BY total_despesas DESC
            """, (user_id, mes, ano, user_id))
            return cur.fetchall()


def get_despesas_por_categoria(user_id: int, mes: int, ano: int) -> list:
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT
                    COALESCE(cat.id, 0)          AS categoria_id,
                    COALESCE(cat.nome, 'Sem categoria') AS categoria_nome,
                    COALESCE(cat.icone, 'bi-tag') AS categoria_icone,
                    SUM(l.valor)                  AS total
                FROM lancamentos l
                LEFT JOIN categorias cat ON l.categoria_id = cat.id
                WHERE l.user_id = %s
                  AND l.tipo IN ('despesa', 'despesa_cartao')
                  AND l.ativo = TRUE
                  AND EXTRACT(MONTH FROM l.data_vencimento) = %s
                  AND EXTRACT(YEAR  FROM l.data_vencimento) = %s
                GROUP BY cat.id, cat.nome, cat.icone
                ORDER BY total DESC
            """, (user_id, mes, ano))
            return cur.fetchall()


def get_sugestoes_descricao(user_id: int, tipo: str, query: str, limit: int = 6) -> list:
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT DISTINCT ON (LOWER(TRIM(l.descricao)))
                    l.descricao, l.valor, l.categoria_id, l.subcategoria_id,
                    l.conta_id, l.cartao_id,
                    c.nome AS categoria_nome
                FROM lancamentos l
                LEFT JOIN categorias c ON c.id = l.categoria_id
                WHERE l.user_id = %s AND l.tipo = %s AND l.ativo = true
                  AND l.descricao IS NOT NULL
                  AND LOWER(l.descricao) LIKE LOWER('%%' || %s || '%%')
                ORDER BY LOWER(TRIM(l.descricao)), l.criado_em DESC
                LIMIT %s
            """, (user_id, tipo, query, limit))
            return cur.fetchall()
