from app.extensions import get_db
from psycopg.rows import dict_row


def _table_exists(conn) -> bool:
    with conn.cursor() as cur:
        cur.execute("""
            SELECT COUNT(*) AS cnt FROM information_schema.tables
            WHERE table_name = 'diretrizes_dez_pct'
        """)
        return cur.fetchone()["cnt"] == 1


def get_pending_receitas(user_id: int) -> list:
    with get_db() as conn:
        if not _table_exists(conn):
            return []
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT
                    l.id,
                    l.descricao,
                    l.valor,
                    l.data_vencimento,
                    l.conta_id,
                    c.nome AS conta_nome
                FROM lancamentos l
                LEFT JOIN contas_bancarias c ON c.id = l.conta_id
                LEFT JOIN diretrizes_dez_pct d
                    ON d.lancamento_id = l.id AND d.user_id = l.user_id
                WHERE l.user_id = %s
                  AND l.tipo = 'receita'
                  AND l.efetivado = TRUE
                  AND l.ativo = TRUE
                  AND d.id IS NULL
                  AND l.data_vencimento >= CURRENT_DATE - INTERVAL '90 days'
                ORDER BY l.data_vencimento DESC
                LIMIT 20
            """, (user_id,))
            return cur.fetchall()


def registrar_acao(user_id: int, lancamento_id: int, acao: str,
                   conta_destino_id, valor_dez_pct: float):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                INSERT INTO diretrizes_dez_pct
                    (user_id, lancamento_id, acao, conta_destino_id, valor_dez_pct)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (user_id, lancamento_id) DO UPDATE
                    SET acao = EXCLUDED.acao,
                        conta_destino_id = EXCLUDED.conta_destino_id,
                        valor_dez_pct = EXCLUDED.valor_dez_pct,
                        criado_em = NOW()
                RETURNING *
            """, (user_id, lancamento_id, acao, conta_destino_id or None, valor_dez_pct))
            row = cur.fetchone()
            conn.commit()
            return row
