from app.extensions import get_db
from psycopg.rows import dict_row


def ensure_tables():
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS backup_config (
                    id SERIAL PRIMARY KEY,
                    db_url TEXT NOT NULL DEFAULT '',
                    frequencia VARCHAR(20) NOT NULL DEFAULT 'daily',
                    hora INTEGER NOT NULL DEFAULT 2,
                    minuto INTEGER NOT NULL DEFAULT 0,
                    retencao_dias INTEGER NOT NULL DEFAULT 30,
                    ativo BOOLEAN NOT NULL DEFAULT FALSE,
                    atualizado_em TIMESTAMP DEFAULT NOW()
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS backup_logs (
                    id SERIAL PRIMARY KEY,
                    iniciado_em TIMESTAMP DEFAULT NOW(),
                    finalizado_em TIMESTAMP,
                    status VARCHAR(20) NOT NULL DEFAULT 'running',
                    arquivo TEXT,
                    frequencia VARCHAR(20),
                    tamanho_bytes BIGINT,
                    duracao_segundos NUMERIC(10,2),
                    checksum TEXT,
                    mensagem_erro TEXT
                )
            """)
            cur.execute("SELECT COUNT(*) AS n FROM backup_config")
            row = cur.fetchone()
            if row["n"] == 0:
                cur.execute("""
                    INSERT INTO backup_config (db_url, frequencia, hora, minuto, retencao_dias, ativo)
                    VALUES ('', 'daily', 2, 0, 30, FALSE)
                """)
        conn.commit()


def get_config() -> dict | None:
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("SELECT * FROM backup_config LIMIT 1")
            return cur.fetchone()


def save_config(db_url: str, frequencia: str, hora: int, minuto: int, retencao_dias: int, ativo: bool):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE backup_config
                SET db_url = %s, frequencia = %s, hora = %s, minuto = %s,
                    retencao_dias = %s, ativo = %s, atualizado_em = NOW()
            """, (db_url, frequencia, hora, minuto, retencao_dias, ativo))
        conn.commit()


def create_log(frequencia: str) -> int:
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                INSERT INTO backup_logs (frequencia, status, iniciado_em)
                VALUES (%s, 'running', NOW())
                RETURNING id
            """, (frequencia,))
            row = cur.fetchone()
            conn.commit()
            return row["id"]


def update_log(log_id: int, status: str, arquivo: str | None, tamanho_bytes: int | None,
               duracao: float | None, checksum: str | None, erro: str | None):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE backup_logs
                SET status = %s, arquivo = %s, tamanho_bytes = %s,
                    duracao_segundos = %s, checksum = %s, mensagem_erro = %s,
                    finalizado_em = NOW()
                WHERE id = %s
            """, (status, arquivo, tamanho_bytes, duracao, checksum, erro, log_id))
        conn.commit()


def get_running_backup() -> dict | None:
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT * FROM backup_logs
                WHERE status = 'running'
                  AND iniciado_em > NOW() - INTERVAL '10 minutes'
                LIMIT 1
            """)
            return cur.fetchone()


def list_logs(limit: int = 50) -> list:
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT * FROM backup_logs
                ORDER BY iniciado_em DESC
                LIMIT %s
            """, (limit,))
            return cur.fetchall()


def get_log(log_id: int) -> dict | None:
    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("SELECT * FROM backup_logs WHERE id = %s", (log_id,))
            return cur.fetchone()


def cleanup_old_logs(retencao_dias: int):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                DELETE FROM backup_logs
                WHERE iniciado_em < NOW() - (%s * INTERVAL '1 day')
                  AND status IN ('success', 'failed')
            """, (retencao_dias * 2,))
        conn.commit()
