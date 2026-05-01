from app.extensions import get_db
from psycopg.rows import dict_row


def list_cartoes(user_id: int, mes: int = 0, ano: int = 0) -> list:
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT cc.*, cb.nome AS conta_nome,
                    COALESCE((
                        SELECT SUM(CASE WHEN l.tipo = 'pagamento_fatura' THEN -l.valor ELSE l.valor END)
                        FROM lancamentos l
                        WHERE l.cartao_id = cc.id AND l.tipo IN ('despesa_cartao', 'pagamento_fatura') AND l.ativo = true
                          AND l.fatura_mes = CASE WHEN %s > 0 THEN %s ELSE EXTRACT(MONTH FROM CURRENT_DATE) END
                          AND l.fatura_ano = CASE WHEN %s > 0 THEN %s ELSE EXTRACT(YEAR FROM CURRENT_DATE) END
                    ), 0) AS fatura_atual,
                    cc.limite - COALESCE((
                        SELECT SUM(CASE WHEN l.tipo = 'pagamento_fatura' THEN -l.valor ELSE l.valor END)
                        FROM lancamentos l
                        WHERE l.cartao_id = cc.id AND l.tipo IN ('despesa_cartao', 'pagamento_fatura') AND l.ativo = true
                    ), 0) AS limite_disponivel
                FROM cartoes_credito cc
                LEFT JOIN contas_bancarias cb ON cb.id = cc.conta_id
                WHERE cc.user_id = %s AND cc.ativo = TRUE
                ORDER BY cc.criado_em
            """, (mes, mes, ano, ano, user_id))
            return cur.fetchall()


def create_cartao(user_id: int, nome: str, limite: float, bandeira: str, conta_id: int | None, dia_fechamento: int, dia_vencimento: int):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                INSERT INTO cartoes_credito (user_id, nome, limite, bandeira, conta_id, dia_fechamento, dia_vencimento)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (user_id, nome, limite, bandeira, conta_id, dia_fechamento, dia_vencimento))
            row = cur.fetchone()
            conn.commit()
            return row


def update_cartao(cartao_id: int, user_id: int, nome: str, limite: float, bandeira: str, conta_id: int | None, dia_fechamento: int, dia_vencimento: int):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE cartoes_credito
                SET nome = %s, limite = %s, bandeira = %s, conta_id = %s,
                    dia_fechamento = %s, dia_vencimento = %s
                WHERE id = %s AND user_id = %s AND ativo = TRUE
            """, (nome, limite, bandeira, conta_id, dia_fechamento, dia_vencimento, cartao_id, user_id))
        conn.commit()


def get_cartoes_usage_for_user(user_id: int) -> list:
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT cc.id, cc.user_id, cc.nome, cc.limite,
                       cc.dia_fechamento, cc.dia_vencimento,
                       COALESCE((
                           SELECT SUM(CASE WHEN l.tipo = 'pagamento_fatura' THEN -l.valor ELSE l.valor END)
                           FROM lancamentos l
                           WHERE l.cartao_id = cc.id AND l.tipo IN ('despesa_cartao', 'pagamento_fatura') AND l.ativo = true
                             AND l.fatura_mes = EXTRACT(MONTH FROM CURRENT_DATE)
                             AND l.fatura_ano  = EXTRACT(YEAR  FROM CURRENT_DATE)
                       ), 0) AS fatura_atual
                FROM cartoes_credito cc
                WHERE cc.user_id = %s AND cc.ativo = TRUE
            """, (user_id,))
            return cur.fetchall()


def get_fatura_total(cartao_id: int, user_id: int, mes: int, ano: int) -> float:
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT COALESCE(SUM(l.valor), 0) AS total
                FROM lancamentos l
                WHERE l.cartao_id = %s AND l.user_id = %s
                  AND l.tipo = 'despesa_cartao' AND l.ativo = TRUE
                  AND l.fatura_mes = %s AND l.fatura_ano = %s
            """, (cartao_id, user_id, mes, ano))
            row = cur.fetchone()
            return float(row["total"]) if row else 0.0


def get_cartao(cartao_id: int, user_id: int):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT * FROM cartoes_credito
                WHERE id = %s AND user_id = %s AND ativo = TRUE
            """, (cartao_id, user_id))
            return cur.fetchone()


def get_open_invoices_for_conta(conta_id: int, user_id: int, mes: int, ano: int) -> list:
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT sub.id, sub.nome, sub.bandeira, sub.dia_vencimento, sub.fatura_total
                FROM (
                    SELECT cc.id, cc.nome, cc.bandeira, cc.dia_vencimento,
                        COALESCE((
                            SELECT SUM(CASE WHEN l.tipo = 'pagamento_fatura' THEN -l.valor ELSE l.valor END)
                            FROM lancamentos l
                            WHERE l.cartao_id = cc.id AND l.tipo IN ('despesa_cartao', 'pagamento_fatura')
                              AND l.ativo = true
                              AND l.fatura_mes = %s AND l.fatura_ano = %s
                        ), 0) AS fatura_total
                    FROM cartoes_credito cc
                    WHERE cc.conta_id = %s AND cc.user_id = %s AND cc.ativo = TRUE
                ) sub
                WHERE sub.fatura_total > 0
            """, (mes, ano, conta_id, user_id))
            return cur.fetchall()


def delete_cartao(cartao_id: int, user_id: int):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE cartoes_credito SET ativo = FALSE
                WHERE id = %s AND user_id = %s
            """, (cartao_id, user_id))
        conn.commit()
