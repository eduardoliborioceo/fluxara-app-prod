from app.extensions import get_db
from psycopg.rows import dict_row


def save_subscription(user_id: int, endpoint: str, p256dh: str, auth: str):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (endpoint) DO UPDATE SET
                    user_id = EXCLUDED.user_id,
                    p256dh  = EXCLUDED.p256dh,
                    auth    = EXCLUDED.auth
            """, (user_id, endpoint, p256dh, auth))
        conn.commit()


def delete_subscription(endpoint: str):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM push_subscriptions WHERE endpoint = %s",
                (endpoint,)
            )
        conn.commit()


def get_subscriptions_by_user(user_id: int):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT endpoint, p256dh, auth
                FROM push_subscriptions
                WHERE user_id = %s
            """, (user_id,))
            return cur.fetchall()


def get_all_subscriptions():
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("SELECT endpoint, p256dh, auth FROM push_subscriptions")
            return cur.fetchall()


def is_push_sent(user_id: int, cartao_id: int, tipo: str, referencia: str) -> bool:
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 1 FROM cartao_push_sent
                WHERE user_id=%s AND cartao_id=%s AND tipo=%s AND referencia=%s
            """, (user_id, cartao_id, tipo, referencia))
            return cur.fetchone() is not None


def mark_push_sent(user_id: int, cartao_id: int, tipo: str, referencia: str):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO cartao_push_sent (user_id, cartao_id, tipo, referencia)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT DO NOTHING
            """, (user_id, cartao_id, tipo, referencia))
        conn.commit()


def get_distinct_subscribed_users() -> list:
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("SELECT DISTINCT user_id FROM push_subscriptions")
            return [r["user_id"] for r in cur.fetchall()]
