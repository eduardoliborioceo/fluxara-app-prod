from app.extensions import get_db
from psycopg.rows import dict_row


def create_ticket(user_id: int, tipo: str, mensagem: str) -> dict:
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                INSERT INTO ouvidoria_tickets (user_id, tipo, mensagem)
                VALUES (%s, %s, %s)
                RETURNING *
            """, (user_id, tipo, mensagem))
            row = cur.fetchone()
        conn.commit()
    return dict(row)


def get_tickets_by_user(user_id: int) -> list:
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT * FROM ouvidoria_tickets
                WHERE user_id = %s
                ORDER BY criado_em DESC
                LIMIT 100
            """, (user_id,))
            return [dict(r) for r in cur.fetchall()]


def get_ticket_by_id(ticket_id: int) -> dict | None:
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                "SELECT * FROM ouvidoria_tickets WHERE id = %s",
                (ticket_id,)
            )
            row = cur.fetchone()
            return dict(row) if row else None


def respond_ticket(ticket_id: int, resposta: str) -> None:
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE ouvidoria_tickets
                SET resposta = %s, respondido_em = NOW(), status = 'resolvido'
                WHERE id = %s
            """, (resposta, ticket_id))
        conn.commit()


def get_chat_messages(user_id: int, after_id: int = 0) -> list:
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT * FROM chat_suporte
                WHERE user_id = %s AND id > %s
                ORDER BY criado_em ASC
            """, (user_id, after_id))
            return [dict(r) for r in cur.fetchall()]


def create_chat_message(user_id: int, remetente: str, mensagem: str) -> dict:
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                INSERT INTO chat_suporte (user_id, remetente, mensagem)
                VALUES (%s, %s, %s)
                RETURNING *
            """, (user_id, remetente, mensagem))
            row = cur.fetchone()
        conn.commit()
    return dict(row)


def get_all_conversations() -> list:
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT DISTINCT ON (cs.user_id)
                    cs.user_id, u.username, cs.mensagem AS ultima_mensagem,
                    cs.criado_em AS ultima_msg_em, cs.remetente,
                    (SELECT COUNT(*) FROM chat_suporte
                     WHERE user_id = cs.user_id AND remetente = 'user' AND lido = FALSE) AS nao_lidas
                FROM chat_suporte cs
                JOIN users u ON u.id = cs.user_id
                ORDER BY cs.user_id, cs.criado_em DESC
            """)
            return [dict(r) for r in cur.fetchall()]


def get_chat_by_user_id(user_id: int) -> list:
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT * FROM chat_suporte
                WHERE user_id = %s
                ORDER BY criado_em ASC
                LIMIT 500
            """, (user_id,))
            return [dict(r) for r in cur.fetchall()]


def get_all_tickets() -> list:
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT ot.*, u.username
                FROM ouvidoria_tickets ot
                JOIN users u ON u.id = ot.user_id
                ORDER BY ot.criado_em DESC
                LIMIT 500
            """)
            return [dict(r) for r in cur.fetchall()]


def update_ticket_status(ticket_id: int, status: str) -> None:
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE ouvidoria_tickets SET status = %s WHERE id = %s
            """, (status, ticket_id))
        conn.commit()


def get_admin_user_ids() -> list:
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT id FROM users
                WHERE (is_admin = TRUE OR is_owner = TRUE) AND is_active = TRUE
            """)
            return [row["id"] for row in cur.fetchall()]
