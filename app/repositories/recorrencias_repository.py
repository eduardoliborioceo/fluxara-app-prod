import datetime
from app.extensions import get_db
from psycopg.rows import dict_row


def list_recorrencias(user_id: int) -> list:
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT r.*,
                    cb.nome AS conta_nome, cb.instituicao AS conta_instituicao,
                    cc.nome AS cartao_nome, cc.bandeira AS cartao_bandeira,
                    cat.nome AS categoria_nome
                FROM recorrencias r
                LEFT JOIN contas_bancarias cb ON cb.id = r.conta_id
                LEFT JOIN cartoes_credito cc ON cc.id = r.cartao_id
                LEFT JOIN categorias cat ON cat.id = r.categoria_id
                WHERE r.user_id = %s
                ORDER BY r.ativo DESC, r.dia_vencimento, r.nome
            """, (user_id,))
            return cur.fetchall()


def list_ativas(user_id: int) -> list:
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT r.*, cc.dia_fechamento
                FROM recorrencias r
                LEFT JOIN cartoes_credito cc ON cc.id = r.cartao_id
                WHERE r.user_id = %s AND r.ativo = TRUE
                ORDER BY r.dia_vencimento
            """, (user_id,))
            return cur.fetchall()


def get_recorrencia(recorrencia_id: int, user_id: int):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT * FROM recorrencias WHERE id = %s AND user_id = %s
            """, (recorrencia_id, user_id))
            return cur.fetchone()


def create_recorrencia(user_id: int, nome: str, tipo: str, valor: float,
                       categoria_id, conta_id, cartao_id, dia_vencimento: int):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                INSERT INTO recorrencias
                    (user_id, nome, tipo, valor, categoria_id, conta_id, cartao_id, dia_vencimento)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (user_id, nome, tipo, valor, categoria_id, conta_id, cartao_id, dia_vencimento))
            row = cur.fetchone()
            conn.commit()
            return row


def update_recorrencia(recorrencia_id: int, user_id: int, nome: str, valor: float,
                       categoria_id, conta_id, cartao_id, dia_vencimento: int):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE recorrencias
                SET nome = %s, valor = %s, categoria_id = %s, conta_id = %s,
                    cartao_id = %s, dia_vencimento = %s
                WHERE id = %s AND user_id = %s
            """, (nome, valor, categoria_id, conta_id, cartao_id, dia_vencimento,
                  recorrencia_id, user_id))
        conn.commit()


def toggle_ativo(recorrencia_id: int, user_id: int) -> bool:
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                UPDATE recorrencias SET ativo = NOT ativo
                WHERE id = %s AND user_id = %s
                RETURNING ativo
            """, (recorrencia_id, user_id))
            row = cur.fetchone()
            conn.commit()
            return row['ativo'] if row else False


def delete_recorrencia(recorrencia_id: int, user_id: int):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                DELETE FROM recorrencias WHERE id = %s AND user_id = %s
            """, (recorrencia_id, user_id))
        conn.commit()


def mark_lancado(recorrencia_id: int, user_id: int, data: datetime.date):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE recorrencias SET ultimo_lancamento = %s
                WHERE id = %s AND user_id = %s
            """, (data, recorrencia_id, user_id))
        conn.commit()
