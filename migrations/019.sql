-- Dedup table para notificacoes push de lancamentos (vencendo em breve / vencidos)
-- Run: psql $DATABASE_URL -f migrations/019.sql

CREATE TABLE IF NOT EXISTS lancamentos_push_sent (
    id            SERIAL PRIMARY KEY,
    user_id       INTEGER NOT NULL,
    lancamento_id INTEGER NOT NULL,
    tipo          VARCHAR(50) NOT NULL,
    sent_at       TIMESTAMP DEFAULT NOW(),
    UNIQUE (user_id, lancamento_id, tipo)
);

CREATE INDEX IF NOT EXISTS idx_lancamentos_push_sent_lookup
    ON lancamentos_push_sent (user_id, lancamento_id, tipo);
