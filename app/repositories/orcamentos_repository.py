from app.extensions import get_db
from psycopg.rows import dict_row


def list_orcamentos_com_gasto(user_id: int, mes: int, ano: int) -> list:
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT
                    c.id AS categoria_id,
                    c.nome AS categoria_nome,
                    c.icone AS categoria_icone,
                    c.cor_fundo AS categoria_cor,
                    c.tipo,
                    o.id AS orcamento_id,
                    COALESCE(o.valor, 0) AS orcamento_valor,
                    COALESCE((
                        SELECT SUM(l.valor) FROM lancamentos l
                        WHERE l.categoria_id = c.id AND l.user_id = %s AND l.ativo = true
                          AND (
                            (c.tipo = 'receita' AND l.tipo = 'receita'
                             AND EXTRACT(MONTH FROM l.data_vencimento) = %s
                             AND EXTRACT(YEAR  FROM l.data_vencimento) = %s)
                            OR
                            (c.tipo = 'despesa' AND l.tipo = 'despesa'
                             AND EXTRACT(MONTH FROM l.data_vencimento) = %s
                             AND EXTRACT(YEAR  FROM l.data_vencimento) = %s)
                            OR
                            (c.tipo = 'despesa' AND l.tipo = 'despesa_cartao'
                             AND l.fatura_mes = %s AND l.fatura_ano = %s)
                          )
                    ), 0) AS gasto_real
                FROM categorias c
                LEFT JOIN orcamentos o
                    ON o.categoria_id = c.id AND o.user_id = %s AND o.mes = %s AND o.ano = %s
                WHERE c.user_id = %s AND c.tipo IN ('despesa', 'receita')
                ORDER BY c.tipo DESC, c.nome
            """, (user_id, mes, ano, mes, ano, mes, ano,
                  user_id, mes, ano, user_id))
            return cur.fetchall()


def upsert_orcamento(user_id: int, categoria_id: int, mes: int, ano: int, valor: float):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                INSERT INTO orcamentos (user_id, categoria_id, mes, ano, valor)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (user_id, categoria_id, mes, ano)
                DO UPDATE SET valor = EXCLUDED.valor
                RETURNING *
            """, (user_id, categoria_id, mes, ano, valor))
            row = cur.fetchone()
            conn.commit()
            return row


def delete_orcamento(orcamento_id: int, user_id: int):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                DELETE FROM orcamentos WHERE id = %s AND user_id = %s
            """, (orcamento_id, user_id))
        conn.commit()


def copy_from_previous_month(user_id: int, mes: int, ano: int) -> int:
    prev_mes = mes - 1 if mes > 1 else 12
    prev_ano = ano if mes > 1 else ano - 1
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO orcamentos (user_id, categoria_id, mes, ano, valor)
                SELECT user_id, categoria_id, %s, %s, valor
                FROM orcamentos
                WHERE user_id = %s AND mes = %s AND ano = %s
                ON CONFLICT (user_id, categoria_id, mes, ano) DO NOTHING
            """, (mes, ano, user_id, prev_mes, prev_ano))
            count = cur.rowcount
        conn.commit()
    return count
