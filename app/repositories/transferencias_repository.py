from app.extensions import get_db
from psycopg.rows import dict_row


def create_transferencia(user_id, descricao, valor, data_vencimento, efetivado,
                         recorrente, recorrencia_tipo, conta_origem_id, conta_destino_id):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                INSERT INTO transferencias (user_id, descricao, valor, data_vencimento,
                    efetivado, recorrente, recorrencia_tipo, conta_origem_id, conta_destino_id)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
                RETURNING *
            """, (user_id, descricao, valor, data_vencimento, efetivado,
                  recorrente, recorrencia_tipo, conta_origem_id, conta_destino_id))
            row = cur.fetchone()
            conn.commit()
            return row


def delete_transferencia(transferencia_id: int, user_id: int):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE transferencias SET ativo = FALSE
                WHERE id = %s AND user_id = %s
            """, (transferencia_id, user_id))
        conn.commit()


def get_transferencias_by_user(user_id):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT t.*,
                    co.nome AS conta_origem_nome,
                    cd.nome AS conta_destino_nome
                FROM transferencias t
                LEFT JOIN contas_bancarias co ON co.id = t.conta_origem_id
                LEFT JOIN contas_bancarias cd ON cd.id = t.conta_destino_id
                WHERE t.user_id = %s AND t.ativo = TRUE
                ORDER BY t.criado_em DESC
            """, (user_id,))
            return cur.fetchall()
