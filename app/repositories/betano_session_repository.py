from app.extensions import get_db
from psycopg.rows import dict_row


def get_session():
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT id, cookies_json, status, error_message, updated_at, expires_at
                FROM betano_session
                ORDER BY updated_at DESC
                LIMIT 1
            """)
            return cur.fetchone()


def upsert_session(cookies_json: str, status: str, error_message: str | None = None):
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                DELETE FROM betano_session
            """)
            cur.execute("""
                INSERT INTO betano_session (cookies_json, status, error_message, expires_at)
                VALUES (%s, %s, %s, NOW() + INTERVAL '6 hours')
                RETURNING *
            """, (cookies_json, status, error_message))
            row = cur.fetchone()
            conn.commit()
            return row


def mark_failed(error_message: str):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE betano_session
                SET status = 'failed', error_message = %s, updated_at = NOW()
            """, (error_message,))
            conn.commit()
