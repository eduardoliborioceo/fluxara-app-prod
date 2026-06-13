from app.extensions import get_db
from psycopg.rows import dict_row


def get_assinatura_ativa(user_id: int, plano: str = 'apostas'):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT * FROM assinaturas
                WHERE user_id = %s AND plano = %s AND status = 'ativa'
                  AND (expira_em IS NULL OR expira_em > NOW())
                ORDER BY criado_em DESC
                LIMIT 1
            """, (user_id, plano))
            return cur.fetchone()


def get_historico_user(user_id: int):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT * FROM assinaturas
                WHERE user_id = %s
                ORDER BY criado_em DESC
            """, (user_id,))
            return cur.fetchall()


def get_assinatura_pendente(user_id: int, plano: str = 'apostas'):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT * FROM assinaturas
                WHERE user_id = %s AND plano = %s AND status = 'pendente'
                ORDER BY criado_em DESC
                LIMIT 1
            """, (user_id, plano))
            return cur.fetchone()


def criar_assinatura(user_id: int, plano: str, metodo_pagamento: str,
                     valor_usd: float, valor_brl: float):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                INSERT INTO assinaturas
                    (user_id, plano, status, metodo_pagamento, valor_usd, valor_brl)
                VALUES (%s, %s, 'pendente', %s, %s, %s)
                RETURNING *
            """, (user_id, plano, metodo_pagamento, valor_usd, valor_brl))
            row = cur.fetchone()
            conn.commit()
            return row


def ativar_assinatura(assinatura_id: int, referencia: str, meses: int = 1):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                UPDATE assinaturas
                SET status = 'ativa',
                    inicio_em = NOW(),
                    expira_em = NOW() + INTERVAL '1 month' * %s,
                    referencia_pagamento = %s
                WHERE id = %s
                RETURNING *
            """, (meses, referencia, assinatura_id))
            row = cur.fetchone()
            conn.commit()
            return row


def cancelar_assinatura(assinatura_id: int, user_id: int):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                UPDATE assinaturas
                SET status = 'cancelada', cancelada_em = NOW()
                WHERE id = %s AND user_id = %s
                RETURNING *
            """, (assinatura_id, user_id))
            row = cur.fetchone()
            conn.commit()
            return row


def list_all_admin():
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT a.*, u.username, u.email, u.full_name
                FROM assinaturas a
                JOIN users u ON u.id = a.user_id
                ORDER BY a.criado_em DESC
            """)
            return cur.fetchall()


def count_stats():
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT
                    COUNT(*) FILTER (WHERE status = 'ativa' AND (expira_em IS NULL OR expira_em > NOW())) AS ativas,
                    COUNT(*) FILTER (WHERE status = 'pendente') AS pendentes,
                    COUNT(*) FILTER (WHERE status = 'cancelada') AS canceladas,
                    COALESCE(SUM(valor_brl) FILTER (WHERE status = 'ativa'), 0) AS receita_brl
                FROM assinaturas
            """)
            return cur.fetchone()
